import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  authApi,
  permissionsApi,
  setToken,
  clearToken,
  getToken,
  type AuthUserProfile,
  type TenantAccessItem,
  type WorkspaceAccessItem,
  type PermissionUIManifestData,
  type ApiError,
} from "@/lib/api";

// ─── Adapt user shape for existing UI ────────────────────────────
export interface AppUser {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_initial: string;
}

function toAppUser(p: AuthUserProfile): AppUser {
  return {
    id: p.id,
    username: p.email.split("@")[0],
    email: p.email,
    display_name: p.display_name,
    avatar_initial: p.display_name.charAt(0),
  };
}

// ─── Adapt tenant shape ──────────────────────────────────────────
export interface AppTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

function toAppTenant(t: TenantAccessItem): AppTenant {
  return { id: t.tenant_id, name: t.name, slug: t.slug, status: t.status, role: t.role };
}

// ─── Context ─────────────────────────────────────────────────────
interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  currentTenant: AppTenant | null;
  availableTenants: AppTenant[];
  workspaces: WorkspaceAccessItem[];
  uiManifest: PermissionUIManifestData | null;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  completeMfaLogin: (challengeToken: string, payload: { otp_code?: string; backup_code?: string }) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [tenants, setTenants] = useState<AppTenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceAccessItem[]>([]);
  const [uiManifest, setUiManifest] = useState<PermissionUIManifestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshPermissions = useCallback(async () => {
    // Prevent concurrent refresh requests
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const manifest = await permissionsApi.uiManifest();
      setUiManifest(manifest);
    } catch (error) {
      // Log permission refresh failures for debugging
      console.warn("Failed to refresh permissions:", error);
      // Don't clear user session on permission refresh failure
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  // Fetch /auth/me + /permissions/ui-manifest
  const fetchIdentity = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(toAppUser(me.user));
      const mapped = me.tenants.map(toAppTenant);
      setTenants(mapped);
      setWorkspaces(me.workspaces);

      // Set current tenant from first active tenant if not already set
      if (mapped.length > 0) {
        const active = mapped.find((t) => t.status === "active") || mapped[0];
        setCurrentTenantId((prev) => prev || active.id);
      }

      // Fetch UI manifest for permission-driven UI
      await refreshPermissions();
    } catch {
      // Token invalid / expired
      clearToken();
      setUser(null);
    }
  }, [refreshPermissions]);

  // On mount: try to restore session from token
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchIdentity().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchIdentity]);

  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(() => {
      refreshPermissions().catch(() => undefined);
    }, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshPermissions().catch(() => undefined);
      }
    };

    const onFocus = () => {
      refreshPermissions().catch(() => undefined);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, refreshPermissions]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.access_token);
    if (data.tenant_id) setCurrentTenantId(data.tenant_id);
    await fetchIdentity();
  };

  const completeMfaLogin = async (challengeToken: string, payload: { otp_code?: string; backup_code?: string }) => {
    const data = await authApi.loginMfa(challengeToken, payload);
    setToken(data.access_token);
    if (data.tenant_id) setCurrentTenantId(data.tenant_id);
    await fetchIdentity();
  };

  const register = async (email: string, password: string, displayName?: string) => {
    await authApi.register(email, password, displayName);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
    setTenants([]);
    setWorkspaces([]);
    setUiManifest(null);
    setCurrentTenantId(null);
  };

  const switchTenant = async (tenantId: string) => {
    const data = await authApi.switchTenant(tenantId);
    setToken(data.access_token);
    setCurrentTenantId(tenantId);
    // Re-fetch identity & permissions under new tenant context
    await fetchIdentity();
  };

  const currentTenant = tenants.find((t) => t.id === currentTenantId) || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        currentTenant,
        availableTenants: tenants,
        workspaces,
        uiManifest,
        loading,
        refreshPermissions,
        login,
        completeMfaLogin,
        register,
        logout,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
