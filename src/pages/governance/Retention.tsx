import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { governanceApi } from "@/lib/api";
import { RotateCcw, Play, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Retention = () => {
  const { hasPermission } = useRoleAccess();
  const [retentionResourceType, setRetentionResourceType] = useState("retrieval_logs");
  const [retentionDryRun, setRetentionDryRun] = useState(true);

  const canCleanupRetention = hasPermission("api.governance.retention.cleanup");

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
            执行过期数据清理（策略 CRUD 暂未开放）
          </p>
        </div>

        <div className=”bg-card rounded-lg border p-6 space-y-4”>
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
