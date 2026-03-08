import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  governanceApi,
  opsApi,
  permissionsApi,
  type DeletionProofData,
  type DeletionRequestData,
  type TenantRolePermissionData,
} from "@/lib/api";
import {
  Shield, Trash2, Key, CheckCircle, XCircle, Play,
  FileCheck, AlertTriangle, Loader2, RotateCcw
} from "lucide-react";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { PageTabs } from "@/components/PageTabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";

type Tab = "permissions" | "deletion";

const Governance = () => {
  const qc = useQueryClient();
  const { uiManifest, refreshPermissions } = useAuth();
  const { roleName, canAction, canFeature } = useRoleAccess();
  const [tab, setTab] = useState<Tab>("permissions");

  const [showDeleteReq, setShowDeleteReq] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ type: "approve" | "reject" | "execute"; id: string } | null>(null);
  const [showProof, setShowProof] = useState<string | null>(null);
  const [proofData, setProofData] = useState<DeletionProofData | null>(null);

  const [formTarget, setFormTarget] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formTargetType, setFormTargetType] = useState("document");
  const [rejectReason, setRejectReason] = useState("");

  const [selectedRole, setSelectedRole] = useState("");
  const [editingPermissionCodes, setEditingPermissionCodes] = useState<string[]>([]);
  const [permissionFilter, setPermissionFilter] = useState("");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "permissions", label: "权限中心", icon: Key },
    { id: "deletion", label: "删除治理", icon: Trash2 },
  ];
  const canManageTenant = canAction("api.tenant.member.manage");
  const canViewPermissionCenter = canFeature("feature.auth.permissions") || canManageTenant;
  const canEditPermissionCenter = canManageTenant;
  const canCreateDeletionRequest = canAction("api.tenant.read");
  const canReviewDeletion = roleName === "owner" || roleName === "admin";
  const visibleTabs = tabs.filter((item) => (item.id === "permissions" ? canViewPermissionCenter : true));

  useEffect(() => {
    if (tab === "permissions" && !canViewPermissionCenter) {
      setTab("deletion");
    }
  }, [tab, canViewPermissionCenter]);

  const toastNoPermission = (label: string) => {
    toast.error(`当前角色无权执行：${label}`);
  };

  // Permission center queries
  const { data: permissionCatalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => permissionsApi.catalog(),
    enabled: tab === "permissions",
  });

  const { data: rolePermissions = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["permission-roles"],
    queryFn: () => permissionsApi.listRoles(),
    enabled: tab === "permissions",
    retry: false,
  });

  const { data: runtimeManifest, refetch: refetchRuntimeManifest } = useQuery({
    queryKey: ["permission-ui-manifest-runtime"],
    queryFn: () => permissionsApi.uiManifest(),
    enabled: tab === "permissions",
  });

  const selectedRoleData = useMemo(
    () => rolePermissions.find((r) => r.role === selectedRole),
    [rolePermissions, selectedRole],
  );

  useEffect(() => {
    if (!rolePermissions.length) return;
    if (!selectedRole) {
      setSelectedRole(rolePermissions[0].role);
      setEditingPermissionCodes(rolePermissions[0].permission_codes || []);
      return;
    }
    const current = rolePermissions.find((r) => r.role === selectedRole);
    if (current) {
      setEditingPermissionCodes(current.permission_codes || []);
    }
  }, [rolePermissions, selectedRole]);

  const filteredCatalog = useMemo(() => {
    const q = permissionFilter.trim().toLowerCase();
    if (!q) return permissionCatalog;
    return permissionCatalog.filter((code) => code.toLowerCase().includes(q));
  }, [permissionCatalog, permissionFilter]);

  const updateRoleMutation = useMutation({
    mutationFn: (payload: { role: string; permissionCodes: string[] }) =>
      permissionsApi.updateRole(payload.role, payload.permissionCodes),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["permission-roles"] });
      await refetchRuntimeManifest();
      await refreshPermissions();
      toast.success("角色权限已更新");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetRoleMutation = useMutation({
    mutationFn: (role: string) => permissionsApi.resetRole(role),
    onSuccess: async (data) => {
      setEditingPermissionCodes(data.permission_codes || []);
      await qc.invalidateQueries({ queryKey: ["permission-roles"] });
      await refetchRuntimeManifest();
      await refreshPermissions();
      toast.success("角色权限已重置为默认值");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDeletionMutation = useMutation({
    mutationFn: () => governanceApi.createDeletionRequest(formTargetType, formTarget, formReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-deletion-requests"] });
      toast.success("删除请求已提交");
      setShowDeleteReq(false);
      setFormTarget("");
      setFormReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => governanceApi.approveDeletion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-deletion-requests"] });
      toast.success("审批通过");
      setShowConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => governanceApi.rejectDeletion(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-deletion-requests"] });
      toast.success("审批拒绝");
      setShowConfirm(null);
      setRejectReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => governanceApi.executeDeletion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["governance-deletion-requests"] });
      qc.invalidateQueries({ queryKey: ["governance-deletion-proofs"] });
      toast.success("删除已执行");
      setShowConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fetchProof = async (proofId: string) => {
    try {
      const data = await governanceApi.getDeletionProof(proofId);
      setProofData(data);
      setShowProof(proofId);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const { data: deletionRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["governance-deletion-requests"],
    queryFn: () => governanceApi.listDeletionRequests({ limit: 50 }),
    enabled: tab === "deletion",
    retry: false,
  });

  const { data: deletionProofs = [], isLoading: proofsLoading } = useQuery({
    queryKey: ["governance-deletion-proofs"],
    queryFn: () => opsApi.listDeletionProofs({ limit: 20 }),
    enabled: tab === "deletion",
    retry: false,
  });

  const togglePermissionCode = (code: string) => {
    if (!canEditPermissionCenter) {
      toastNoPermission("编辑角色权限");
      return;
    }
    setEditingPermissionCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-foreground mb-1">权限与治理</h1>
        <p className="text-sm text-muted-foreground mb-5">管理角色权限、删除审批与合规</p>

        <PageTabs tabs={visibleTabs} activeTab={tab} onTabChange={(id) => setTab(id as Tab)} />

        {/* Permissions */}
        {tab === "permissions" && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-foreground mb-1">运行时权限视图</h3>
              <div className="text-[12px] text-muted-foreground">
                当前角色：
                <span className="ml-1 text-foreground font-semibold">{runtimeManifest?.tenant_role || uiManifest?.tenant_role || "-"}</span>
                <span className="ml-3">版本：{runtimeManifest?.version || uiManifest?.version || "-"}</span>
              </div>
              <div className="mt-2 text-[12px] text-muted-foreground">
                允许动作数：{runtimeManifest?.allowed_actions.length ?? uiManifest?.allowed_actions.length ?? 0}
              </div>
            </div>

            {rolesLoading || catalogLoading ? (
              <div className="flex items-center justify-center py-16 gap-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">加载权限配置...</span>
              </div>
            ) : (
              <div className="grid md:grid-cols-[220px_1fr] gap-4">
                <div className="bg-card rounded-lg border border-border p-3 shadow-xs space-y-2 h-fit">
                  <div className="text-[12px] text-muted-foreground px-1">角色列表</div>
                  {rolePermissions.map((rp: TenantRolePermissionData) => (
                    <button
                      key={rp.role}
                      onClick={() => setSelectedRole(rp.role)}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                        selectedRole === rp.role
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <div className="text-sm font-medium">{rp.role}</div>
                      <div className="text-[11px] text-muted-foreground">{rp.permission_codes.length} 项权限</div>
                    </button>
                  ))}
                </div>

                <div className="bg-card rounded-lg border border-border p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">角色权限编辑 · {selectedRole || "-"}</h3>
                      <p className="text-[11px] text-muted-foreground">勾选权限后保存，立即写入租户角色权限矩阵</p>
                    </div>
                    <div className="text-[11px] text-muted-foreground">已选 {editingPermissionCodes.length} 项</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={permissionFilter}
                      onChange={(e) => setPermissionFilter(e.target.value)}
                      placeholder="搜索权限码..."
                      className="h-8 rounded-md border border-input bg-card px-3 text-sm flex-1"
                    />
                    <button
                      onClick={() => refetchRuntimeManifest()}
                      disabled={!canViewPermissionCenter}
                      className="text-[12px] px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary"
                    >
                      刷新运行态
                    </button>
                  </div>

                  <div className="border border-border rounded-lg p-3 max-h-[380px] overflow-auto">
                    <div className="grid md:grid-cols-2 gap-2">
                      {filteredCatalog.map((code) => (
                        <label key={code} className="flex items-center gap-2 p-2 rounded border border-border hover:bg-secondary/30 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPermissionCodes.includes(code)}
                            disabled={!canEditPermissionCenter}
                            onChange={() => togglePermissionCode(code)}
                          />
                          <span className="text-[12px] font-mono text-foreground break-all">{code}</span>
                        </label>
                      ))}
                    </div>
                    {filteredCatalog.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">无匹配权限码</div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        if (!canEditPermissionCenter) {
                          toastNoPermission("重置角色权限");
                          return;
                        }
                        if (selectedRole) resetRoleMutation.mutate(selectedRole);
                      }}
                      disabled={!canEditPermissionCenter || !selectedRole || resetRoleMutation.isPending}
                      className="text-[12px] px-3 py-2 rounded-md border border-border hover:bg-secondary disabled:opacity-40"
                    >
                      <RotateCcw className="h-3.5 w-3.5 inline mr-1" />
                      重置默认
                    </button>
                    <button
                      onClick={() => {
                        if (!canEditPermissionCenter) {
                          toastNoPermission("保存角色权限");
                          return;
                        }
                        if (selectedRole) {
                          updateRoleMutation.mutate({ role: selectedRole, permissionCodes: editingPermissionCodes });
                        }
                      }}
                      disabled={!canEditPermissionCenter || !selectedRole || updateRoleMutation.isPending}
                      className="text-[12px] px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                      {updateRoleMutation.isPending ? "保存中..." : "保存权限"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deletion Governance */}
        {tab === "deletion" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">删除请求</h2>
              <button onClick={() => {
                if (!canCreateDeletionRequest) {
                  toastNoPermission("创建删除请求");
                  return;
                }
                setShowDeleteReq(true);
              }}
                disabled={!canCreateDeletionRequest}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                <Trash2 className="h-3.5 w-3.5" /> 新建删除请求
              </button>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 shadow-xs text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">提交删除请求后，需经管理员审批方可执行</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">审批完成后可通过 API 获取删除证明，确保合规可审计</p>

              <div className="mt-6 max-w-sm mx-auto space-y-2">
                <FormField label="按请求 ID 操作">
                  <div className="flex gap-2">
                    <FormInput value={formTarget} onChange={setFormTarget} placeholder="输入请求 ID (UUID)" />
                  </div>
                </FormField>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button
                    onClick={() => {
                      if (!canReviewDeletion) {
                        toastNoPermission("批准删除请求");
                        return;
                      }
                      if (formTarget) setShowConfirm({ type: "approve", id: formTarget });
                    }}
                    disabled={!canReviewDeletion || !formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-success/10 text-success hover:bg-success/20 disabled:opacity-30 transition-colors"
                  >
                    <CheckCircle className="h-3 w-3 inline mr-1" />批准
                  </button>
                  <button
                    onClick={() => {
                      if (!canReviewDeletion) {
                        toastNoPermission("拒绝删除请求");
                        return;
                      }
                      if (formTarget) setShowConfirm({ type: "reject", id: formTarget });
                    }}
                    disabled={!canReviewDeletion || !formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-30 transition-colors"
                  >
                    <XCircle className="h-3 w-3 inline mr-1" />拒绝
                  </button>
                  <button
                    onClick={() => {
                      if (!canReviewDeletion) {
                        toastNoPermission("执行删除");
                        return;
                      }
                      if (formTarget) setShowConfirm({ type: "execute", id: formTarget });
                    }}
                    disabled={!canReviewDeletion || !formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-warning/10 text-warning hover:bg-warning/20 disabled:opacity-30 transition-colors"
                  >
                    <Play className="h-3 w-3 inline mr-1" />执行
                  </button>
                  <button
                    onClick={() => formTarget && fetchProof(formTarget)}
                    disabled={!formTarget}
                    className="text-[11px] px-3 py-1.5 rounded-md bg-info/10 text-info hover:bg-info/20 disabled:opacity-30 transition-colors"
                  >
                    <FileCheck className="h-3 w-3 inline mr-1" />查看证明
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-foreground mb-3">删除请求列表</h3>
              {requestsLoading ? (
                <div className="text-sm text-muted-foreground">加载中...</div>
              ) : deletionRequests.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无删除请求记录</div>
              ) : (
                <div className="space-y-2">
                  {deletionRequests.map((req: DeletionRequestData) => (
                    <button
                      key={req.request_id}
                      onClick={() => setFormTarget(req.request_id)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">{req.resource_type} · {req.resource_id}</div>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{req.status}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {req.reason || "-"} · {req.requested_at ? new Date(req.requested_at).toLocaleString("zh-CN") : "-"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-foreground mb-3">最近删除证明</h3>
              {proofsLoading ? (
                <div className="text-sm text-muted-foreground">加载中...</div>
              ) : deletionProofs.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无删除证明记录</div>
              ) : (
                <div className="space-y-2">
                  {deletionProofs.map((proof) => (
                    <button
                      key={proof.proof_id}
                      onClick={() => { setProofData(proof); setShowProof(proof.proof_id); }}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground">{proof.resource_type}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {proof.resource_id} · {new Date(proof.deleted_at).toLocaleString("zh-CN")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Deletion Request */}
      <FormDialog open={showDeleteReq} onClose={() => { setShowDeleteReq(false); setFormTarget(""); setFormReason(""); }} title="新建删除请求" description="提交数据删除申请，需经管理员审批"
        footer={<>
          <DialogButton onClick={() => { setShowDeleteReq(false); setFormTarget(""); setFormReason(""); }}>取消</DialogButton>
          <DialogButton variant="destructive" disabled={!canCreateDeletionRequest || !formTarget || !formReason || createDeletionMutation.isPending}
            onClick={() => {
              if (!canCreateDeletionRequest) {
                toastNoPermission("提交删除请求");
                return;
              }
              createDeletionMutation.mutate();
            }}>
            {createDeletionMutation.isPending ? "提交中..." : "提交申请"}
          </DialogButton>
        </>}>
        <FormField label="目标类型" required>
          <FormSelect value={formTargetType} onChange={setFormTargetType} options={[
            { value: "document", label: "文档" }, { value: "knowledge_base", label: "知识库" }, { value: "conversation", label: "对话记录" },
          ]} />
        </FormField>
        <FormField label="资源 ID" required><FormInput value={formTarget} onChange={setFormTarget} placeholder="输入资源 UUID" /></FormField>
        <FormField label="删除原因" required hint="请详细说明删除原因，便于审批人判断">
          <FormTextarea value={formReason} onChange={setFormReason} placeholder="如：文档内容过期且包含敏感信息..." rows={4} />
        </FormField>
      </FormDialog>

      {/* Confirm Dialog */}
      <FormDialog open={!!showConfirm} onClose={() => { setShowConfirm(null); setRejectReason(""); }}
        title={showConfirm?.type === "approve" ? "确认批准" : showConfirm?.type === "reject" ? "确认拒绝" : "确认执行删除"}
        width="max-w-sm"
        footer={<>
          <DialogButton onClick={() => { setShowConfirm(null); setRejectReason(""); }}>取消</DialogButton>
          <DialogButton variant={showConfirm?.type === "reject" ? "destructive" : "primary"}
            disabled={
              !canReviewDeletion ||
              approveMutation.isPending ||
              rejectMutation.isPending ||
              executeMutation.isPending ||
              (showConfirm?.type === "reject" && !rejectReason)
            }
            onClick={() => {
              if (!showConfirm) return;
              if (!canReviewDeletion) {
                toastNoPermission("审批删除请求");
                return;
              }
              if (showConfirm.type === "approve") approveMutation.mutate(showConfirm.id);
              else if (showConfirm.type === "reject") rejectMutation.mutate({ id: showConfirm.id, reason: rejectReason });
              else executeMutation.mutate(showConfirm.id);
            }}>
            确认
          </DialogButton>
        </>}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${showConfirm?.type === "execute" ? "bg-destructive/10" : "bg-warning/10"}`}>
            <AlertTriangle className={`h-5 w-5 ${showConfirm?.type === "execute" ? "text-destructive" : "text-warning"}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {showConfirm?.type === "approve" && "确定批准此删除请求？批准后可由执行人进行实际删除。"}
              {showConfirm?.type === "reject" && "确定拒绝此删除请求？"}
              {showConfirm?.type === "execute" && "确定执行删除操作？此操作不可撤销。"}
            </p>
            {showConfirm?.type === "reject" && (
              <div className="mt-3">
                <FormTextarea value={rejectReason} onChange={setRejectReason} placeholder="拒绝原因（必填）" rows={2} />
              </div>
            )}
            {showConfirm?.type === "execute" && <p className="text-[11px] text-destructive mt-2 font-medium">⚠ 此操作不可恢复</p>}
          </div>
        </div>
      </FormDialog>

      {/* Proof Viewer */}
      <FormDialog open={!!showProof} onClose={() => { setShowProof(null); setProofData(null); }} title="删除证明" width="max-w-md"
        footer={<DialogButton onClick={() => { setShowProof(null); setProofData(null); }}>关闭</DialogButton>}>
        {proofData ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">证明 ID</div>
              <div className="text-sm font-mono text-foreground mt-0.5">{proofData.proof_id}</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">删除时间</div>
              <div className="text-sm text-foreground mt-0.5">{proofData.deleted_at}</div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">执行人</div>
              <div className="text-sm text-foreground mt-0.5">{proofData.executed_by}</div>
            </div>
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-success">数据已完全删除</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                资源类型: {proofData.resource_type} | 资源 ID: {proofData.resource_id}
              </div>
            </div>
            {proofData.details && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground mb-1">详细信息</div>
                <pre className="text-[11px] text-foreground overflow-auto max-h-40">{JSON.stringify(proofData.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        )}
      </FormDialog>
    </AppLayout>
  );
};

export default Governance;
