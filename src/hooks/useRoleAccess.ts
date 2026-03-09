import { useAuth } from "@/contexts/AuthContext";

const ROUTE_REQUIRED_ACTIONS: Record<string, string[]> = {
  "/": ["api.tenant.read"],
  "/resources": ["api.workspace.read"],
  "/search": ["api.retrieval.query"],
  "/chat": ["api.chat.completion"],
  "/chat/feedback": ["api.chat.completion"],
  "/agent": ["api.agent.run.read"],
  "/tenant": ["api.tenant.delete"],
  "/ops": ["api.tenant.member.manage"],
  "/governance": ["api.governance.deletion.request.read"],
  "/settings": ["api.user.read"],
};

export function useRoleAccess() {
  const { uiManifest, currentTenant } = useAuth();

  const tenantRole = uiManifest?.tenant_role || currentTenant?.role || "viewer";
  const allowedActions = uiManifest?.allowed_actions || [];

  const hasPermission = (action: string) => allowedActions.includes(action);

  const canViewNav = (navPath: string) => {
    if (!uiManifest) return false; // Manifest not loaded, hide nav for safety
    const menuItem = uiManifest.menus.find((m) => m.code === navPath || m.code === `menu.${navPath.replace(/^\//, "")}`);
    if (menuItem) return menuItem.allowed;

    const requiredActions = ROUTE_REQUIRED_ACTIONS[navPath] ?? [];
    if (requiredActions.length > 0) {
      return requiredActions.every((action) => allowedActions.includes(action));
    }

    return false; // Unknown nav path defaults to deny
  };

  const canAction = (action: string) => hasPermission(action);

  const canButton = (code: string) => {
    if (!uiManifest) return false;
    const btn = uiManifest.buttons.find((b) => b.code === code);
    return btn ? btn.allowed : false;
  };

  const canFeature = (code: string) => {
    if (!uiManifest) return false;
    const feat = uiManifest.features.find((f) => f.code === code);
    return feat ? feat.allowed : false;
  };

  return { roleName: tenantRole, permissions: allowedActions, hasPermission, canViewNav, canAction, canButton, canFeature };
}
