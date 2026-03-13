import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { governanceApi } from "@/lib/api";
import { RotateCcw, Play, Loader2, AlertTriangle, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FormInput } from "@/components/FormInput";

interface RetentionPolicy {
  resource_type: string;
  retention_days: number;
  auto_delete: boolean;
  archive_before_delete: boolean;
}

const Retention = () => {
  const { hasPermission } = useRoleAccess();
  const queryClient = useQueryClient();
  const [retentionResourceType, setRetentionResourceType] = useState("retrieval_logs");
  const [retentionDryRun, setRetentionDryRun] = useState(true);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [formData, setFormData] = useState({
    resource_type: "",
    retention_days: 90,
    auto_delete: false,
    archive_before_delete: false,
  });

  const canCleanupRetention = hasPermission("api.governance.retention.cleanup");

  // Query policies
  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ["retention-policies"],
    queryFn: () => governanceApi.listRetentionPolicies(),
    enabled: canCleanupRetention,
  });

  const policies = policiesData?.policies || [];

  // Cleanup mutation
  const cleanupMut = useMutation({
    mutationFn: (data: { resource_type: string; dry_run: boolean }) =>
      governanceApi.retentionCleanup(data.resource_type, data.dry_run),
    onSuccess: (data: any) => {
      if (retentionDryRun) {
        toast.info(`预演模式：将删除 ${data.would_delete || 0} 条记录`);
      } else {
        toast.success(`已删除 ${data.deleted_count || 0} 条过期记录`);
      }
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  // Create/Update policy mutation
  const savePolicyMut = useMutation({
    mutationFn: (data: typeof formData) => {
      // Validate retention_days
      if (data.retention_days < 1 || data.retention_days > 3650) {
        throw new Error("保留天数必须在 1-3650 之间");
      }

      if (editingPolicy) {
        return governanceApi.updateRetentionPolicy(
          data.resource_type,
          data.retention_days,
          data.auto_delete,
          data.archive_before_delete
        );
      }
      return governanceApi.createRetentionPolicy(
        data.resource_type,
        data.retention_days,
        data.auto_delete,
        data.archive_before_delete
      );
    },
    onSuccess: () => {
      toast.success(editingPolicy ? "策略已更新" : "策略已创建");
      queryClient.invalidateQueries({ queryKey: ["retention-policies"] });
      setShowPolicyForm(false);
      setEditingPolicy(null);
      setFormData({
        resource_type: "",
        retention_days: 90,
        auto_delete: false,
        archive_before_delete: false,
      });
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleEditPolicy = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    setFormData(policy);
    setShowPolicyForm(true);
  };

  const handleCancelForm = () => {
    setShowPolicyForm(false);
    setEditingPolicy(null);
    setFormData({
      resource_type: "",
      retention_days: 90,
      auto_delete: false,
      archive_before_delete: false,
    });
  };

  if (!canCleanupRetention) {
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="w-6 h-6" />
            数据保留策略
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理数据保留策略和执行过期数据清理
          </p>
        </div>

        {/* Policies List */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">保留策略列表</h2>
            <button
              onClick={() => setShowPolicyForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新建策略
            </button>
          </div>

          {policiesLoading ? (
            <LoadingSpinner text="加载策略中..." />
          ) : policies.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">暂无保留策略</p>
          ) : (
            <div className="space-y-2">
              {policies.map((policy: RetentionPolicy) => (
                <div
                  key={policy.resource_type}
                  className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{policy.resource_type}</p>
                    <p className="text-sm text-gray-600">
                      保留 {policy.retention_days} 天
                      {policy.auto_delete && " · 自动删除"}
                      {policy.archive_before_delete && " · 删除前归档"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditPolicy(policy)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Policy Form */}
        {showPolicyForm && (
          <div className="bg-card rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {editingPolicy ? "编辑策略" : "新建策略"}
            </h2>

            <FormInput
              label="资源类型"
              value={formData.resource_type}
              onChange={(val) => setFormData({ ...formData, resource_type: val })}
              placeholder="例如: retrieval_logs"
              required
              disabled={!!editingPolicy}
              helperText="资源类型创建后不可修改"
            />

            <FormInput
              label="保留天数"
              type="number"
              value={String(formData.retention_days)}
              onChange={(val) => setFormData({ ...formData, retention_days: parseInt(val) || 0 })}
              required
              helperText="数据保留的天数，超过此天数的数据将被清理"
            />

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_delete}
                  onChange={(e) => setFormData({ ...formData, auto_delete: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">自动删除过期数据</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.archive_before_delete}
                  onChange={(e) => setFormData({ ...formData, archive_before_delete: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">删除前归档数据</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => savePolicyMut.mutate(formData)}
                disabled={savePolicyMut.isPending || !formData.resource_type}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savePolicyMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingPolicy ? "更新策略" : "创建策略"}
              </button>
              <button
                onClick={handleCancelForm}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        )}

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
                <option value="ingestion_jobs">入库任务</option>
                <option value="agent_runs">Agent 运行</option>
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
      </div>
    </AppLayout>
  );
};

export default Retention;
