import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { feedbackApi, type FeedbackItemData } from "@/lib/api";
import { ThumbsUp, ThumbsDown, AlertTriangle, Edit3, Eye, X, MessageSquare, User, Bot, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const typeIcons: Record<string, any> = {
  thumbs_up: ThumbsUp,
  thumbs_down: ThumbsDown,
  correction: Edit3,
  flag: AlertTriangle,
  rating: ThumbsUp,
  comment: Edit3,
};
const typeLabels: Record<string, string> = {
  thumbs_up: "好评",
  thumbs_down: "差评",
  correction: "纠正",
  flag: "标记",
  rating: "评分",
  comment: "评论",
};

const PAGE_SIZE = 10;

const Feedback = () => {
  const [selectedFb, setSelectedFb] = useState<FeedbackItemData | null>(null);
  const [processedFilter, setProcessedFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [replayResult, setReplayResult] = useState<Record<string, unknown> | null>(null);

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["feedbacks", processedFilter],
    queryFn: () => feedbackApi.list({ processed: processedFilter, limit: 200 }),
  });

  const replayMutation = useMutation({
    mutationFn: (feedbackId: string) => feedbackApi.replay(feedbackId),
    onSuccess: (data) => {
      setReplayResult(data as Record<string, unknown>);
      toast.success("回放已生成");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil(feedbacks.length / PAGE_SIZE));
  const paginated = feedbacks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-foreground mb-1">反馈管理</h1>
        <p className="text-sm text-muted-foreground mb-4">查看用户反馈与回放记录</p>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {[
            { key: "all", label: "全部", val: undefined as boolean | undefined },
            { key: "unprocessed", label: "待处理", val: false },
            { key: "processed", label: "已处理", val: true },
          ].map(f => (
            <button key={f.key} onClick={() => { setProcessedFilter(f.val); setPage(1); }}
              className={`text-[12px] px-3 py-1.5 rounded-full transition-colors ${
                processedFilter === f.val
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>{f.label}</button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">类型</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">反馈内容</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">时间</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map(fb => {
                    const Icon = typeIcons[fb.feedback_type] || Edit3;
                    const label = typeLabels[fb.feedback_type] || fb.feedback_type;
                    return (
                      <tr key={fb.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            fb.feedback_type === "thumbs_up" ? "bg-success/10 text-success" :
                            fb.feedback_type === "thumbs_down" ? "bg-destructive/10 text-destructive" :
                            "bg-info/10 text-info"
                          }`}>
                            <Icon className="h-3 w-3" />
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground max-w-[300px] truncate">
                          {fb.comment || fb.feedback_value || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            fb.processed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          }`}>{fb.processed ? "已处理" : "待处理"}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[12px]">
                          {new Date(fb.created_at).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelectedFb(fb)} className="p-1 rounded hover:bg-secondary transition-colors" title="查看详情">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => replayMutation.mutate(fb.id)}
                              disabled={replayMutation.isPending}
                              className="p-1 rounded hover:bg-secondary transition-colors" title="回放"
                            >
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <span className="text-[11px] text-muted-foreground">共 {feedbacks.length} 条</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-30 transition-colors">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <span className="text-sm text-foreground px-2">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-md hover:bg-secondary disabled:opacity-30 transition-colors">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedFb && (
        <>
          <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={() => { setSelectedFb(null); setReplayResult(null); }} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-elevated flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">反馈详情</h3>
                <p className="text-[12px] text-muted-foreground">{selectedFb.id}</p>
              </div>
              <button onClick={() => { setSelectedFb(null); setReplayResult(null); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-4">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="text-[11px] text-muted-foreground">类型</div>
                <div className="text-sm text-foreground mt-0.5">{typeLabels[selectedFb.feedback_type] || selectedFb.feedback_type}</div>
              </div>
              {selectedFb.comment && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-[11px] text-muted-foreground">评论</div>
                  <div className="text-sm text-foreground mt-0.5">{selectedFb.comment}</div>
                </div>
              )}
              {selectedFb.feedback_value && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-[11px] text-muted-foreground">反馈值</div>
                  <div className="text-sm text-foreground mt-0.5">{selectedFb.feedback_value}</div>
                </div>
              )}
              {selectedFb.tags && selectedFb.tags.length > 0 && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-[11px] text-muted-foreground mb-1">标签</div>
                  <div className="flex gap-1 flex-wrap">
                    {selectedFb.tags.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-[11px] text-muted-foreground">状态</div>
                  <div className="text-sm text-foreground mt-0.5">{selectedFb.processed ? "已处理" : "待处理"}</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-[11px] text-muted-foreground">时间</div>
                  <div className="text-sm text-foreground mt-0.5">{new Date(selectedFb.created_at).toLocaleString("zh-CN")}</div>
                </div>
              </div>
              {selectedFb.conversation_id && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="text-[11px] text-muted-foreground">会话 ID</div>
                  <div className="text-sm font-mono text-foreground mt-0.5">{selectedFb.conversation_id}</div>
                </div>
              )}

              {/* Replay result */}
              {replayResult && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-[11px] text-primary font-medium mb-1">回放结果</div>
                  <pre className="text-[11px] text-foreground overflow-auto max-h-60">{JSON.stringify(replayResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default Feedback;
