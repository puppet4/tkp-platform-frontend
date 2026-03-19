import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Activity, AlertTriangle, CheckCircle, Clock, Database } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { opsApi } from "@/lib/api";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const Overview = () => {
  const { roleName } = useRoleAccess();
  const [timeRange, setTimeRange] = useState(24);

  const canOpsManage = roleName === "owner" || roleName === "admin";

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["ops-metrics", timeRange],
    queryFn: () => opsApi.getMetrics(timeRange),
    enabled: canOpsManage,
  });

  const { data: ingestion } = useQuery({
    queryKey: ["ops-ingestion-metrics", timeRange],
    queryFn: () => opsApi.ingestionMetrics(timeRange),
    enabled: canOpsManage,
  });

  const { data: quality } = useQuery({
    queryKey: ["ops-quality", timeRange],
    queryFn: () => opsApi.retrievalQuality(timeRange),
    enabled: canOpsManage,
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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              运维总览
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              系统运行状态和关键指标概览
            </p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={1}>最近 1 小时</option>
            <option value={24}>最近 24 小时</option>
            <option value={168}>最近 7 天</option>
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">系统状态</div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold">正常</div>
            <div className="text-xs text-muted-foreground mt-1">
              所有服务运行正常
            </div>
          </div>

          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">活跃告警</div>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{metrics?.active_alerts || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics?.critical_alerts || 0} 个严重告警
            </div>
          </div>

          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">入库任务</div>
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{metrics?.ingestion_jobs || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics?.processing_jobs || 0} 个处理中
            </div>
          </div>

          <div className="p-6 bg-card border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">平均响应时间</div>
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{metrics?.avg_response_time || 0}ms</div>
            <div className="text-xs text-muted-foreground mt-1">
              P95: {metrics?.p95_response_time || 0}ms
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">服务健康状态</h2>
            <div className="space-y-3">
              {[
                { name: "API 服务", status: "healthy", uptime: "99.9%" },
                { name: "Worker 服务", status: "healthy", uptime: "99.8%" },
                { name: "数据库", status: "healthy", uptime: "100%" },
                { name: "向量数据库", status: "healthy", uptime: "99.9%" },
                { name: "对象存储", status: "healthy", uptime: "100%" },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      运行时间: {service.uptime}
                    </span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {service.status === "healthy" ? "健康" : "异常"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">入库与检索指标</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">积压任务</span>
                  <span className="text-sm font-medium">{ingestion?.backlog_total ?? 0}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">失败率（窗口内）</span>
                  <span className="text-sm font-medium">
                    {ingestion ? `${(ingestion.failure_rate_last_window * 100).toFixed(1)}%` : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">P95 入库耗时</span>
                  <span className="text-sm font-medium">
                    {ingestion?.p95_latency_ms_last_window != null
                      ? `${ingestion.p95_latency_ms_last_window}ms`
                      : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">检索零命中率</span>
                  <span className="text-sm font-medium">
                    {quality ? `${(quality.zero_hit_rate * 100).toFixed(1)}%` : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">引用覆盖率</span>
                  <span className="text-sm font-medium">
                    {quality ? `${(quality.citation_coverage_rate * 100).toFixed(1)}%` : "--"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">P95 检索延迟</span>
                  <span className="text-sm font-medium">
                    {quality?.latency_p95_ms != null ? `${quality.latency_p95_ms}ms` : "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">最近活动</h2>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无最近活动
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Overview;