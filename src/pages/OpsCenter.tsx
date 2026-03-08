import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  opsApi,
  type IncidentTicketData,
  type AlertWebhookData,
  type ReleaseRolloutData,
} from "@/lib/api";
import {
  Activity, AlertTriangle, Bell,
  CheckCircle, BarChart3, Ticket,
  Rocket, Webhook, Plus, RefreshCw, Loader2, Pencil,
} from "lucide-react";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageTabs } from "@/components/PageTabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoleAccess } from "@/hooks/useRoleAccess";

type Tab = "overview" | "alerts" | "incidents" | "rollouts" | "quality" | "cost" | "webhooks";

const OpsCenter = () => {
  const qc = useQueryClient();
  const { roleName, canAction } = useRoleAccess();
  const [tab, setTab] = useState<Tab>("overview");
  const [windowHours, setWindowHours] = useState(24);

  const [showNewIncident, setShowNewIncident] = useState(false);
  const [showEditIncident, setShowEditIncident] = useState<IncidentTicketData | null>(null);
  const [showRollback, setShowRollback] = useState<string | null>(null);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [showNewRollout, setShowNewRollout] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState("warn");
  const [formSourceCode, setFormSourceCode] = useState("manual");

  const [ticketStatus, setTicketStatus] = useState("open");
  const [ticketAssignee, setTicketAssignee] = useState("");
  const [ticketResolution, setTicketResolution] = useState("");

  const [rolloutVersion, setRolloutVersion] = useState("");
  const [rolloutStrategy, setRolloutStrategy] = useState("canary");
  const [rolloutRisk, setRolloutRisk] = useState("medium");
  const [rolloutCanary, setRolloutCanary] = useState("10");
  const [rolloutScope, setRolloutScope] = useState("{}");
  const [rolloutNote, setRolloutNote] = useState("");

  const [formUrl, setFormUrl] = useState("");
  const [formWhName, setFormWhName] = useState("");
  const canOpsManage = (roleName === "owner" || roleName === "admin") && canAction("api.tenant.member.manage");

  const toastNoPermission = (label: string) => {
    toast.error(`当前角色无权执行：${label}`);
  };

  // ─── Data queries ──────────────────────────────────────────────
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["ops-overview", windowHours],
    queryFn: () => opsApi.overview(windowHours),
    enabled: tab === "overview",
  });

  const { data: slo } = useQuery({
    queryKey: ["ops-slo", windowHours],
    queryFn: () => opsApi.sloSummary(windowHours),
    enabled: tab === "overview",
  });

  const { data: tenantHealth = [] } = useQuery({
    queryKey: ["ops-tenant-health", windowHours],
    queryFn: () => opsApi.tenantHealth(windowHours),
    enabled: tab === "overview",
  });

  const { data: ingestionAlerts } = useQuery({
    queryKey: ["ops-ingestion-alerts", windowHours],
    queryFn: () => opsApi.ingestionAlerts(windowHours),
    enabled: tab === "alerts",
  });

  const { data: diagnosisItems = [] } = useQuery({
    queryKey: ["ops-diagnosis", windowHours],
    queryFn: () => opsApi.diagnosis(windowHours),
    enabled: tab === "incidents",
  });

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["ops-tickets"],
    queryFn: () => opsApi.listTickets({ limit: 50 }),
    enabled: tab === "incidents",
  });

  const { data: rollouts = [], isLoading: rolloutsLoading } = useQuery({
    queryKey: ["ops-rollouts"],
    queryFn: () => opsApi.listRollouts({ limit: 20 }),
    enabled: tab === "rollouts",
  });

  const { data: quality } = useQuery({
    queryKey: ["ops-quality", windowHours],
    queryFn: () => opsApi.retrievalQuality(windowHours),
    enabled: tab === "quality",
  });

  const { data: costData } = useQuery({
    queryKey: ["ops-cost", windowHours],
    queryFn: () => opsApi.costSummary(windowHours),
    enabled: tab === "cost",
  });

  const { data: costLeaderboard = [] } = useQuery({
    queryKey: ["ops-cost-leaderboard", windowHours],
    queryFn: () => opsApi.costLeaderboard(windowHours),
    enabled: tab === "cost",
  });

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ["ops-webhooks"],
    queryFn: () => opsApi.listWebhooks(),
    enabled: tab === "webhooks",
  });

  // ─── Mutations ─────────────────────────────────────────────────
  const createTicketMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      severity: string;
      description: string;
      source_code?: string;
      diagnosis?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }) =>
      opsApi.createTicket({
        title: payload.title,
        severity: payload.severity,
        description: payload.description,
        source_code: payload.source_code,
        diagnosis: payload.diagnosis,
        context: payload.context,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-tickets"] });
      toast.success("工单已创建");
      setShowNewIncident(false);
      setFormTitle("");
      setFormDesc("");
      setFormPriority("warn");
      setFormSourceCode("manual");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTicketMutation = useMutation({
    mutationFn: (payload: { ticketId: string; status?: string; assignee?: string; resolution?: string }) =>
      opsApi.updateTicket(payload.ticketId, {
        status: payload.status,
        assignee: payload.assignee || undefined,
        resolution: payload.resolution || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-tickets"] });
      toast.success("工单已更新");
      setShowEditIncident(null);
      setTicketResolution("");
      setTicketAssignee("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createRolloutMutation = useMutation({
    mutationFn: (payload: {
      version: string;
      strategy: string;
      risk_level: string;
      canary_percent: number;
      scope: Record<string, unknown>;
      description?: string;
    }) =>
      opsApi.createRollout(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-rollouts"] });
      toast.success("发布记录已创建");
      setShowNewRollout(false);
      setRolloutVersion("");
      setRolloutStrategy("canary");
      setRolloutRisk("medium");
      setRolloutCanary("10");
      setRolloutScope("{}");
      setRolloutNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rollbackMutation = useMutation({
    mutationFn: (rolloutId: string) => opsApi.rollback(rolloutId, "手动回滚"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-rollouts"] });
      toast.success("已触发回滚");
      setShowRollback(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsertWebhookMutation = useMutation({
    mutationFn: () => opsApi.upsertWebhook({ name: formWhName, url: formUrl, event_types: ["alert.critical", "alert.warning"], enabled: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-webhooks"] });
      toast.success("Webhook 已添加");
      setShowNewWebhook(false);
      setFormUrl("");
      setFormWhName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "总览", icon: Activity },
    { id: "alerts", label: "告警", icon: Bell },
    { id: "incidents", label: "工单", icon: Ticket },
    { id: "rollouts", label: "发布", icon: Rocket },
    { id: "quality", label: "检索质量", icon: BarChart3 },
    { id: "cost", label: "成本", icon: Activity },
    { id: "webhooks", label: "Webhook", icon: Webhook },
  ];

  const LoadingState = () => (
    <div className="flex items-center justify-center py-16 gap-2">
      <Loader2 className="h-5 w-5 text-primary animate-spin" />
      <span className="text-sm text-muted-foreground">加载中...</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-foreground">运营中心</h1>
          <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            时间窗口
            <select
              value={windowHours}
              onChange={(e) => setWindowHours(Number(e.target.value))}
              className="text-[11px] bg-card border border-input rounded px-1.5 py-0.5 text-foreground"
            >
              <option value={1}>1h</option>
              <option value={6}>6h</option>
              <option value={24}>24h</option>
              <option value={72}>3d</option>
              <option value={168}>7d</option>
            </select>
          </label>
        </div>
        <p className="text-sm text-muted-foreground mb-5">监控平台运行状态与服务质量</p>

        <PageTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as Tab)} />

        {/* Overview */}
        {tab === "overview" && (
          overviewLoading ? <LoadingState /> : overview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: "入库状态", value: overview.ingestion_alert_status, color: overview.ingestion_alert_status === "ok" ? "text-success" : "text-warning" },
                  { label: "积压任务", value: String(overview.ingestion_backlog_total) },
                  { label: "入库失败率", value: `${(overview.ingestion_failure_rate * 100).toFixed(1)}%` },
                  { label: "检索零命中率", value: `${(overview.retrieval_zero_hit_rate * 100).toFixed(1)}%` },
                  { label: "估算成本", value: `¥${overview.estimated_total_cost.toFixed(2)}` },
                ].map((m) => (
                  <div key={m.label} className="bg-card rounded-lg border border-border p-3.5 shadow-xs">
                    <div className="text-[11px] text-muted-foreground font-medium">{m.label}</div>
                    <div className={`text-xl font-bold mt-1 ${(m as any).color || "text-foreground"}`}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground mb-3">工单状态</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm text-foreground">未关闭工单</span>
                      <span className="text-lg font-bold text-foreground">{overview.incident_open_total}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm text-foreground">Critical 工单</span>
                      <span className={`text-lg font-bold ${overview.incident_critical_open_total > 0 ? "text-destructive" : "text-success"}`}>
                        {overview.incident_critical_open_total}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm text-foreground">Webhook 启用</span>
                      <span className="text-lg font-bold text-foreground">{overview.webhook_enabled_total}</span>
                    </div>
                  </div>
                </div>

                {slo && (
                  <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      SLO 状态
                      <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        slo.overall_status === "met" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>{slo.overall_status === "met" ? "达标" : "未达标"}</span>
                    </h3>
                    <div className="space-y-2">
                      {slo.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                          {item.met ? <CheckCircle className="h-5 w-5 text-success shrink-0" /> : <AlertTriangle className="h-5 w-5 text-warning shrink-0" />}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{item.metric}: {typeof item.current === "number" && item.current < 1 ? `${(item.current * 100).toFixed(1)}%` : item.current}</div>
                            <div className="text-[11px] text-muted-foreground">目标: {typeof item.target === "number" && item.target < 1 ? `${(item.target * 100).toFixed(1)}%` : item.target}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                <h3 className="text-sm font-semibold text-foreground mb-3">租户健康分项</h3>
                {tenantHealth.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无租户健康数据</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[880px]">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-3 py-2">工作空间</th>
                          <th className="text-left px-3 py-2">文档可用率</th>
                          <th className="text-left px-3 py-2">dead-letter</th>
                          <th className="text-left px-3 py-2">检索请求</th>
                          <th className="text-left px-3 py-2">零命中率</th>
                          <th className="text-left px-3 py-2">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {tenantHealth.map((item: any) => (
                          <tr key={item.workspace_id}>
                            <td className="px-3 py-2">
                              <div className="text-foreground font-medium">{item.workspace_name}</div>
                              <div className="text-[11px] text-muted-foreground">{item.workspace_status}</div>
                            </td>
                            <td className="px-3 py-2">{((item.document_ready_ratio || 0) * 100).toFixed(1)}%</td>
                            <td className="px-3 py-2">{item.dead_letter_jobs}</td>
                            <td className="px-3 py-2">{item.retrieval_queries}</td>
                            <td className="px-3 py-2">{((item.retrieval_zero_hit_rate || 0) * 100).toFixed(1)}%</td>
                            <td className="px-3 py-2">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                                item.status === "healthy" ? "bg-success/10 text-success" :
                                item.status === "warn" ? "bg-warning/10 text-warning" :
                                "bg-destructive/10 text-destructive"
                              }`}>{item.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null
        )}

        {/* Alerts */}
        {tab === "alerts" && (
          ingestionAlerts ? (
            <div className="space-y-4">
              <div className="bg-card rounded-lg border border-border p-4 shadow-xs flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${
                  ingestionAlerts.overall_status === "ok" ? "bg-success" :
                  ingestionAlerts.overall_status === "warn" ? "bg-warning" : "bg-destructive"
                }`} />
                <span className="text-sm font-medium text-foreground">入库健康: {ingestionAlerts.overall_status}</span>
              </div>
              {ingestionAlerts.rules?.map((rule: any, i: number) => (
                <div key={i} className={`bg-card rounded-lg border p-4 shadow-xs flex items-start gap-3 ${
                  rule.status === "critical" ? "border-destructive/30" : rule.status === "warn" ? "border-warning/30" : "border-border"
                }`}>
                  <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                    rule.status === "critical" ? "text-destructive" : rule.status === "warn" ? "text-warning" : "text-success"
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{rule.rule}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      当前值: {typeof rule.current_value === "number" && rule.current_value < 1 ? `${(rule.current_value * 100).toFixed(1)}%` : rule.current_value}
                      {" | "}警告阈值: {rule.threshold_warn} | 严重阈值: {rule.threshold_critical}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    rule.status === "ok" ? "bg-success/10 text-success" :
                    rule.status === "warn" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>{rule.status}</span>
                </div>
              ))}
            </div>
          ) : <LoadingState />
        )}

        {/* Incidents */}
        {tab === "incidents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">工单管理</h2>
              {canOpsManage && (
                <button onClick={() => setShowNewIncident(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> 创建工单
                </button>
              )}
            </div>

            <div className="bg-card rounded-lg border border-border p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-foreground mb-2">异常诊断（可一键转工单）</h3>
              {diagnosisItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无异常诊断项</div>
              ) : (
                <div className="space-y-2">
                  {diagnosisItems.map((d: any, idx: number) => (
                    <div key={`${d.source_code}-${idx}`} className="border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{d.title}</div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">{d.summary}</div>
                          <div className="text-[11px] text-muted-foreground mt-1">建议: {d.suggestion}</div>
                          <div className="text-[11px] text-muted-foreground mt-1 font-mono">{d.source_code}</div>
                        </div>
                        {canOpsManage && (
                          <button
                            onClick={() => {
                              createTicketMutation.mutate({
                                title: d.title,
                                severity: d.severity || "warn",
                                description: `${d.summary}\n建议: ${d.suggestion}`,
                                source_code: d.source_code || "diagnosis",
                                diagnosis: { suggestion: d.suggestion },
                                context: d.context || {},
                              });
                            }}
                            className="text-[11px] px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors"
                          >
                            一键建单
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {ticketsLoading ? <LoadingState /> : (
              <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">标题</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">严重级别</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">负责人</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">创建时间</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tickets.map((t: IncidentTicketData) => (
                      <tr key={t.ticket_id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{t.ticket_id.slice(0, 8)}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{t.title}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            t.severity === "critical" ? "bg-destructive/10 text-destructive" :
                            t.severity === "warn" ? "bg-warning/10 text-warning" :
                            "bg-info/10 text-info"
                          }`}>{t.severity}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            t.status === "open" ? "bg-destructive/10 text-destructive" :
                            t.status === "acknowledged" || t.status === "investigating" ? "bg-warning/10 text-warning" :
                            "bg-success/10 text-success"
                          }`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{t.assignee || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[12px]">{new Date(t.created_at).toLocaleDateString("zh-CN")}</td>
                        <td className="px-4 py-3">
                          {canOpsManage && (
                            <button
                              onClick={() => {
                                setShowEditIncident(t);
                                setTicketStatus(t.status || "open");
                                setTicketAssignee(t.assignee || "");
                                setTicketResolution(t.resolution || "");
                              }}
                              className="p-1 rounded hover:bg-secondary"
                              title="更新工单"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">暂无工单</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Rollouts */}
        {tab === "rollouts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">发布管理</h2>
              {canOpsManage && (
                <button onClick={() => setShowNewRollout(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> 创建发布
                </button>
              )}
            </div>
            {rolloutsLoading ? <LoadingState /> : (
              <div className="space-y-3">
                {rollouts.map((r: ReleaseRolloutData) => (
                  <div key={r.rollout_id} className="bg-card rounded-lg border border-border p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Rocket className="h-4 w-4 text-primary" />
                        <div>
                          <span className="text-sm font-semibold text-foreground">{r.version}</span>
                          <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            r.status === "completed" ? "bg-success/10 text-success" :
                            r.status === "rolling" || r.status === "in_progress" ? "bg-info/10 text-info" :
                            r.status === "rolled_back" ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          }`}>{r.status}</span>
                        </div>
                      </div>
                      {canOpsManage && (r.status === "rolling" || r.status === "in_progress") && (
                        <button onClick={() => setShowRollback(r.rollout_id)} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors">
                          <RefreshCw className="h-3 w-3" /> 回滚
                        </button>
                      )}
                    </div>
                    {r.description && <p className="text-[12px] text-muted-foreground mt-2">{r.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${r.status === "rolled_back" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${r.progress}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{r.progress}%</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("zh-CN")}</span>
                    </div>
                  </div>
                ))}
                {rollouts.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">暂无发布记录</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quality */}
        {tab === "quality" && (
          quality ? (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">检索质量指标</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: "总查询数", value: String(quality.total_queries) },
                  { label: "零命中率", value: `${(quality.zero_hit_rate * 100).toFixed(1)}%`, warn: quality.zero_hit_rate > 0.3 },
                  { label: "引用覆盖率", value: `${(quality.citation_coverage_rate * 100).toFixed(1)}%` },
                  { label: "P50 延迟", value: `${quality.latency_p50_ms}ms` },
                  { label: "P95 延迟", value: `${quality.latency_p95_ms}ms` },
                  { label: "P99 延迟", value: `${quality.latency_p99_ms}ms`, warn: quality.latency_p99_ms > 500 },
                ].map((m) => (
                  <div key={m.label} className="bg-card rounded-lg border border-border p-4 shadow-xs">
                    <div className="text-[11px] text-muted-foreground font-medium">{m.label}</div>
                    <div className={`text-xl font-bold mt-1 ${(m as any).warn ? "text-warning" : "text-foreground"}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <LoadingState />
        )}

        {/* Cost */}
        {tab === "cost" && (
          costData ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: "估算总成本", value: `¥${costData.estimated_total_cost.toFixed(2)}` },
                  { label: "Chat 成本", value: `¥${costData.chat_estimated_cost.toFixed(2)}` },
                  { label: "Agent 成本", value: `¥${costData.agent_cost_total.toFixed(2)}` },
                ].map((c) => (
                  <div key={c.label} className="bg-card rounded-lg border border-border p-4 shadow-xs">
                    <div className="text-[11px] text-muted-foreground font-medium">{c.label}</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground mb-3">用量统计</h3>
                  <div className="space-y-2">
                    {[
                      { label: "检索请求", value: costData.retrieval_request_total },
                      { label: "Chat 完成", value: costData.chat_completion_total },
                      { label: "Agent 运行", value: costData.agent_run_total },
                      { label: "Prompt Tokens", value: costData.prompt_tokens_total.toLocaleString() },
                      { label: "Completion Tokens", value: costData.completion_tokens_total.toLocaleString() },
                      { label: "总 Tokens", value: costData.total_tokens.toLocaleString() },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-2 rounded-md border border-border">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground mb-3">成本排行</h3>
                  <div className="space-y-2">
                    {costLeaderboard.length > 0 ? costLeaderboard.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-foreground w-28 shrink-0 truncate">{item.user_email || item.user_id?.slice(0, 8) || `#${i + 1}`}</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((item.estimated_total_cost || 0) / (costData.estimated_total_cost || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-sm font-medium text-foreground w-16 text-right">¥{(item.estimated_total_cost || 0).toFixed(2)}</span>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">暂无数据</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : <LoadingState />
        )}

        {/* Webhooks */}
        {tab === "webhooks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">告警 Webhook 配置</h2>
              {canOpsManage && (
                <button onClick={() => setShowNewWebhook(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> 添加 Webhook
                </button>
              )}
            </div>
            {webhooksLoading ? <LoadingState /> : (
              <div className="space-y-3">
                {webhooks.map((wh: AlertWebhookData) => (
                  <div key={wh.webhook_id} className="bg-card rounded-lg border border-border p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Webhook className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{wh.name}</div>
                          <code className="text-[11px] text-muted-foreground font-mono truncate block">{wh.url}</code>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${wh.enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {wh.enabled ? "启用" : "禁用"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {wh.event_types.map((ev) => (
                        <span key={ev} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{ev}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {webhooks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">暂无 Webhook 配置</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Incident */}
      <FormDialog open={showNewIncident} onClose={() => { setShowNewIncident(false); setFormTitle(""); setFormDesc(""); setFormPriority("warn"); setFormSourceCode("manual"); }} title="创建工单"
        footer={<>
          <DialogButton onClick={() => setShowNewIncident(false)}>取消</DialogButton>
          <DialogButton variant="primary" disabled={!canOpsManage || !formTitle || createTicketMutation.isPending}
            onClick={() => {
              if (!canOpsManage) {
                toastNoPermission("创建工单");
                return;
              }
              createTicketMutation.mutate({ title: formTitle, severity: formPriority, description: formDesc || formTitle, source_code: formSourceCode });
            }}>
            {createTicketMutation.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </>}>
        <FormField label="标题" required><FormInput value={formTitle} onChange={setFormTitle} placeholder="简要描述问题" /></FormField>
        <FormField label="来源编码" required><FormInput value={formSourceCode} onChange={setFormSourceCode} placeholder="manual / INGESTION_FAILURE_RATE ..." /></FormField>
        <FormField label="严重级别" required>
          <FormSelect value={formPriority} onChange={setFormPriority} options={[
            { value: "critical", label: "critical" }, { value: "warn", label: "warn" }, { value: "info", label: "info" },
          ]} />
        </FormField>
        <FormField label="描述"><FormTextarea value={formDesc} onChange={setFormDesc} placeholder="详细描述..." /></FormField>
      </FormDialog>

      {/* Edit Incident */}
      <FormDialog open={!!showEditIncident} onClose={() => setShowEditIncident(null)} title="更新工单"
        footer={<>
          <DialogButton onClick={() => setShowEditIncident(null)}>取消</DialogButton>
          <DialogButton
            variant="primary"
            disabled={!canOpsManage || !showEditIncident || updateTicketMutation.isPending}
            onClick={() => {
              if (!canOpsManage) {
                toastNoPermission("更新工单");
                return;
              }
              if (!showEditIncident) return;
              updateTicketMutation.mutate({
                ticketId: showEditIncident.ticket_id,
                status: ticketStatus,
                assignee: ticketAssignee,
                resolution: ticketResolution,
              });
            }}
          >
            {updateTicketMutation.isPending ? "保存中..." : "保存"}
          </DialogButton>
        </>}>
        <FormField label="状态" required>
          <FormSelect value={ticketStatus} onChange={setTicketStatus} options={[
            { value: "open", label: "open" },
            { value: "acknowledged", label: "acknowledged" },
            { value: "resolved", label: "resolved" },
          ]} />
        </FormField>
        <FormField label="负责人用户 ID"><FormInput value={ticketAssignee} onChange={setTicketAssignee} placeholder="可选" /></FormField>
        <FormField label="处理结论"><FormTextarea value={ticketResolution} onChange={setTicketResolution} rows={4} placeholder="处理说明..." /></FormField>
      </FormDialog>

      {/* New Rollout */}
      <FormDialog open={showNewRollout} onClose={() => setShowNewRollout(false)} title="创建发布记录"
        footer={<>
          <DialogButton onClick={() => setShowNewRollout(false)}>取消</DialogButton>
          <DialogButton
            variant="primary"
            disabled={!canOpsManage || !rolloutVersion || createRolloutMutation.isPending}
            onClick={() => {
              if (!canOpsManage) {
                toastNoPermission("创建发布");
                return;
              }
              let scopeObj: Record<string, unknown> = {};
              try {
                scopeObj = rolloutScope.trim() ? JSON.parse(rolloutScope) : {};
              } catch {
                toast.error("发布范围 scope 必须是合法 JSON");
                return;
              }
              createRolloutMutation.mutate({
                version: rolloutVersion,
                strategy: rolloutStrategy,
                risk_level: rolloutRisk,
                canary_percent: Number(rolloutCanary),
                scope: scopeObj,
                description: rolloutNote || undefined,
              });
            }}
          >
            {createRolloutMutation.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </>}>
        <FormField label="版本" required><FormInput value={rolloutVersion} onChange={setRolloutVersion} placeholder="v1.2.3" /></FormField>
        <FormField label="策略">
          <FormSelect value={rolloutStrategy} onChange={setRolloutStrategy} options={[
            { value: "canary", label: "canary" },
            { value: "blue_green", label: "blue_green" },
            { value: "rolling", label: "rolling" },
          ]} />
        </FormField>
        <FormField label="风险等级">
          <FormSelect value={rolloutRisk} onChange={setRolloutRisk} options={[
            { value: "low", label: "low" },
            { value: "medium", label: "medium" },
            { value: "high", label: "high" },
          ]} />
        </FormField>
        <FormField label="灰度比例"><FormInput value={rolloutCanary} onChange={setRolloutCanary} placeholder="10" /></FormField>
        <FormField label="发布范围(scope JSON)"><FormTextarea value={rolloutScope} onChange={setRolloutScope} rows={3} /></FormField>
        <FormField label="备注"><FormTextarea value={rolloutNote} onChange={setRolloutNote} rows={3} /></FormField>
      </FormDialog>

      {/* Rollback Confirm */}
      <ConfirmDialog open={!!showRollback} onClose={() => setShowRollback(null)}
        onConfirm={() => {
          if (!canOpsManage) {
            toastNoPermission("回滚发布");
            return;
          }
          if (showRollback) rollbackMutation.mutate(showRollback);
        }}
        title="确认回滚" message="确定回滚此发布？所有已更新的节点将恢复到上一个版本。"
        warning="此操作将影响所有已部署节点" variant="destructive" confirmLabel="确认回滚" />

      {/* New Webhook */}
      <FormDialog open={showNewWebhook} onClose={() => { setShowNewWebhook(false); setFormUrl(""); setFormWhName(""); }} title="添加 Webhook"
        footer={<>
          <DialogButton onClick={() => setShowNewWebhook(false)}>取消</DialogButton>
          <DialogButton variant="primary" disabled={!canOpsManage || !formUrl || !formWhName || upsertWebhookMutation.isPending}
            onClick={() => {
              if (!canOpsManage) {
                toastNoPermission("添加 Webhook");
                return;
              }
              upsertWebhookMutation.mutate();
            }}>
            {upsertWebhookMutation.isPending ? "添加中..." : "添加"}
          </DialogButton>
        </>}>
        <FormField label="名称" required><FormInput value={formWhName} onChange={setFormWhName} placeholder="如：Slack 告警" /></FormField>
        <FormField label="Webhook URL" required><FormInput value={formUrl} onChange={setFormUrl} placeholder="https://..." /></FormField>
      </FormDialog>
    </AppLayout>
  );
};

export default OpsCenter;
