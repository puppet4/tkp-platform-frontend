import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderTree,
  Search,
  MessageSquare,
  Shield,
  Activity,
  Settings,
  Bot,
  MessageCircle,
  FileText,
  Database,
} from "lucide-react";

const pages = [
  { name: "工作台", url: "/", icon: LayoutDashboard, keywords: "dashboard home 首页" },
  { name: "资源中心", url: "/resources", icon: FolderTree, keywords: "resources 文档 知识库 workspace" },
  { name: "检索", url: "/search", icon: Search, keywords: "search 搜索 查询" },
  { name: "对话", url: "/chat", icon: MessageSquare, keywords: "chat AI 聊天 问答" },
  { name: "反馈", url: "/chat/feedback", icon: MessageCircle, keywords: "feedback 评价 意见" },
  { name: "权限与治理", url: "/governance", icon: Shield, keywords: "governance 权限 角色 RBAC 策略" },
  { name: "运营中心", url: "/ops", icon: Activity, keywords: "ops 运维 监控 告警" },
  { name: "Agent 任务", url: "/agent", icon: Bot, keywords: "agent 自动化 任务" },
  { name: "设置", url: "/settings", icon: Settings, keywords: "settings 个人 通知 安全" },
];

const quickActions = [
  { name: "新建文档", url: "/resources", icon: FileText, keywords: "create new document 上传" },
  { name: "创建知识库", url: "/resources", icon: Database, keywords: "create knowledge base" },
  { name: "开始 AI 对话", url: "/chat", icon: MessageSquare, keywords: "start chat 提问" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (url: string) => {
    setOpen(false);
    navigate(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索页面或操作..." />
      <CommandList>
        <CommandEmpty>未找到相关结果</CommandEmpty>
        <CommandGroup heading="页面导航">
          {pages.map(page => (
            <CommandItem
              key={page.url}
              value={`${page.name} ${page.keywords}`}
              onSelect={() => handleSelect(page.url)}
              className="gap-2.5"
            >
              <page.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="快捷操作">
          {quickActions.map(action => (
            <CommandItem
              key={action.name}
              value={`${action.name} ${action.keywords}`}
              onSelect={() => handleSelect(action.url)}
              className="gap-2.5"
            >
              <action.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{action.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
