import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { permissionsApi, type TenantRolePermissionData } from "@/lib/api";
import { Key, Save, RefreshCw, Loader2, FileCheck } from "lucide-react";
import { FormDialog, FormField, FormInput, FormTextarea, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Permissions = () => {
  const qc = useQueryClient();
  const { uiManifest, refreshPermissions } = useAuth();
  const { roleName, canFeature } = useRoleAccess();

  const [selectedRole, setSelectedRole] = useState("");
  const [editingPermissionCodes, setEditingPermissionCodes] = useState<string[]>([]);
  const [permissionFilter, setPermissionFilter] = useState("");
  const [snapshotNote, setSnapshotNote] = useState("");

  const isPermissionAdminRole = roleName === "owner" || roleName === "admin";
  const canViewPermissionCenter = isPermissionAdminRole || canFeature("feature.auth.permissions");
  const canEditPermissionCenter = isPermissionAdminRole;

  const { data: permissionCatalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["permission-catalog"],
    queryFn: () => permissionsApi.catalog(),
    enabled: canEditPermissionCenter,
    retry: false,
  });

  const { data: rolePermissions = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["permission-roles"],
    queryFn: () => permissionsApi.listRoles(),
    enabled: canEditPermissionCenter,
    retry: false,
  });

  const { data: runtimeManifest, refetch: refetchRuntimeManifest } = useQuery({
    queryKey: ["permission-ui-manifest-runtime"],
    queryFn: () => permissionsApi.uiManifest(),
  });

  const { data: runtimeSnapshot } = useQuery({
    queryKey: ["permission-runtime-snapshot"],
    queryFn: () => permissionsApi.latestPolicySnapshot(),
  });

  const { data: policyCenter } = useQuery({
    queryKey: ["permission-policy-center"],
    queryFn: () => permissionsApi.policyCenter(),
    enabled: canEditPermissionCenter,
  });

  const updateRoleMut = useMutation({
    mutationFn: (data: { role: string; codes: string[] }) =>
      permissionsApi.updateRole(data.role, data.codes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-roles"] });
      toast.success("角色权限已更新");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const createSnapshotMut = useMutation({
    mutationFn: (note: string) => permissionsApi.createPolicySnapshot(note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-runtime-snapshot"] });
      toast.success("快照已创建");
      setSnapshotNote("");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const selectedRoleData = useMemo(
    () => rolePermissions.find((r: TenantRolePermissionData) => r.role === selectedRole),
    [rolePermissions, selectedRole]
  );

  const filteredCatalog = useMemo(() => {
    if (!permissionFilter) return permissionCatalog;
    const lower = permissionFilter.toLowerCase();
    return permissionCatalog.filter(
      (p: any) =>
        p.code.toLowerCase().includes(lower) ||
        p.name?.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower)
    );
  }, [permissionCatalog, permissionFilter]);

  if (!canViewPermissionCenter) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          权限不足，无法访问权限中心
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="w-6 h-6" />
              权限中心
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理租户角色权限和权限策略
            </p>
          </div>
          {canEditPermissionCenter && (
            <button
              onClick={() => refetchRuntimeManifest()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新运行时
            </button>
          )}
        </div>

        {/* Role Permission Editor */}
        {canEditPermissionCenter && (
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">角色权限配置</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">选择角色</label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    const role = rolePermissions.find((r: TenantRolePermissionData) => r.role === e.target.value);
                    setEditingPermissionCodes(role?.permission_codes || []);
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- 选择角色 --</option>
                  {rolePermissions.map((r: TenantRolePermissionData) => (
                    <option key={r.role} value={r.role}>
                      {r.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">权限筛选</label>
                <input
                  type="text"
                  value={permissionFilter}
                  onChange={(e) => setPermissionFilter(e.target.value)}
                  placeholder="搜索权限代码或描述"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {selectedRole && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    已选择 {editingPermissionCodes.length} 个权限
                  </p>
                  <button
                    onClick={() => {
                      updateRoleMut.mutate({
                        role: selectedRole,
                        codes: editingPermissionCodes,
                      });
                    }}
                    disabled={updateRoleMut.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                  >
                    {updateRoleMut.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存权限
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-md p-4 space-y-2">
                  {filteredCatalog.map((perm: any) => (
                    <label key={perm.code} className="flex items-start gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPermissionCodes.includes(perm.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingPermissionCodes([...editingPermissionCodes, perm.code]);
                          } else {
                            setEditingPermissionCodes(editingPermissionCodes.filter((c) => c !== perm.code));
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-mono text-sm">{perm.code}</div>
                        {perm.description && (
                          <div className="text-xs text-muted-foreground">{perm.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Runtime Snapshot */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            权限快照
          </h2>

          {runtimeSnapshot && (
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">快照ID:</span>
                <span className="font-mono">{runtimeSnapshot.snapshot_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">模板版本:</span>
                <span className="font-mono">{runtimeSnapshot.template_version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间:</span>
                <span>{new Date(runtimeSnapshot.created_at).toLocaleString()}</span>
              </div>
              {runtimeSnapshot.note && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">备注:</span>
                  <span>{runtimeSnapshot.note}</span>
                </div>
              )}
            </div>
          )}

          {canEditPermissionCenter && (
            <div className="flex gap-2">
              <input
                type="text"
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="快照备注（可选）"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <button
                onClick={() => createSnapshotMut.mutate(snapshotNote)}
                disabled={createSnapshotMut.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
              >
                {createSnapshotMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4" />
                )}
                创建快照
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Permissions;
