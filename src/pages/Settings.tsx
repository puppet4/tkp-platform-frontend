import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Palette, Settings as SettingsIcon, Shield, User, Bell, type LucideIcon } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { authApi, usersApi, type UserPreferencesData } from "@/lib/api";

type Tab = "profile" | "notifications" | "security" | "appearance" | "language";
type TabItem = { id: Tab; label: string; icon: LucideIcon };

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

const tabs: TabItem[] = [
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知偏好", icon: Bell },
  { id: "security", label: "安全设置", icon: Shield },
  { id: "appearance", label: "外观", icon: Palette },
  { id: "language", label: "语言与区域", icon: Globe },
];

const Settings = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [email] = useState(user?.email || "");

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyBrowser, setNotifyBrowser] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);

  const [passwordResetEmail, setPasswordResetEmail] = useState(true);

  const [theme, setTheme] = useState<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [language, setLanguage] = useState("zh-CN");
  const [timezone, setTimezone] = useState("Asia/Shanghai");

  const [setupPassword, setSetupPassword] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [enableCode, setEnableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableUseBackup, setDisableUseBackup] = useState(false);
  const [disableOtpCode, setDisableOtpCode] = useState("");
  const [disableBackupCode, setDisableBackupCode] = useState("");

  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ["user-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: () => usersApi.getPreferences(user!.id),
    retry: false,
  });

  const { data: mfaStatus, isLoading: mfaLoading } = useQuery({
    queryKey: ["mfa-totp-status", user?.id],
    enabled: !!user?.id,
    queryFn: () => authApi.mfaTotpStatus(),
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

    setTheme(merged.theme);
    setLanguage(merged.language || "zh-CN");
    setTimezone(merged.timezone || "Asia/Shanghai");

    if (merged.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [preferences]);

  const updateProfileMutation = useMutation({
    mutationFn: ({ userId, name }: { userId: string; name: string }) => usersApi.update(userId, { display_name: name }),
    onSuccess: () => toast({ title: "个人资料已更新" }),
    onError: (error: Error) => toast({ title: "保存失败", description: error.message, variant: "destructive" }),
  });

  const savePreferencesMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserPreferencesData }) =>
      usersApi.upsertPreferences(userId, payload),
    onSuccess: () => toast({ title: "设置已保存", description: "您的偏好已更新" }),
    onError: (error: Error) => toast({ title: "保存失败", description: error.message, variant: "destructive" }),
  });

  const setupTotpMutation = useMutation({
    mutationFn: (password: string) => authApi.mfaTotpSetup(password),
    onSuccess: (data) => {
      setTotpSecret(data.secret);
      setTotpUri(data.otpauth_uri);
      setEnableCode("");
      setBackupCodes([]);
      toast({ title: "验证器初始化完成", description: "请在认证器中添加密钥并输入 6 位动态码启用" });
    },
    onError: (error: Error) => toast({ title: "初始化失败", description: error.message, variant: "destructive" }),
  });

  const enableTotpMutation = useMutation({
    mutationFn: (code: string) => authApi.mfaTotpEnable(code),
    onSuccess: async (data) => {
      setBackupCodes(data.backup_codes || []);
      setSetupPassword("");
      setEnableCode("");
      await qc.invalidateQueries({ queryKey: ["mfa-totp-status"] });
      toast({ title: "TOTP 已启用", description: "请妥善保存恢复码" });
    },
    onError: (error: Error) => toast({ title: "启用失败", description: error.message, variant: "destructive" }),
  });

  const disableTotpMutation = useMutation({
    mutationFn: (payload: { password: string; otp_code?: string; backup_code?: string }) => authApi.mfaTotpDisable(payload),
    onSuccess: async () => {
      setDisablePassword("");
      setDisableOtpCode("");
      setDisableBackupCode("");
      setDisableUseBackup(false);
      setTotpSecret("");
      setTotpUri("");
      setBackupCodes([]);
      await qc.invalidateQueries({ queryKey: ["mfa-totp-status"] });
      toast({ title: "TOTP 已停用" });
    },
    onError: (error: Error) => toast({ title: "停用失败", description: error.message, variant: "destructive" }),
  });

  const twoFactorEnabled = Boolean(mfaStatus?.enabled);

  const effectiveTwoFactorFlag = useMemo(
    () => (mfaStatus?.enabled ?? preferences?.security?.two_factor_enabled ?? false),
    [mfaStatus?.enabled, preferences?.security?.two_factor_enabled],
  );

  const buildPreferencesPayload = (): UserPreferencesData => ({
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
      two_factor_enabled: Boolean(effectiveTwoFactorFlag),
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

  const applyTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    if (nextTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
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

        {(prefsLoading || mfaLoading) && <div className="text-sm text-muted-foreground mb-4">正在加载设置...</div>}

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-48 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
                    tab === item.id
                      ? "bg-primary/5 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
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
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">双因素认证（TOTP）</div>
                      <div className="text-[11px] text-muted-foreground">
                        当前状态：{twoFactorEnabled ? "已启用" : mfaStatus?.enrolled ? "已绑定未启用" : "未初始化"}
                        {typeof mfaStatus?.backup_codes_remaining === "number" && (
                          <span className="ml-2">恢复码剩余：{mfaStatus.backup_codes_remaining}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!twoFactorEnabled && (
                    <div className="space-y-3 border border-border rounded-md p-3 bg-secondary/20">
                      <div className="text-[12px] text-foreground font-medium">1) 初始化验证器</div>
                      <Input
                        type="password"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="输入当前登录密码"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setupTotpMutation.mutate(setupPassword.trim())}
                        disabled={!setupPassword.trim() || setupTotpMutation.isPending}
                      >
                        {setupTotpMutation.isPending ? "初始化中..." : "初始化 TOTP"}
                      </Button>

                      {totpSecret && (
                        <div className="space-y-2 p-3 rounded-md border border-border bg-card">
                          <div className="text-[12px] text-muted-foreground">请把以下密钥添加到认证器 App：</div>
                          <code className="block text-xs break-all font-mono text-foreground">{totpSecret}</code>
                          <div className="text-[11px] text-muted-foreground break-all">{totpUri}</div>
                          <div className="pt-1">
                            <Label className="text-[12px]">2) 输入认证器 6 位动态码以启用</Label>
                            <Input
                              value={enableCode}
                              onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="6 位动态码"
                              className="mt-1"
                            />
                            <Button
                              className="mt-2"
                              onClick={() => enableTotpMutation.mutate(enableCode)}
                              disabled={enableCode.length !== 6 || enableTotpMutation.isPending}
                            >
                              {enableTotpMutation.isPending ? "启用中..." : "启用 TOTP"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {backupCodes.length > 0 && (
                        <div className="space-y-2 p-3 rounded-md border border-warning/30 bg-warning/5">
                          <div className="text-[12px] font-medium text-foreground">恢复码（仅展示一次，请保存）</div>
                          <div className="grid sm:grid-cols-2 gap-1.5">
                            {backupCodes.map((item) => (
                              <code key={item} className="text-[11px] px-2 py-1 rounded bg-card border border-border font-mono">
                                {item}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {twoFactorEnabled && (
                    <div className="space-y-3 border border-border rounded-md p-3 bg-secondary/20">
                      <div className="text-[12px] text-foreground font-medium">停用 TOTP</div>
                      <Input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="输入当前登录密码"
                      />

                      <div className="flex items-center gap-2 text-[12px]">
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded border ${disableUseBackup ? "border-border" : "border-primary text-primary"}`}
                          onClick={() => setDisableUseBackup(false)}
                        >
                          动态码
                        </button>
                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded border ${disableUseBackup ? "border-primary text-primary" : "border-border"}`}
                          onClick={() => setDisableUseBackup(true)}
                        >
                          恢复码
                        </button>
                      </div>

                      {disableUseBackup ? (
                        <Input
                          value={disableBackupCode}
                          onChange={(e) => setDisableBackupCode(e.target.value.toUpperCase())}
                          placeholder="输入恢复码，如 ABCD-EFGH"
                        />
                      ) : (
                        <Input
                          value={disableOtpCode}
                          onChange={(e) => setDisableOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="输入 6 位动态码"
                        />
                      )}

                      <Button
                        variant="destructive"
                        onClick={() =>
                          disableTotpMutation.mutate({
                            password: disablePassword.trim(),
                            otp_code: disableUseBackup ? undefined : disableOtpCode,
                            backup_code: disableUseBackup ? disableBackupCode.trim() : undefined,
                          })
                        }
                        disabled={
                          !disablePassword.trim() ||
                          (disableUseBackup ? !disableBackupCode.trim() : disableOtpCode.length !== 6) ||
                          disableTotpMutation.isPending
                        }
                      >
                        {disableTotpMutation.isPending ? "停用中..." : "停用 TOTP"}
                      </Button>
                    </div>
                  )}
                </div>

                <Button onClick={savePreferences} disabled={savePreferencesMutation.isPending}>
                  {savePreferencesMutation.isPending ? "保存中..." : "保存安全偏好"}
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>时区</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
