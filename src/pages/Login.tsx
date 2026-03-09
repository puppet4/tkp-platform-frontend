import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError } from "@/lib/api";

const Login = () => {
  const { login, completeMfaLogin, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [mfaChallengeToken, setMfaChallengeToken] = useState<string | null>(null);
  const [mfaOtpCode, setMfaOtpCode] = useState("");
  const [mfaBackupCode, setMfaBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "请输入邮箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "邮箱格式不正确";
    if (!password) errs.password = "请输入密码";
    else if (password.length < 8) errs.password = "密码至少 8 位";
    if (!isLogin) {
      if (!confirmPwd) errs.confirmPwd = "请确认密码";
      else if (confirmPwd !== password) errs.confirmPwd = "两次密码不一致";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin && mfaChallengeToken) {
      const errs: Record<string, string> = {};
      if (useBackupCode) {
        if (!mfaBackupCode.trim()) errs.mfaBackupCode = "请输入恢复码";
      } else if (!/^\d{6}$/.test(mfaOtpCode)) {
        errs.mfaOtpCode = "请输入 6 位动态码";
      }
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
    } else if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        if (mfaChallengeToken) {
          await completeMfaLogin(
            mfaChallengeToken,
            useBackupCode ? { backup_code: mfaBackupCode.trim() } : { otp_code: mfaOtpCode.trim() },
          );
          navigate("/");
        } else {
          await login(email, password);
          navigate("/");
        }
      } else {
        await register(email, password, displayName || undefined);
        toast({ title: "注册成功", description: "请使用新账号登录" });
        setIsLogin(true);
        setDisplayName("");
        setConfirmPwd("");
      }
    } catch (err) {
      if (err instanceof ApiError && isLogin) {
        const body = err.body as
          | {
              error?: { code?: string; details?: Record<string, unknown> };
              code?: string;
              details?: Record<string, unknown>;
            }
          | undefined;
        const errorCode = err.code || body?.error?.code || body?.code;
        const details = body?.error?.details || body?.details || {};
        const challenge = typeof details.challenge_token === "string" ? details.challenge_token : "";
        if (errorCode === "LOGIN_MFA_REQUIRED" && challenge) {
          setMfaChallengeToken(challenge);
          setMfaOtpCode("");
          setMfaBackupCode("");
          setUseBackupCode(false);
          setErrors({});
          toast({ title: "需要二次验证", description: "请输入验证器动态码或恢复码完成登录" });
        } else {
          toast({ title: isLogin ? "登录失败" : "注册失败", description: err.message, variant: "destructive" });
        }
      } else {
        const msg = err instanceof ApiError ? err.message : "操作失败，请稍后重试";
        toast({ title: isLogin ? "登录失败" : "注册失败", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full h-10 rounded-xl border ${errors[field] ? "border-destructive" : "border-border/60"} bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200`;

  const formVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-3xl" />
      </div>

      <div className="hidden lg:flex lg:w-[45%] items-center justify-center p-12 relative z-10">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">TKP</h1>
              <p className="text-sm text-muted-foreground">知识平台</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4 leading-tight tracking-tight">
            多租户企业级<br />知识管理平台
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            集成文档管理、智能检索、AI 对话、权限治理与运维监控，为团队提供一站式知识协作体验。
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              { n: "90+", l: "API 接口" },
              { n: "RAG", l: "智能检索" },
              { n: "RBAC", l: "权限管控" },
              { n: "多租户", l: "数据隔离" },
            ].map((s) => (
              <div key={s.l} className="bg-card rounded-xl p-4 shadow-xs border border-border/50">
                <div className="text-lg font-bold text-primary">{s.n}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">TKP 知识平台</span>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div key="login" variants={formVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: "easeInOut" }}>
                <h3 className="text-xl font-semibold text-foreground mb-1.5">欢迎回来</h3>
                <p className="text-sm text-muted-foreground mb-6">{mfaChallengeToken ? "请输入二次验证码完成登录" : "登录你的账号以继续"}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!mfaChallengeToken && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">邮箱</label>
                        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                          className={inputCls("email")} placeholder="name@company.com" />
                        {errors.email && <p className="text-[11px] text-destructive mt-1">{errors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
                        <div className="relative">
                          <input type={showPwd ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                            className={`${inputCls("password")} pr-10`} placeholder="请输入密码" />
                          <button type="button" onClick={() => setShowPwd(!showPwd)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-[11px] text-destructive mt-1">{errors.password}</p>}
                      </div>
                    </>
                  )}

                  {mfaChallengeToken && (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-foreground">{useBackupCode ? "恢复码" : "动态码"}</label>
                        <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => {
                          setUseBackupCode(v => !v);
                          setErrors(p => ({ ...p, mfaOtpCode: "", mfaBackupCode: "" }));
                        }}>
                          {useBackupCode ? "改用动态码" : "改用恢复码"}
                        </button>
                      </div>
                      {useBackupCode ? (
                        <div>
                          <input type="text" value={mfaBackupCode} onChange={(e) => { setMfaBackupCode(e.target.value.toUpperCase()); setErrors(p => ({ ...p, mfaBackupCode: "" })); }}
                            className={inputCls("mfaBackupCode")} placeholder="如：ABCD-EFGH" />
                          {errors.mfaBackupCode && <p className="text-[11px] text-destructive mt-1">{errors.mfaBackupCode}</p>}
                        </div>
                      ) : (
                        <div>
                          <input type="text" value={mfaOtpCode} onChange={(e) => { setMfaOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErrors(p => ({ ...p, mfaOtpCode: "" })); }}
                            className={inputCls("mfaOtpCode")} placeholder="6 位验证码" />
                          {errors.mfaOtpCode && <p className="text-[11px] text-destructive mt-1">{errors.mfaOtpCode}</p>}
                        </div>
                      )}
                    </>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mfaChallengeToken ? "验证并登录" : "登录"} <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>

                  {mfaChallengeToken && (
                    <button
                      type="button"
                      className="w-full h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
                      onClick={() => {
                        setMfaChallengeToken(null);
                        setMfaOtpCode("");
                        setMfaBackupCode("");
                        setUseBackupCode(false);
                        setErrors({});
                      }}
                    >
                      返回账号密码登录
                    </button>
                  )}
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  还没有账号？{" "}
                  <button onClick={() => { setIsLogin(false); setErrors({}); setMfaChallengeToken(null); }} className="text-primary font-medium hover:underline underline-offset-4 transition-colors">
                    立即注册
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div key="register" variants={formVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: "easeInOut" }}>
                <button onClick={() => { setIsLogin(true); setErrors({}); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  返回登录
                </button>
                <h3 className="text-xl font-semibold text-foreground mb-1.5">创建新账号</h3>
                <p className="text-sm text-muted-foreground mb-6">填写以下信息完成注册</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">显示名称</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                      className={inputCls("displayName")} placeholder="（选填）你的名字" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">邮箱</label>
                    <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                      className={inputCls("email")} placeholder="name@company.com" />
                    {errors.email && <p className="text-[11px] text-destructive mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
                    <div className="relative">
                      <input type={showPwd ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                        className={`${inputCls("password")} pr-10`} placeholder="至少 8 位密码" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-[11px] text-destructive mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">确认密码</label>
                    <input type="password" value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setErrors(p => ({ ...p, confirmPwd: "" })); }}
                      className={inputCls("confirmPwd")} placeholder="再次输入密码" />
                    {errors.confirmPwd && <p className="text-[11px] text-destructive mt-1">{errors.confirmPwd}</p>}
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>注册 <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
