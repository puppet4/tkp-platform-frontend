import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { governanceApi } from "@/lib/api";
import { RotateCcw, Play, Loader2, AlertTriangle } from "lucide-react";
import { FormDialog, FormField, FormInput, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Retention = () => {
  const qc = useQueryClient();
  const { roleName } = useRoleAccess();

  const [retentionResourceType, setRetentionResourceType] = useState("retrieval_logs");
  const [retentionDryRun, setRetentionDryRun] = useState(true);
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [policyResourceType, setPolicyResourceType] = useState("retrieval_logs");
  const [policyRetentionDays, setPolicyRetentionDays] = useState("90");

  const isAdmin = roleName === "owner" || roleName === "admin";

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["retention-policies"],
    queryFn: () => governanceApi.listRetentionPolicies(),
    enabled: isAdmin,
  });

  const createPolicyMut = useMutation({
    mutationFn: (data: { resource_type: string; retention_days: number }) =>
      governanceApi.createRetentionPolicy(data.resource_type, data.retention_days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["retention-policies"] });
      toast.success("保留策略已创建");
      setShowNewPolicy(false);
      setPolicyResourceType("retrieval_logs");
      setPolicyRetentionDays("90");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const executeRetentionMut = useMutation({
    mutationFn: () => governanceApi.executeRetention(),
    onSuccess: (data: any) => {
      toast.success(`清理完成：${data.deleted_count || 0} 条记录已删除`);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const cleanupMut = useMutation({
    mutationFn: (data: { resource_type: string; dry_run: boolean }) =>
      governanceApi.cleanupExpiredData(data.resource_type, data.dry_run),
    onSuccess: (data: any) => {
      if (retentionDryRun) {
        toast.info(`预演模式：将删除 ${data.would_delete || 0} 条记录`);
      } else {
        toast.success(`已删除 ${data.deleted_count || 0} 条过期记录`);
      }
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          权限不足，需要管理员权限
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
              <RotateCcw className="w-6 h-6" />
              数据保留策略
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              配置和执行数据保留策略，自动清理过期数据
            </p>
          </div>
          <button
            onClick={() => setShowNewPolicy(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            创建策略
          </button>
        </div>

        {/* Policies List */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">保留策略列表</h2>
          </div>
          <div className="p-4">
            {policiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : policies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无保留策略
              </div>
            ) : (
              <div className="space-y-2">
                {policies.map((policy: any) => (
                  <div
                    key={policy.policy_id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <div className="font-medium">{policy.resource_type}</div>
                      <div className="text-sm text-muted-foreground">
                        保留 {policy.retention_days} 天
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          policy.enabled
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {policy.enabled ? "启用" : "禁用"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Cleanup */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            手动清理过期数据
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">资源类型</label>
              <select
                value={retentionResourceType}
                onChange={(e) => setRetentionResourceType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="retrieval_logs">检索日志</option>
                <option value="chat_messages">对话消息</option>
                <option value="audit_logs">审计日志</option>
                <option value="ingestion_jobs">入库任务</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={retentionDryRun}
                  onChange={(e) => setRetentionDryRun(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">预演模式（不实际删除）</span>
              </label>
            </div>
          </div>

          <button
            onClick={() =>
              cleanupMut.mutate({
                resource_type: retentionResourceType,
                dry_run: retentionDryRun,
              })
            }
            disabled={cleanupMut.isPending}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
          >
            {cleanupMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {retentionDryRun ? "预演清理" : "执行清理"}
          </button>
        </div>

        {/* Create Policy Dialog */}
        <FormDialog
          open={showNewPolicy}
          onOpenChange={setShowNewPolicy}
          title="创建保留策略"
          description="配置数据保留时长"
        >
          <FormField label="资源类型">
            <select
              value={policyResourceType}
              onChange={(e) => setPolicyResourceType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="retrieval_logs">检索日志</option>
              <option value="chat_messages">对话消息</option>
              <option value="audit_logs">审计日志</option>
              <option value="ingestion_jobs">入库任务</option>
            </select>
          </FormField>

          <FormField label="保留天数">
            <FormInput
              type="number"
              value={policyRetentionDays}
              onChange={(e) => setPolicyRetentionDays(e.target.value)}
              placeholder="90"
            />
          </FormField>

          <div className="flex gap-2 justify-end">
            <DialogButton variant="outline" onClick={() => setShowNewPolicy(false)}>
              取消
            </DialogButton>
            <DialogButton
              onClick={() =>
                createPolicyMut.mutate({
                  resource_type: policyResourceType,
                  retention_days: parseInt(policyRetentionDays),
                })
              }
              disabled={createPolicyMut.isPending}
            >
              {createPolicyMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "创建"
              )}
            </DialogButton>
          </div>
        </FormDialog>
      </div>
    </AppLayout>
  );
};

export default Retention;
