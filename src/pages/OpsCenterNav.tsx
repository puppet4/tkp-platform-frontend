import { AppLayout } from "@/components/AppLayout";
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const OpsCenter = () => {
  const navigate = useNavigate();
  const { roleName, canAction } = useRoleAccess();

  const canOpsManage = (roleName === "owner" || roleName === "admin") && canAction("api.tenant.member.manage");

  const cards = [
    {
      id: "overview",
      title: "总览",
      description: "系统运行状态和关键指标概览",
      icon: Activity,
      path: "/ops/overview",
      visible: true,
    },
    {
      id: "monitoring",
      title: "监控告警",
      description: "系统告警和入库任务监控",
      icon: AlertTriangle,
      path: "/ops/monitoring",
      visible: canOpsManage,
    },
    {
      id: "incidents",
      title: "事件管理",
      description: "故障事件跟踪和处理",
      icon: CheckCircle,
      path: "/ops/incidents",
      visible: canOpsManage,
    },
    {
      id: "quality",
      title: "质量评测",
      description: "检索质量和模型评测",
      icon: TrendingUp,
      path: "/ops/quality",
      visible: canOpsManage,
    },
    {
      id: "quotas",
      title: "配额管理",
      description: "租户和工作空间配额管理",
      icon: TrendingUp,
      path: "/ops/quotas",
      visible: canOpsManage,
    },
    {
      id: "releases",
      title: "发布管理",
      description: "版本发布和Webhook配置",
      icon: TrendingUp,
      path: "/ops/releases",
      visible: canOpsManage,
    },
  ];

  const visibleCards = cards.filter((card) => card.visible);

  if (!canOpsManage) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          权限不足，需要管理员权限访问运维中心
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">运维中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            系统监控、事件管理、质量评测和配额管理
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className="p-6 bg-card border rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default OpsCenter;
