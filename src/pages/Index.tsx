import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  FolderOpen,
  Plus,
  Sparkles,
  LayoutTemplate,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { documentApi, feedbackApi, kbApi, opsApi, workspaceApi, type DocumentData, type KnowledgeBaseData } from "@/lib/api";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const quickActions = [
  { icon: Plus, label: "新建文档", desc: "上传或创建文档", color: "text-primary", bg: "bg-primary/8", to: "/resources" },
  { icon: FolderOpen, label: "知识库", desc: "管理知识库", color: "text-accent", bg: "bg-accent/8", to: "/resources" },
  { icon: LayoutTemplate, label: "模板", desc: "使用模板快速创建", color: "text-warning", bg: "bg-warning/8", to: "/resources" },
  { icon: Sparkles, label: "AI 对话", desc: "智能问答检索", color: "text-info", bg: "bg-info/8", to: "/chat" },
];

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } } },
};

const chartTooltipStyle = { fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", boxShadow: "var(--shadow-md)" };

const statusBadge = (status: string) => {
  if (status === "ready" || status === "active") return "bg-success/10 text-success";
  if (status === "processing" || status === "indexing") return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
};

const Index = () => {
  const { currentTenant } = useAuth();

  const { data: workspaces = [] } = useQuery({
    queryKey: ["index-workspaces"],
    queryFn: () => workspaceApi.list(),
  });

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ["index-kbs"],
    queryFn: () => kbApi.list(),
  });

  const { data: overview } = useQuery({
    queryKey: ["index-ops-overview"],
    queryFn: () => opsApi.overview(24),
    retry: false,
  });

  const { data: quality } = useQuery({
    queryKey: ["index-quality"],
    queryFn: () => opsApi.retrievalQuality(24),
    retry: false,
  });

  const { data: feedbackItems = [] } = useQuery({
    queryKey: ["index-feedback"],
    queryFn: () => feedbackApi.list({ limit: 200 }).catch(() => []),
    retry: false,
  });

  const { data: recentDocs = [] } = useQuery({
    queryKey: ["index-recent-docs", knowledgeBases.map((kb) => kb.id).join(",")],
    enabled: knowledgeBases.length > 0,
    queryFn: async () => {
      const docsByKb = await Promise.all(
        knowledgeBases.slice(0, 6).map((kb) => documentApi.list(kb.id).catch(() => [] as DocumentData[])),
      );
      return docsByKb.flat().slice(0, 6);
    },
  });

  const { data: kbUsage = [] } = useQuery({
    queryKey: ["index-kb-usage", knowledgeBases.map((kb) => kb.id).join(",")],
    enabled: knowledgeBases.length > 0,
    queryFn: async () => {
      const top = knowledgeBases.slice(0, 5);
      const stats = await Promise.all(
        top.map(async (kb) => ({ kb, stats: await kbApi.stats(kb.id).catch(() => null) })),
      );
      return stats.map(({ kb, stats }) => ({
        id: kb.id,
        name: kb.name.length > 6 ? `${kb.name.slice(0, 6)}…` : kb.name,
        docs: stats?.document_total ?? 0,
        chunks: stats?.chunk_total ?? 0,
      }));
    },
  });

  const kbNameMap = useMemo(
    () => Object.fromEntries(knowledgeBases.map((kb) => [kb.id, kb.name])),
    [knowledgeBases],
  );

  const opsMetrics = useMemo(() => {
    const base = [
      { label: "工作空间", value: workspaces.length, unit: "个", change: 0 },
      { label: "知识库", value: knowledgeBases.length, unit: "个", change: 0 },
      { label: "文档", value: recentDocs.length, unit: "篇", change: 0 },
      { label: "反馈", value: feedbackItems.length, unit: "条", change: 0 },
      { label: "零命中率", value: `${((quality?.zero_hit_rate ?? 0) * 100).toFixed(1)}%`, unit: "", change: 0 },
      { label: "估算成本", value: `¥${(overview?.estimated_total_cost ?? 0).toFixed(2)}`, unit: "", change: 0 },
    ];
    return base;
  }, [workspaces.length, knowledgeBases.length, recentDocs.length, feedbackItems.length, quality?.zero_hit_rate, overview?.estimated_total_cost]);

  const totalQueries = quality?.total_queries ?? 0;
  const queryTrend = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      date: `${i + 1}d`,
      queries: Math.max(0, Math.round(totalQueries * (0.5 + i * 0.08))),
    })),
    [totalQueries],
  );

  const feedbackStats = useMemo(
    () => [
      { name: "好评", value: feedbackItems.filter((f) => f.feedback_type === "thumbs_up").length, color: "hsl(var(--success))" },
      { name: "差评", value: feedbackItems.filter((f) => f.feedback_type === "thumbs_down").length, color: "hsl(var(--destructive))" },
      { name: "评论", value: feedbackItems.filter((f) => f.feedback_type === "comment").length, color: "hsl(var(--info))" },
      { name: "评分", value: feedbackItems.filter((f) => f.feedback_type === "rating").length, color: "hsl(var(--warning))" },
    ],
    [feedbackItems],
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">工作台</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentTenant?.name} · 欢迎回来</p>
        </div>

        <motion.div variants={stagger.container} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {opsMetrics.map((m) => (
            <motion.div key={m.label} variants={stagger.item} className="bg-card rounded-xl border border-border p-4 shadow-xs hover:shadow-card transition-shadow duration-200">
              <div className="text-[11px] text-muted-foreground font-medium">{m.label}</div>
              <div className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{m.value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{m.unit}</span></div>
              <div className={`flex items-center gap-0.5 mt-1.5 text-[11px] font-medium ${m.change >= 0 ? "text-success" : "text-destructive"}`}>
                {m.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {m.change > 0 ? "+" : ""}{m.change}%
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-foreground mb-4">查询量趋势</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={queryTrend}>
                <defs>
                  <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="queries" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#queryGrad)" name="查询量" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-foreground mb-4">反馈分布</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={feedbackStats} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}
                  label={({ name, value }) => `${name} ${value}`} labelLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}>
                  {feedbackStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-foreground mb-4">知识库使用排行</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={kbUsage}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="docs" fill="url(#barGrad)" name="文档数" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <motion.div variants={stagger.container} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <motion.div key={a.label} variants={stagger.item}>
              <Link
                to={a.to}
                className="block bg-card rounded-xl border border-border p-4 shadow-xs hover:shadow-glow hover:border-primary/20 transition-all duration-200 group"
              >
                <div className={`h-10 w-10 rounded-xl ${a.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}>
                  <a.icon className={`h-5 w-5 ${a.color}`} />
                </div>
                <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{a.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.desc}</div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">最近文档</h2>
              <Link to="/resources" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                查看全部 <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-[11px] text-muted-foreground">{kbNameMap[doc.kb_id] || doc.kb_id}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusBadge(doc.status)}`}>
                    {doc.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-20 text-right shrink-0 hidden sm:inline">v{doc.current_version}</span>
                </div>
              ))}
              {recentDocs.length === 0 && (
                <div className="px-5 py-8 text-sm text-muted-foreground text-center">暂无文档数据</div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">知识库</h2>
              <Link to="/resources" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                管理 <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {knowledgeBases.slice(0, 5).map((kb: KnowledgeBaseData) => {
                const stats = kbUsage.find((item) => item.id === kb.id);
                return (
                  <div key={kb.id} className="px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{kb.name}</span>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${
                        kb.status === "active" ? "bg-success" : kb.status === "indexing" ? "bg-warning animate-pulse" : "bg-destructive"
                      }`} />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {(stats?.docs ?? 0)} 文档 · {(stats?.chunks ?? 0)} 切片 · {kb.embedding_model}
                    </div>
                  </div>
                );
              })}
              {knowledgeBases.length === 0 && (
                <div className="px-5 py-8 text-sm text-muted-foreground text-center">暂无知识库数据</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
