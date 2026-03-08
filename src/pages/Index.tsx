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
import { documents, opsMetrics, knowledgeBases, feedbackItems } from "@/lib/mock-data";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const quickActions = [
  { icon: Plus, label: "新建文档", desc: "上传或创建文档", color: "text-primary", bg: "bg-primary/8", to: "/resources" },
  { icon: FolderOpen, label: "知识库", desc: "管理知识库", color: "text-accent", bg: "bg-accent/8", to: "/resources" },
  { icon: LayoutTemplate, label: "模板", desc: "使用模板快速创建", color: "text-warning", bg: "bg-warning/8", to: "/resources" },
  { icon: Sparkles, label: "AI 对话", desc: "智能问答检索", color: "text-info", bg: "bg-info/8", to: "/chat" },
];

const recentDocs = documents.slice(0, 6);

const queryTrend = [
  { date: "10/09", queries: 980 },
  { date: "10/10", queries: 1050 },
  { date: "10/11", queries: 1120 },
  { date: "10/12", queries: 1180 },
  { date: "10/13", queries: 1240 },
  { date: "10/14", queries: 1150 },
  { date: "10/15", queries: 1284 },
];

const kbUsage = knowledgeBases.slice(0, 5).map(kb => ({ name: kb.name.length > 6 ? kb.name.slice(0, 6) + "…" : kb.name, docs: kb.doc_count, chunks: kb.chunk_count }));

const feedbackStats = [
  { name: "好评", value: feedbackItems.filter(f => f.type === "thumbs_up").length, color: "hsl(var(--success))" },
  { name: "差评", value: feedbackItems.filter(f => f.type === "thumbs_down").length, color: "hsl(var(--destructive))" },
  { name: "纠正", value: feedbackItems.filter(f => f.type === "correction").length, color: "hsl(var(--info))" },
  { name: "标记", value: feedbackItems.filter(f => f.type === "flag").length, color: "hsl(var(--warning))" },
];

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } } },
};

const chartTooltipStyle = { fontSize: 12, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", boxShadow: "var(--shadow-md)" };

const Index = () => {
  const { currentTenant } = useAuth();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">工作台</h1>
          <p className="text-sm text-muted-foreground mt-1">{currentTenant?.name} · 欢迎回来 👋</p>
        </div>

        {/* Metrics */}
        <motion.div variants={stagger.container} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {opsMetrics.map((m) => (
            <motion.div key={m.label} variants={stagger.item} className="bg-card rounded-xl border border-border p-4 shadow-xs hover:shadow-card transition-shadow duration-200">
              <div className="text-[11px] text-muted-foreground font-medium">{m.label}</div>
              <div className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{m.value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{m.unit !== "篇" && m.unit !== "个" && m.unit !== "人" ? m.unit : ""}</span></div>
              <div className={`flex items-center gap-0.5 mt-1.5 text-[11px] font-medium ${m.change > 0 ? "text-success" : "text-destructive"}`}>
                {m.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {m.change > 0 ? "+" : ""}{m.change}%
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Row */}
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
                  label={({ name, value }) => `${name}(${value})`} labelLine={false}>
                  {feedbackStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KB Usage Bar */}
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

        {/* Quick Actions */}
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
          {/* Recent Documents */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">最近文档</h2>
              <Link to="/resources" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                查看全部 <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/30 transition-colors cursor-pointer group">
                  <div className="h-8 w-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{doc.title}</p>
                    <p className="text-[11px] text-muted-foreground">{doc.kb_name}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    doc.status === "ready" ? "bg-success/10 text-success" :
                    doc.status === "processing" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {doc.status === "ready" ? "就绪" : doc.status === "processing" ? "处理中" : "错误"}
                  </span>
                  <span className="text-[11px] text-muted-foreground w-16 text-right shrink-0 hidden sm:inline">{doc.updated_at}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge Bases */}
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">知识库</h2>
              <Link to="/resources" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                管理 <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {knowledgeBases.slice(0, 5).map((kb) => (
                <div key={kb.id} className="px-5 py-3 hover:bg-secondary/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{kb.name}</span>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      kb.status === "active" ? "bg-success" : kb.status === "indexing" ? "bg-warning animate-pulse" : "bg-destructive"
                    }`} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {kb.doc_count} 文档 · {kb.chunk_count} 切片 · {kb.workspace_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
