import { Suspense, lazy, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Resources = lazy(() => import("./pages/Resources"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Chat = lazy(() => import("./pages/Chat"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Governance = lazy(() => import("./pages/Governance"));
const OpsCenter = lazy(() => import("./pages/OpsCenter"));
const AgentRuns = lazy(() => import("./pages/AgentRuns"));
const Settings = lazy(() => import("./pages/Settings"));
const TenantAdmin = lazy(() => import("./pages/TenantAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/chat/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/governance" element={<ProtectedRoute><Governance /></ProtectedRoute>} />
        <Route path="/ops" element={<ProtectedRoute><OpsCenter /></ProtectedRoute>} />
        <Route path="/agent" element={<ProtectedRoute><AgentRuns /></ProtectedRoute>} />
        <Route path="/tenant" element={<ProtectedRoute><TenantAdmin /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
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
);

export default App;
