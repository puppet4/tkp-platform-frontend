import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Tab = "profile" | "notifications" | "security" | "appearance" | "language";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [email] = useState(user?.email || "");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: "个人资料", icon: User },
    { id: "notifications", label: "通知偏好", icon: Bell },
    { id: "security", label: "安全设置", icon: Shield },
    { id: "appearance", label: "外观", icon: Palette },
    { id: "language", label: "语言与区域", icon: Globe },
  ];

  const handleSave = () => {
    toast({ title: "设置已保存", description: "您的偏好已更新" });
  };

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", t);
    toast({ title: `已切换到${t === "dark" ? "深色" : "浅色"}模式` });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-5">
          <SettingsIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">设置</h1>
            <p className="text-sm text-muted-foreground">管理您的账户与应用偏好</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="md:w-48 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                    tab === t.id ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}>
                  <t.icon className="h-4 w-4 shrink-0" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {tab === "profile" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">个人资料</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{user?.avatar_initial}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{user?.display_name}</div>
                    <div className="text-[12px] text-muted-foreground">{user?.email}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">显示名称</Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" value={email} disabled className="bg-secondary/50" />
                  <p className="text-[11px] text-muted-foreground">邮箱暂不支持修改</p>
                </div>
                <Button onClick={handleSave}>保存</Button>
              </div>
            )}

            {tab === "notifications" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">通知偏好</h2>
                {[
                  { label: "邮件通知", desc: "通过邮件接收系统通知", checked: notifyEmail, onChange: setNotifyEmail },
                  { label: "浏览器通知", desc: "通过浏览器推送接收通知", checked: notifyBrowser, onChange: setNotifyBrowser },
                  { label: "告警通知", desc: "接收运维告警和异常通知", checked: notifyAlerts, onChange: setNotifyAlerts },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-3 rounded-md border border-border">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                    </div>
                    <Switch checked={item.checked} onCheckedChange={item.onChange} />
                  </div>
                ))}
                <Button onClick={handleSave}>保存</Button>
              </div>
            )}

            {tab === "security" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">安全设置</h2>
                <div className="p-4 rounded-md border border-border">
                  <div className="text-sm font-medium text-foreground">修改密码</div>
                  <div className="text-[11px] text-muted-foreground mt-1">上次修改：30 天前</div>
                  <Button variant="outline" size="sm" className="mt-3"
                    onClick={() => toast({ title: "密码重置邮件已发送" })}>
                    重置密码
                  </Button>
                </div>
                <div className="p-4 rounded-md border border-border">
                  <div className="text-sm font-medium text-foreground">两步验证</div>
                  <div className="text-[11px] text-muted-foreground mt-1">增强账户安全性</div>
                  <Button variant="outline" size="sm" className="mt-3"
                    onClick={() => toast({ title: "功能开发中" })}>
                    启用 2FA
                  </Button>
                </div>
                <div className="p-4 rounded-md border border-border">
                  <div className="text-sm font-medium text-foreground">活跃会话</div>
                  <div className="text-[11px] text-muted-foreground mt-1">当前 1 个活跃会话</div>
                  <div className="mt-2 text-[12px] text-muted-foreground">Chrome · macOS · 当前会话</div>
                </div>
              </div>
            )}

            {tab === "appearance" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">外观设置</h2>
                <p className="text-sm text-muted-foreground">选择界面主题，也可通过顶部导航栏快速切换。</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => applyTheme("light")}
                    className={`p-4 rounded-lg border-2 bg-card text-center transition-colors ${
                      theme === "light" ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                    }`}>
                    <div className="text-2xl mb-1">☀️</div>
                    <div className="text-sm font-medium text-foreground">浅色模式</div>
                  </button>
                  <button onClick={() => applyTheme("dark")}
                    className={`p-4 rounded-lg border-2 bg-secondary text-center transition-colors ${
                      theme === "dark" ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                    }`}>
                    <div className="text-2xl mb-1">🌙</div>
                    <div className="text-sm font-medium text-foreground">深色模式</div>
                  </button>
                </div>
              </div>
            )}

            {tab === "language" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">语言与区域</h2>
                <div className="space-y-1.5">
                  <Label>界面语言</Label>
                  <Select defaultValue="zh-CN">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>时区</Label>
                  <Select defaultValue="Asia/Shanghai">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                      <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave}>保存</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
