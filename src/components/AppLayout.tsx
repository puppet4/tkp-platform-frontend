import { ReactNode, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Bell, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, currentTenant, availableTenants, switchTenant, logout } = useAuth();
  const [globalSearch, setGlobalSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="hover:bg-secondary/80 transition-colors rounded-lg" />

              {/* Tenant Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <span className="h-6 w-6 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/10">
                      {currentTenant?.name.charAt(0)}
                    </span>
                    <span className="hidden sm:inline">{currentTenant?.name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">切换租户</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {availableTenants.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => { switchTenant(t.id); }}
                      className={`gap-2.5 py-2.5 ${t.id === currentTenant?.id ? "bg-primary/5 text-primary" : ""}`}
                    >
                      <span className="h-7 w-7 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[10px] font-bold flex items-center justify-center border border-primary/10 shrink-0">
                        {t.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground">{t.role}</div>
                      </div>
                      {t.status !== "active" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">已暂停</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Global Search */}
              <form onSubmit={handleGlobalSearch} className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  placeholder="搜索文档、知识库..."
                  className="h-9 w-64 rounded-xl border border-border bg-secondary/40 pl-9 pr-12 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-card transition-all duration-200"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 font-mono bg-secondary/60 px-1.5 py-0.5 rounded border border-border">⌘K</kbd>
              </form>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button className="relative p-2 rounded-lg hover:bg-secondary/80 transition-all duration-150">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
              </button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-secondary/80 transition-all duration-150 ml-1 focus:outline-none focus:ring-2 focus:ring-ring/30">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center ring-2 ring-primary/10">
                      <span className="text-xs font-semibold text-primary">{user?.avatar_initial}</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="py-3">
                    <div className="text-sm font-semibold text-foreground">{user?.display_name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-normal">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2.5">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    设置
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="gap-2.5 text-destructive focus:text-destructive">
                    <LogOut className="h-3.5 w-3.5" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <CommandPalette />
    </SidebarProvider>
  );
}
