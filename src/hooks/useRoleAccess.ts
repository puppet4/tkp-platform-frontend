import { useAuth } from "@/contexts/AuthContext";

export function useRoleAccess() {
  const { uiManifest } = useAuth();

  const tenantRole = uiManifest?.tenant_role || "viewer";
  const allowedActions = uiManifest?.allowed_actions || [];

  const hasPermission = (action: string) => allowedActions.includes(action);

  const canViewNav = (navPath: string) => {
    if (!uiManifest) return true; // Manifest not loaded yet, show all
    const menuItem = uiManifest.menus.find((m) => m.code === navPath || m.code === `menu.${navPath.replace(/^\//, "")}`);
    if (!menuItem) return true; // Not in manifest → show by default
    return menuItem.allowed;
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
