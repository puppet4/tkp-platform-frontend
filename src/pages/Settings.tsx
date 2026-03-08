import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, setToken, usersApi, type UserPreferencesData } from "@/lib/api";
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, type LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "@tanstack/react-query";

type Tab = "profile" | "notifications" | "security" | "appearance" | "language";

type TabItem = { id: Tab; label: string; icon: LucideIcon };

type TwoFactorMode = "enable" | "disable";

const defaultPreferences: UserPreferencesData = {
  theme: "light",
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  notifications: {
    email: true,
    browser: true,
    alerts: true,
  },
  security: {
    password_reset_email: true,
    two_factor_enabled: false,
  },
};

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [email] = useState(user?.email || "");

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);

  const [passwordResetEmail, setPasswordResetEmail] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMode, setTwoFactorMode] = useState<TwoFactorMode | null>(null);
  const [twoFactorPassword, setTwoFactorPassword] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [language, setLanguage] = useState("zh-CN");
  const [timezone, setTimezone] = useState("Asia/Shanghai");

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ["user-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: () => usersApi.getPreferences(user!.id),
    retry: false,
  });

  useEffect(() => {
    setDisplayName(user?.display_name || "");
  }, [user?.display_name]);

  useEffect(() => {
    const merged = {
      ...defaultPreferences,
      ...preferences,
      notifications: {
        ...defaultPreferences.notifications,
        ...(preferences?.notifications || {}),
      },
      security: {
        ...defaultPreferences.security,
        ...(preferences?.security || {}),
      },
    };

    setNotifyEmail(Boolean(merged.notifications.email));
    setNotifyBrowser(Boolean(merged.notifications.browser));
    setNotifyAlerts(Boolean(merged.notifications.alerts));

    setPasswordResetEmail(Boolean(merged.security?.password_reset_email));
    setTwoFactorEnabled(Boolean(merged.security?.two_factor_enabled));

    setTheme(merged.theme);
    setLanguage(merged.language || "zh-CN");
    setTimezone(merged.timezone || "Asia/Shanghai");

    if (merged.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [preferences]);

  const updateProfileMutation = useMutation({
    mutationFn: ({ userId, name }: { userId: string; name: string }) => usersApi.update(userId, { display_name: name }),
    onSuccess: () => toast({ title: "个人资料已更新" }),
    onError: (e: Error) => toast({ title: "保存失败", description: e.message, variant: "destructive" }),
  });

  const savePreferencesMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserPreferencesData }) =>
      usersApi.upsertPreferences(userId, payload),
    onSuccess: () => toast({ title: "设置已保存", description: "您的偏好已更新" }),
    onError: (e: Error) => toast({ title: "保存失败", description: e.message, variant: "destructive" }),
  });

  const tabs: TabItem[] = [
    { id: "profile", label: "个人资料", icon: User },
    { id: "notifications", label: "通知偏好", icon: Bell },
    { id: "security", label: "安全设置", icon: Shield },
    { id: "appearance", label: "外观", icon: Palette },
    { id: "language", label: "语言与区域", icon: Globe },
  ];

  const buildPreferencesPayload = (overrideTwoFactor?: boolean): UserPreferencesData => ({
    theme,
    language,
    timezone,
    notifications: {
      email: notifyEmail,
      browser: notifyBrowser,
      alerts: notifyAlerts,
    },
    security: {
      password_reset_email: passwordResetEmail,
      two_factor_enabled: overrideTwoFactor ?? twoFactorEnabled,
    },
  });

  const savePreferences = () => {
    if (!user?.id) return;
    savePreferencesMutation.mutate({ userId: user.id, payload: buildPreferencesPayload() });
  };

  const handleSaveProfile = () => {
    if (!user?.id || !displayName.trim()) {
      toast({ title: "显示名称不能为空", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({ userId: user.id, name: displayName.trim() });
  };

  const applyTheme = (t: "light" | "dark") => {
    setTheme(t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const startTwoFactorFlow = (mode: TwoFactorMode) => {
    setTwoFactorMode(mode);
    setTwoFactorPassword("");
  };

  const cancelTwoFactorFlow = () => {
    setTwoFactorMode(null);
    setTwoFactorPassword("");
  };

  const confirmTwoFactorFlow = async () => {
    if (!twoFactorMode || !user?.id) return;
    if (!user.email || !twoFactorPassword.trim()) {
      toast({ title: "请输入当前密码", variant: "destructive" });
      return;
    }

    try {
      // Re-authenticate with backend before changing security settings.
      const authData = await authApi.login(user.email, twoFactorPassword);
      setToken(authData.access_token);
    } catch (e) {
      toast({ title: "身份验证失败", description: (e as Error).message, variant: "destructive" });
      return;
    }

    const nextEnabled = twoFactorMode === "enable";
    savePreferencesMutation.mutate(
      {
        userId: user.id,
        payload: buildPreferencesPayload(nextEnabled),
      },
      {
        onSuccess: () => {
          setTwoFactorEnabled(nextEnabled);
          toast({ title: nextEnabled ? "2FA 已启用" : "2FA 已停用" });
          cancelTwoFactorFlow();
        },
        onError: (e: Error) => {
          toast({ title: "2FA 状态保存失败", description: e.message, variant: "destructive" });
        },
      },
    );
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

        {prefsLoading && <div className="text-sm text-muted-foreground mb-4">正在加载偏好设置...</div>}

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-48 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                    tab === t.id ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {tab === "profile" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">个人资料</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">{user?.avatar_initial}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{displayName || user?.display_name}</div>
                    <div className="text-[12px] text-muted-foreground">{user?.email}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">显示名称</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">邮箱</Label>
                  <Input id="email" value={email} disabled className="bg-secondary/50" />
                  <p className="text-[11px] text-muted-foreground">邮箱暂不支持修改</p>
                </div>
                <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            )}

            {tab === "notifications" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">通知偏好</h2>
                {[
                  { label: "邮件通知", desc: "通过邮件接收系统通知", checked: notifyEmail, onChange: setNotifyEmail },
                  { label: "浏览器通知", desc: "通过浏览器推送接收通知", checked: notifyBrowser, onChange: setNotifyBrowser },
                  { label: "告警通知", desc: "接收运维告警和异常通知", checked: notifyAlerts, onChange: setNotifyAlerts },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-3 rounded-md border border-border">
                    <div>
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                    </div>
                    <Switch checked={item.checked} onCheckedChange={item.onChange} />
                  </div>
                ))}
                <Button onClick={savePreferences} disabled={savePreferencesMutation.isPending}>
                  {savePreferencesMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            )}

            {tab === "security" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">安全设置</h2>
                <div className="flex items-center justify-between px-3 py-3 rounded-md border border-border">
                  <div>
                    <div className="text-sm font-medium text-foreground">密码重置提醒</div>
                    <div className="text-[11px] text-muted-foreground">在关键风险操作后发送密码重置提醒</div>
                  </div>
                  <Switch checked={passwordResetEmail} onCheckedChange={setPasswordResetEmail} />
                </div>

                <div className="px-3 py-3 rounded-md border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">双因素认证（2FA）</div>
                      <div className="text-[11px] text-muted-foreground">
                        当前状态：{twoFactorEnabled ? "已启用" : "未启用"}
                      </div>
                    </div>
                    {twoFactorEnabled ? (
                      <Button variant="outline" onClick={() => startTwoFactorFlow("disable")}>停用 2FA</Button>
                    ) : (
                      <Button onClick={() => startTwoFactorFlow("enable")}>启用 2FA</Button>
                    )}
                  </div>

                  {twoFactorMode && (
                    <div className="p-3 rounded-md bg-secondary/50 border border-border space-y-2">
                      <div className="text-[12px] text-foreground">
                        {twoFactorMode === "enable" ? "启用" : "停用"}验证进行中，请输入当前登录密码完成后端校验
                      </div>
                      <Input
                        type="password"
                        value={twoFactorPassword}
                        onChange={(e) => setTwoFactorPassword(e.target.value)}
                        placeholder="输入当前密码"
                      />
                      <div className="flex items-center gap-2">
                        <Button onClick={confirmTwoFactorFlow} disabled={!twoFactorPassword.trim() || savePreferencesMutation.isPending}>
                          确认
                        </Button>
                        <Button variant="outline" onClick={cancelTwoFactorFlow}>取消</Button>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={savePreferences} disabled={savePreferencesMutation.isPending}>
                  {savePreferencesMutation.isPending ? "保存中..." : "保存安全设置"}
                </Button>
              </div>
            )}

            {tab === "appearance" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">外观设置</h2>
                <p className="text-sm text-muted-foreground">选择界面主题，也可通过顶部导航栏快速切换。</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => applyTheme("light")}
                    className={`p-4 rounded-lg border-2 bg-card text-center transition-colors ${
                      theme === "light" ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="text-2xl mb-1">☀️</div>
                    <div className="text-sm font-medium text-foreground">浅色模式</div>
                  </button>
                  <button
                    onClick={() => applyTheme("dark")}
                    className={`p-4 rounded-lg border-2 bg-secondary text-center transition-colors ${
                      theme === "dark" ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="text-2xl mb-1">🌙</div>
                    <div className="text-sm font-medium text-foreground">深色模式</div>
                  </button>
                </div>
                <Button onClick={savePreferences} disabled={savePreferencesMutation.isPending}>
                  {savePreferencesMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            )}

            {tab === "language" && (
              <div className="bg-card rounded-lg border border-border p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-semibold text-foreground">语言与区域</h2>
                <div className="space-y-1.5">
                  <Label>界面语言</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>时区</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                      <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (UTC-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={savePreferences} disabled={savePreferencesMutation.isPending}>
                  {savePreferencesMutation.isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
