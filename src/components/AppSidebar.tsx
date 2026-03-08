import {
  LayoutDashboard,
  FolderTree,
  Search,
  MessageSquare,
  Shield,
  Activity,
  Settings,
  BookOpen,
  MessageCircle,
  Bot,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAuth } from "@/contexts/AuthContext";

const mainNav = [
  { title: "工作台", url: "/", icon: LayoutDashboard },
  { title: "资源中心", url: "/resources", icon: FolderTree },
  { title: "检索", url: "/search", icon: Search },
  { title: "对话", url: "/chat", icon: MessageSquare },
  { title: "反馈", url: "/chat/feedback", icon: MessageCircle },
];

const adminNav = [
  { title: "权限与治理", url: "/governance", icon: Shield },
  { title: "运营中心", url: "/ops", icon: Activity },
  { title: "Agent 任务", url: "/agent", icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { canViewNav } = useRoleAccess();
  const { user } = useAuth();

  const visibleMain = mainNav.filter(item => canViewNav(item.url));
  const visibleAdmin = adminNav.filter(item => canViewNav(item.url));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate tracking-tight">TKP</h2>
              <p className="text-[10px] text-muted-foreground truncate">知识管理平台</p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3">
            主导航
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50 transition-all duration-150 rounded-lg group"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-xs"
                    >
                      <item.icon className="mr-2.5 h-4 w-4 shrink-0 transition-colors" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3">
              管控
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50 transition-all duration-150 rounded-lg"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-xs"
                      >
                        <item.icon className="mr-2.5 h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/25 to-accent/15 flex items-center justify-center ring-1 ring-primary/10 shrink-0">
              <span className="text-[10px] font-semibold text-primary">{user.avatar_initial}</span>
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-foreground truncate">{user.display_name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                className="hover:bg-sidebar-accent/50 transition-all duration-150 rounded-lg"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-xs"
              >
                <Settings className="mr-2.5 h-4 w-4 shrink-0" />
                {!collapsed && <span>设置</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
