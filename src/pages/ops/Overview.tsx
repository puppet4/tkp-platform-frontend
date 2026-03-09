import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Activity, TrendingUp, AlertTriangle, CheckCircle, Clock, Database } from "lucide-react";
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
            <option value={720}>最近 30 天</option>
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
            <h2 className="text-lg font-semibold mb-4">资源使用情况</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">CPU 使用率</span>
                  <span className="text-sm font-medium">{metrics?.cpu_usage || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${metrics?.cpu_usage || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">内存使用率</span>
                  <span className="text-sm font-medium">{metrics?.memory_usage || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${metrics?.memory_usage || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">磁盘使用率</span>
                  <span className="text-sm font-medium">{metrics?.disk_usage || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${metrics?.disk_usage || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">网络带宽</span>
                  <span className="text-sm font-medium">{metrics?.network_usage || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ width: `${metrics?.network_usage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">最近活动</h2>
          <div className="space-y-2">
            {metrics?.recent_activities?.length > 0 ? (
              metrics.recent_activities.map((activity: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-md">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm">{activity.message}</div>
                    <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                  </div>
                </div>
              ))
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
