import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { agentApi, type AgentRunBriefData, type AgentRunDetailData } from "@/lib/api";
import { Bot, Play, Square, Clock, CheckCircle, AlertTriangle, Loader2, Eye } from "lucide-react";
import { FormDialog, FormField, FormTextarea, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
  queued: { label: "排队中", cls: "bg-muted text-muted-foreground", icon: Clock },
  running: { label: "运行中", cls: "bg-info/10 text-info", icon: Loader2 },
  completed: { label: "已完成", cls: "bg-success/10 text-success", icon: CheckCircle },
  failed: { label: "失败", cls: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  cancelled: { label: "已取消", cls: "bg-muted text-muted-foreground", icon: Square },
};

const RUN_IDS_STORAGE_KEY = "tkp_agent_run_ids";

const AgentRuns = () => {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState("");

  // We keep a local list of run IDs we've created to poll for status
  const [runIds, setRunIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RUN_IDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRunIds(parsed.filter((v): v is string => typeof v === "string").slice(0, 50));
      }
    } catch {
      // ignore invalid local cache
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(RUN_IDS_STORAGE_KEY, JSON.stringify(runIds.slice(0, 50)));
  }, [runIds]);

  const { data: serverRuns = [] } = useQuery({
    queryKey: ["agent-runs-list"],
    queryFn: () => agentApi.list({ limit: 50 }),
  });

  useEffect(() => {
    if (serverRuns.length === 0) return;
    const merged = Array.from(new Set([...serverRuns.map((r) => r.run_id), ...runIds]));
    if (merged.join(",") !== runIds.join(",")) {
      setRunIds(merged);
    }
  }, [serverRuns, runIds]);

  // Poll run details for all known runs
  const { data: runDetails = [], isLoading } = useQuery({
    queryKey: ["agent-runs", runIds],
    queryFn: async () => {
      if (runIds.length === 0) return [];
      const results = await Promise.allSettled(runIds.map(id => agentApi.get(id)));
      return results
        .filter((r): r is PromiseFulfilledResult<AgentRunDetailData> => r.status === "fulfilled")
        .map(r => r.value);
    },
    refetchInterval: runIds.some(id => {
      const run = runDetails?.find(r => r.run_id === id);
      return run && (run.status === "running" || run.status === "queued");
    }) ? 3000 : false,
  });

  const createMutation = useMutation({
    mutationFn: (task: string) => agentApi.create({ task }),
    onSuccess: (data) => {
      setRunIds(prev => [data.run_id, ...prev]);
      toast.success("Agent 任务已创建");
      setShowNew(false);
      setTaskInput("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (runId: string) => agentApi.cancel(runId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-runs"] });
      toast.success("任务已取消");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detailRun = showDetail ? runDetails.find(r => r.run_id === showDetail) : null;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Agent 任务</h1>
            <p className="text-sm text-muted-foreground">管理和监控 AI Agent 执行的自动化任务</p>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Play className="h-3.5 w-3.5" /> 新建任务
          </button>
        </div>

        {isLoading && runIds.length > 0 ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : runDetails.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">暂无 Agent 任务</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">创建一个任务，Agent 将自动规划并执行</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runDetails.map(run => {
              const sc = statusConfig[run.status] || statusConfig.queued;
              const Icon = sc.icon;
              const toolCount = run.tool_calls?.length || 0;
              const duration = run.started_at && run.finished_at
                ? `${((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(0)}s`
                : run.started_at ? "进行中" : "-";

              return (
                <div key={run.run_id} className="bg-card rounded-lg border border-border p-4 shadow-xs hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{run.run_id.slice(0, 8)}...</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>
                            <Icon className={`h-3 w-3 ${run.status === "running" ? "animate-spin" : ""}`} />
                            {sc.label}
                          </span>
                          {run.started_at && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {new Date(run.started_at).toLocaleString("zh-CN")}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">{duration}</span>
                          <span className="text-[11px] text-muted-foreground">{toolCount} 次工具调用</span>
                          {run.cost > 0 && <span className="text-[11px] text-muted-foreground">¥{run.cost.toFixed(4)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setShowDetail(run.run_id)} className="p-1.5 rounded-md hover:bg-secondary transition-colors" title="查看详情">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {(run.status === "running" || run.status === "queued") && (
                        <button onClick={() => cancelMutation.mutate(run.run_id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" title="取消">
                          <Square className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Agent Run */}
      <FormDialog open={showNew} onClose={() => { setShowNew(false); setTaskInput(""); }} title="新建 Agent 任务" description="描述要执行的任务，Agent 将自动规划并执行"
        footer={<>
          <DialogButton onClick={() => { setShowNew(false); setTaskInput(""); }}>取消</DialogButton>
          <DialogButton variant="primary" disabled={!taskInput.trim() || createMutation.isPending} onClick={() => createMutation.mutate(taskInput)}>
            {createMutation.isPending ? "创建中..." : "开始执行"}
          </DialogButton>
        </>}>
        <FormField label="任务描述" required hint="详细描述您希望 Agent 完成的任务">
          <FormTextarea value={taskInput} onChange={setTaskInput} placeholder="如：分析所有知识库中超过 90 天未更新的文档，生成过期报告..." rows={5} />
        </FormField>
      </FormDialog>

      {/* Detail Dialog */}
      <FormDialog open={!!showDetail} onClose={() => setShowDetail(null)} title={`任务详情`} width="max-w-lg"
        footer={<DialogButton onClick={() => setShowDetail(null)}>关闭</DialogButton>}>
        {detailRun && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="text-[11px] text-muted-foreground">Run ID</div>
              <div className="text-sm font-mono text-foreground mt-0.5">{detailRun.run_id}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground">状态</div>
                <div className="text-sm font-medium text-foreground mt-0.5">{(statusConfig[detailRun.status] || statusConfig.queued).label}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground">成本</div>
                <div className="text-sm text-foreground mt-0.5">¥{detailRun.cost.toFixed(4)}</div>
              </div>
            </div>
            {detailRun.plan_json && Object.keys(detailRun.plan_json).length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground mb-1">规划信息</div>
                <pre className="text-[11px] text-foreground overflow-auto max-h-40">{JSON.stringify(detailRun.plan_json, null, 2)}</pre>
              </div>
            )}
            {detailRun.tool_calls.length > 0 && (
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground mb-1">工具调用 ({detailRun.tool_calls.length})</div>
                <pre className="text-[11px] text-foreground overflow-auto max-h-60">{JSON.stringify(detailRun.tool_calls, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </FormDialog>
    </AppLayout>
  );
};

export default AgentRuns;
