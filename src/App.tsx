import { Suspense, lazy, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Resources = lazy(() => import("./pages/Resources"));
const Workspaces = lazy(() => import("./pages/Workspaces"));
const WorkspaceDetail = lazy(() => import("./pages/WorkspaceDetail"));
const KnowledgeBaseDetail = lazy(() => import("./pages/KnowledgeBaseDetail"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Chat = lazy(() => import("./pages/Chat"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Governance = lazy(() => import("./pages/Governance"));
const GovernancePermissions = lazy(() => import("./pages/governance/Permissions"));
const GovernanceRetention = lazy(() => import("./pages/governance/Retention"));
const GovernancePII = lazy(() => import("./pages/governance/PII"));
const GovernanceDeletion = lazy(() => import("./pages/governance/Deletion"));
const OpsCenter = lazy(() => import("./pages/OpsCenter"));
const OpsCenterNav = lazy(() => import("./pages/OpsCenterNav"));
const OpsOverview = lazy(() => import("./pages/ops/Overview"));
const OpsMonitoring = lazy(() => import("./pages/ops/Monitoring"));
const OpsIncidents = lazy(() => import("./pages/ops/Incidents"));
const OpsQuality = lazy(() => import("./pages/ops/Quality"));
const OpsQuotas = lazy(() => import("./pages/ops/Quotas"));
const OpsReleases = lazy(() => import("./pages/ops/Releases"));
const AgentRuns = lazy(() => import("./pages/AgentRuns"));
const Settings = lazy(() => import("./pages/Settings"));
const TenantAdmin = lazy(() => import("./pages/TenantAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Forbidden = lazy(() => import("./pages/Forbidden"));

const queryClient = new QueryClient();

function PageFallback() {
  return <div className="min-h-screen flex items-center justify-center text-muted-foreground">页面加载中…</div>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children, requiredRole = "admin" }: { children: ReactNode; requiredRole?: "admin" | "owner" }) {
  const { isAuthenticated, loading, uiManifest, currentTenant } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const tenantRole = uiManifest?.tenant_role || currentTenant?.role || "viewer";

  // owner 可以访问所有页面
  if (tenantRole === "owner") return <>{children}</>;

  // 检查是否满足所需角色
  if (requiredRole === "admin" && tenantRole === "admin") return <>{children}</>;

  // 权限不足，跳转到403页面
  return <Navigate to="/403" replace />;
}

function ActionRoute({
  children,
  allOf = [],
  anyOf = [],
}: {
  children: ReactNode;
  allOf?: string[];
  anyOf?: string[];
}) {
  const { isAuthenticated, loading, uiManifest } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!uiManifest) return <Navigate to="/403" replace />;

  const allowed = new Set(uiManifest.allowed_actions || []);
  const passAll = allOf.every((action) => allowed.has(action));
  const passAny = anyOf.length === 0 || anyOf.some((action) => allowed.has(action));

  if (passAll && passAny) return <>{children}</>;
  return <Navigate to="/403" replace />;
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

        {/* Resources - 保留旧路由兼容 */}
        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />

        {/* Workspaces - 新的独立路由 */}
        <Route path="/workspaces" element={<ProtectedRoute><Workspaces /></ProtectedRoute>} />
        <Route path="/workspaces/:workspaceId" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
        <Route path="/knowledge-bases/:kbId" element={<ProtectedRoute><KnowledgeBaseDetail /></ProtectedRoute>} />

        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/chat/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

        {/* Governance - 按动作权限控制访问 */}
        <Route path="/governance" element={<ActionRoute anyOf={[
          "api.governance.deletion.request.read",
          "api.governance.deletion.request.create",
          "api.governance.deletion.request.review",
          "api.governance.deletion.execute",
          "api.governance.retention.cleanup",
          "api.governance.pii.mask",
          "api.tenant.member.manage",
        ]}><Governance /></ActionRoute>} />
        <Route path="/governance/permissions" element={<ActionRoute allOf={["api.tenant.member.manage"]}><GovernancePermissions /></ActionRoute>} />
        <Route path="/governance/retention" element={<ActionRoute allOf={["api.governance.retention.cleanup"]}><GovernanceRetention /></ActionRoute>} />
        <Route path="/governance/pii" element={<ActionRoute allOf={["api.governance.pii.mask"]}><GovernancePII /></ActionRoute>} />
        <Route path="/governance/deletion" element={<ActionRoute allOf={["api.governance.deletion.request.read"]}><GovernanceDeletion /></ActionRoute>} />

        {/* Ops - 需要 admin 权限 */}
        <Route path="/ops" element={<AdminRoute><OpsCenterNav /></AdminRoute>} />
        <Route path="/ops/overview" element={<AdminRoute><OpsOverview /></AdminRoute>} />
        <Route path="/ops/monitoring" element={<AdminRoute><OpsMonitoring /></AdminRoute>} />
        <Route path="/ops/incidents" element={<AdminRoute><OpsIncidents /></AdminRoute>} />
        <Route path="/ops/quality" element={<AdminRoute><OpsQuality /></AdminRoute>} />
        <Route path="/ops/quotas" element={<AdminRoute><OpsQuotas /></AdminRoute>} />
        <Route path="/ops/releases" element={<AdminRoute><OpsReleases /></AdminRoute>} />

        <Route path="/agent" element={<ProtectedRoute><AgentRuns /></ProtectedRoute>} />
        <Route path="/tenant" element={<AdminRoute requiredRole="owner"><TenantAdmin /></AdminRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
