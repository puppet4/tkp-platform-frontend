import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, MailPlus, RefreshCw, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { tenantApi, type TenantData, type TenantMemberData } from "@/lib/api";

const ROLE_OPTIONS = ["owner", "admin", "member", "viewer"];
const TENANT_STATUS_OPTIONS = ["active", "suspended"];

const TenantAdmin = () => {
  const qc = useQueryClient();
  const { currentTenant, switchTenant } = useAuth();
  const { canAction } = useRoleAccess();

  const canTenantRead = canAction("api.tenant.read");
  const canTenantUpdate = canAction("api.tenant.update");
  const canMemberManage = canAction("api.tenant.member.manage");

  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantStatus, setTenantStatus] = useState("active");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [directEmail, setDirectEmail] = useState("");
  const [directRole, setDirectRole] = useState("member");

  useEffect(() => {
    if (currentTenant?.id && !selectedTenantId) {
      setSelectedTenantId(currentTenant.id);
    }
  }, [currentTenant?.id, selectedTenantId]);

  const { data: myTenants = [], isLoading: tenantsLoading, refetch: refetchTenants } = useQuery({
    queryKey: ["tenant-admin-list"],
    queryFn: () => tenantApi.list(),
    enabled: canTenantRead,
  });

  const { data: myInvitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ["tenant-admin-invitations"],
    queryFn: () => tenantApi.listInvitations(),
    enabled: canTenantRead,
  });

  const { data: tenantDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["tenant-admin-detail", selectedTenantId],
    queryFn: () => tenantApi.get(selectedTenantId),
    enabled: canTenantRead && !!selectedTenantId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["tenant-admin-members", selectedTenantId],
    queryFn: () => tenantApi.listMembers(selectedTenantId),
    enabled: canMemberManage && !!selectedTenantId,
  });

  useEffect(() => {
    if (!tenantDetail) return;
    setTenantName(tenantDetail.name);
    setTenantSlug(tenantDetail.slug);
    setTenantStatus(tenantDetail.status);
  }, [tenantDetail]);

  const switchTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await switchTenant(tenantId);
      return tenantId;
    },
    onSuccess: async (tenantId) => {
      setSelectedTenantId(tenantId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tenant-admin-detail"] }),
        qc.invalidateQueries({ queryKey: ["tenant-admin-members"] }),
        qc.invalidateQueries({ queryKey: ["tenant-admin-list"] }),
      ]);
      toast.success("已切换到目标租户");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTenantMutation = useMutation({
    mutationFn: () =>
      tenantApi.update(selectedTenantId, {
        name: tenantName.trim(),
        slug: tenantSlug.trim(),
        status: tenantStatus,
      }),
    onSuccess: async (updated) => {
      setTenantName(updated.name);
      setTenantSlug(updated.slug);
      setTenantStatus(updated.status);
      await qc.invalidateQueries({ queryKey: ["tenant-admin-detail", selectedTenantId] });
      await qc.invalidateQueries({ queryKey: ["tenant-admin-list"] });
      toast.success("租户信息已更新");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: () => tenantApi.inviteMember(selectedTenantId, inviteEmail.trim(), inviteRole),
    onSuccess: async () => {
      setInviteEmail("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tenant-admin-members", selectedTenantId] }),
        qc.invalidateQueries({ queryKey: ["tenant-admin-invitations"] }),
      ]);
      toast.success("邀请已发送");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upsertMemberMutation = useMutation({
    mutationFn: () => tenantApi.upsertMember(selectedTenantId, directEmail.trim(), directRole),
    onSuccess: async () => {
      setDirectEmail("");
      await qc.invalidateQueries({ queryKey: ["tenant-admin-members", selectedTenantId] });
      toast.success("成员已添加/更新");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      tenantApi.updateMemberRole(selectedTenantId, userId, role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tenant-admin-members", selectedTenantId] });
      toast.success("成员角色已更新");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => tenantApi.removeMember(selectedTenantId, userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tenant-admin-members", selectedTenantId] });
      toast.success("成员已移除");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinInvitationMutation = useMutation({
    mutationFn: (tenantId: string) => tenantApi.join(tenantId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tenant-admin-invitations"] }),
        qc.invalidateQueries({ queryKey: ["tenant-admin-list"] }),
      ]);
      await refetchTenants();
      toast.success("已加入租户");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectedTenant = useMemo(
    () => myTenants.find((tenant) => tenant.tenant_id === selectedTenantId),
    [myTenants, selectedTenantId],
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              租户管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">维护租户信息、成员邀请与角色分配</p>
          </div>
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["tenant-admin-list"] });
              qc.invalidateQueries({ queryKey: ["tenant-admin-detail"] });
              qc.invalidateQueries({ queryKey: ["tenant-admin-members"] });
              qc.invalidateQueries({ queryKey: ["tenant-admin-invitations"] });
            }}
            className="text-[12px] px-3 py-2 rounded-md border border-border hover:bg-secondary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 inline mr-1" />
            刷新
          </button>
        </div>

        {!canTenantRead ? (
          <div className="bg-card rounded-lg border border-border p-6 text-sm text-muted-foreground">
            当前角色缺少 `api.tenant.read` 权限，无法访问租户管理能力。
          </div>
        ) : (
          <>
            <div className="bg-card rounded-lg border border-border p-4 shadow-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-muted-foreground">当前租户</label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => {
                    const nextTenantId = e.target.value;
                    if (!nextTenantId || nextTenantId === selectedTenantId) return;
                    switchTenantMutation.mutate(nextTenantId);
                  }}
                  className="h-9 rounded-md border border-input bg-card px-3 text-sm min-w-72"
                  disabled={tenantsLoading || switchTenantMutation.isPending}
                >
                  {myTenants.map((tenant) => (
                    <option key={tenant.tenant_id} value={tenant.tenant_id}>
                      {tenant.name} ({tenant.slug})
                    </option>
                  ))}
                </select>
                {switchTenantMutation.isPending && (
                  <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    切换中...
                  </span>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-3">
                <h2 className="text-sm font-semibold text-foreground">租户基础信息</h2>
                {detailLoading ? (
                  <div className="text-sm text-muted-foreground">加载中...</div>
                ) : selectedTenantId ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-muted-foreground">租户名称</label>
                      <input
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        disabled={!canTenantUpdate}
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-muted-foreground">Slug</label>
                      <input
                        value={tenantSlug}
                        onChange={(e) => setTenantSlug(e.target.value)}
                        disabled={!canTenantUpdate}
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-muted-foreground">状态</label>
                      <select
                        value={tenantStatus}
                        onChange={(e) => setTenantStatus(e.target.value)}
                        disabled={!canTenantUpdate}
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm disabled:opacity-60"
                      >
                        {TENANT_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => updateTenantMutation.mutate()}
                      disabled={
                        !canTenantUpdate ||
                        !selectedTenantId ||
                        !tenantName.trim() ||
                        !tenantSlug.trim() ||
                        updateTenantMutation.isPending
                      }
                      className="text-[12px] px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                      {updateTenantMutation.isPending ? "保存中..." : "保存租户信息"}
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">暂无可访问租户</div>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-3">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MailPlus className="h-4 w-4 text-primary" />
                  我的待加入邀请
                </h2>
                {invitationsLoading ? (
                  <div className="text-sm text-muted-foreground">加载中...</div>
                ) : myInvitations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">当前没有待加入邀请</div>
                ) : (
                  <div className="space-y-2">
                    {myInvitations.map((item) => (
                      <div key={item.tenant_id} className="border border-border rounded-md p-3">
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          role: {item.role} · status: {item.status}
                        </div>
                        <button
                          onClick={() => joinInvitationMutation.mutate(item.tenant_id)}
                          disabled={joinInvitationMutation.isPending}
                          className="mt-2 text-[12px] px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40"
                        >
                          加入租户
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                租户成员
                {selectedTenant && (
                  <span className="text-[11px] text-muted-foreground font-normal">· {selectedTenant.name}</span>
                )}
              </h2>
              {!canMemberManage ? (
                <div className="text-sm text-muted-foreground">缺少 `api.tenant.member.manage` 权限，无法管理成员。</div>
              ) : membersLoading ? (
                <div className="text-sm text-muted-foreground">加载成员中...</div>
              ) : (
                <>
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="border border-border rounded-md p-3 space-y-2">
                      <div className="text-[12px] font-medium text-foreground">邀请成员（待确认加入）</div>
                      <input
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="成员邮箱"
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => inviteMemberMutation.mutate()}
                        disabled={!inviteEmail.trim() || inviteMemberMutation.isPending}
                        className="text-[12px] px-3 py-2 rounded-md border border-border hover:bg-secondary disabled:opacity-40"
                      >
                        <MailPlus className="h-3.5 w-3.5 inline mr-1" />
                        发送邀请
                      </button>
                    </div>

                    <div className="border border-border rounded-md p-3 space-y-2">
                      <div className="text-[12px] font-medium text-foreground">直接加入成员（立即生效）</div>
                      <input
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        placeholder="成员邮箱"
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                      />
                      <select
                        value={directRole}
                        onChange={(e) => setDirectRole(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => upsertMemberMutation.mutate()}
                        disabled={!directEmail.trim() || upsertMemberMutation.isPending}
                        className="text-[12px] px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                      >
                        <UserPlus className="h-3.5 w-3.5 inline mr-1" />
                        添加/更新成员
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-3 py-2">邮箱</th>
                          <th className="text-left px-3 py-2">成员 ID</th>
                          <th className="text-left px-3 py-2">角色</th>
                          <th className="text-left px-3 py-2">状态</th>
                          <th className="text-right px-3 py-2">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {members.map((member: TenantMemberData) => (
                          <tr key={member.user_id}>
                            <td className="px-3 py-2 text-foreground">{member.email}</td>
                            <td className="px-3 py-2 text-muted-foreground font-mono text-[11px]">{member.user_id}</td>
                            <td className="px-3 py-2">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  updateRoleMutation.mutate({ userId: member.user_id, role: e.target.value })
                                }
                                className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option key={role} value={role}>
                                    {role}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">{member.status}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeMemberMutation.mutate(member.user_id)}
                                disabled={removeMemberMutation.isPending || member.role === "owner"}
                                className="text-[12px] px-2.5 py-1.5 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/5 disabled:opacity-40"
                              >
                                移除
                              </button>
                            </td>
                          </tr>
                        ))}
                        {members.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                              暂无成员数据
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default TenantAdmin;
