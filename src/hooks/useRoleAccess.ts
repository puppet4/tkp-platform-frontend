import { useAuth } from "@/contexts/AuthContext";

const ROUTE_REQUIRED_ACTIONS: Record<string, string[]> = {
  "/": ["api.tenant.read"],
  "/resources": ["api.workspace.read"],
  "/search": ["api.retrieval.query"],
  "/chat": ["api.chat.completion"],
  "/chat/feedback": ["api.chat.completion"],
  "/agent": ["api.agent.run.read"],
  "/tenant": ["api.tenant.read"],
  "/ops": ["api.tenant.member.manage"],
  "/governance": ["api.tenant.read"],
  "/settings": ["api.user.read"],
};

export function useRoleAccess() {
  const { uiManifest } = useAuth();

  const tenantRole = uiManifest?.tenant_role || "viewer";
  const allowedActions = uiManifest?.allowed_actions || [];

  const hasPermission = (action: string) => allowedActions.includes(action);

  const canViewNav = (navPath: string) => {
    if (!uiManifest) return true; // Manifest not loaded yet, show all
    const menuItem = uiManifest.menus.find((m) => m.code === navPath || m.code === `menu.${navPath.replace(/^\//, "")}`);
    if (menuItem) return menuItem.allowed;

    const requiredActions = ROUTE_REQUIRED_ACTIONS[navPath] ?? [];
    if (requiredActions.length > 0) {
      return requiredActions.every((action) => allowedActions.includes(action));
    }

    return true; // Not in manifest and no explicit fallback rules
  };

  const canAction = (action: string) => hasPermission(action);

  const canButton = (code: string) => {
    if (!uiManifest) return true;
    const btn = uiManifest.buttons.find((b) => b.code === code);
    return btn ? btn.allowed : true;
  };

  const canFeature = (code: string) => {
    if (!uiManifest) return true;
    const feat = uiManifest.features.find((f) => f.code === code);
    return feat ? feat.allowed : true;
  };

  return { roleName: tenantRole, permissions: allowedActions, hasPermission, canViewNav, canAction, canButton, canFeature };
}
