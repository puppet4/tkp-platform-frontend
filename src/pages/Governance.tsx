import { AppLayout } from "@/components/AppLayout";
import { Shield, Trash2, Key, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const Governance = () => {
  const navigate = useNavigate();
  const { roleName, canFeature } = useRoleAccess();

  const isPermissionAdminRole = roleName === "owner" || roleName === "admin";
  const canViewPermissionCenter = isPermissionAdminRole || canFeature("feature.auth.permissions");

  const cards = [
    {
      id: "permissions",
      title: "权限中心",
      description: "管理租户角色权限和权限策略",
      icon: Key,
      path: "/governance/permissions",
      visible: canViewPermissionCenter,
    },
    {
      id: "retention",
      title: "数据保留",
      description: "配置和执行数据保留策略",
      icon: RotateCcw,
      path: "/governance/retention",
      visible: true,
    },
    {
      id: "pii",
      title: "PII 脱敏",
      description: "对个人身份信息进行脱敏处理",
      icon: Shield,
      path: "/governance/pii",
      visible: true,
    },
    {
      id: "deletion",
      title: "删除治理",
      description: "管理数据删除请求和删除证明",
      icon: Trash2,
      path: "/governance/deletion",
      visible: true,
    },
  ];

  const visibleCards = cards.filter((card) => card.visible);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">数据治理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理权限、数据保留、PII 脱敏和删除治理
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

export default Governance;
