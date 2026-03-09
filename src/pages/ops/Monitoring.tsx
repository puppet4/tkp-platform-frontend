import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AlertTriangle, Bell, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi, type AlertData } from "@/lib/api";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Monitoring = () => {
  const qc = useQueryClient();
  const { roleName } = useRoleAccess();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const supportsAlertMutations = false;

  const canOpsManage = roleName === "owner" || roleName === "admin";

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["ops-alerts", filterStatus],
    queryFn: () => opsApi.listAlerts(filterStatus === "all" ? undefined : filterStatus),
    enabled: canOpsManage,
    refetchInterval: 30000, // 每30秒刷新
  });

  const { data: ingestionJobs = [] } = useQuery({
    queryKey: ["ops-ingestion-jobs"],
    queryFn: () => opsApi.listIngestionJobs().catch(() => [] as any[]),
    enabled: canOpsManage,
    refetchInterval: 10000, // 每10秒刷新
  });

  const acknowledgeAlertMut = useMutation({
    mutationFn: (alertId: string) => opsApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-alerts"] });
      toast.success("告警已确认");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const resolveAlertMut = useMutation({
    mutationFn: (alertId: string) => opsApi.resolveAlert(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-alerts"] });
      toast.success("告警已解决");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  if (!canOpsManage) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          权限不足，需要管理员权限
        </div>
      </AppLayout>
    );
  }

  const criticalAlerts = alerts.filter((a: AlertData) => a.severity === "critical");
  const warningAlerts = alerts.filter((a: AlertData) => a.severity === "warning");
  const activeJobs = ingestionJobs.filter((j: any) => j.status === "processing");
  const failedJobs = ingestionJobs.filter((j: any) => j.status === "dead_letter");

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              监控告警
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              系统告警和入库任务监控
            </p>
          </div>
          <button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["ops-alerts"] });
              qc.invalidateQueries({ queryKey: ["ops-ingestion-jobs"] });
            }}
            className="px-4 py-2 border rounded-md hover:bg-muted flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">严重告警</div>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">警告告警</div>
            <div className="text-2xl font-bold text-orange-600">{warningAlerts.length}</div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">处理中任务</div>
            <div className="text-2xl font-bold text-blue-600">{activeJobs.length}</div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">失败任务</div>
            <div className="text-2xl font-bold text-red-600">{failedJobs.length}</div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">告警列表</h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">全部</option>
              <option value="active">活跃</option>
              <option value="acknowledged">已确认</option>
              <option value="resolved">已解决</option>
            </select>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无告警
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert: AlertData) => (
                  <div
                    key={alert.alert_id}
                    className={`p-4 border rounded-md ${
                      alert.severity === "critical"
                        ? "border-red-200 bg-red-50"
                        : alert.severity === "warning"
                        ? "border-orange-200 bg-orange-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle
                            className={`w-5 h-5 ${
                              alert.severity === "critical"
                                ? "text-red-600"
                                : alert.severity === "warning"
                                ? "text-orange-600"
                                : "text-gray-600"
                            }`}
                          />
                          <span className="font-semibold">{alert.title}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              alert.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : alert.severity === "warning"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {alert.severity === "critical" ? "严重" : alert.severity === "warning" ? "警告" : "信息"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          触发时间: {new Date(alert.triggered_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {supportsAlertMutations && alert.status === "active" && (
                          <button
                            onClick={() => acknowledgeAlertMut.mutate(alert.alert_id)}
                            disabled={acknowledgeAlertMut.isPending}
                            className="px-3 py-1 text-sm border rounded-md hover:bg-muted"
                          >
                            确认
                          </button>
                        )}
                        {supportsAlertMutations && (alert.status === "active" || alert.status === "acknowledged") && (
                          <button
                            onClick={() => resolveAlertMut.mutate(alert.alert_id)}
                            disabled={resolveAlertMut.isPending}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            解决
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ingestion Jobs */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="font-semibold">入库任务监控</h2>
          </div>
          <div className="p-4">
            {ingestionJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无入库任务
              </div>
            ) : (
              <div className="space-y-2">
                {ingestionJobs.slice(0, 10).map((job: any) => (
                  <div key={job.job_id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{job.document_title || job.job_id}</div>
                      <div className="text-xs text-muted-foreground">
                        知识库: {job.kb_id} • 创建时间: {new Date(job.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === "processing" && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          处理中
                        </span>
                      )}
                      {job.status === "completed" && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          已完成
                        </span>
                      )}
                      {job.status === "failed" && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          失败
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Monitoring;
