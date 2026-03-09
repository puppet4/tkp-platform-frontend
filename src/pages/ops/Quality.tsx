import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { TrendingUp, Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi } from "@/lib/api";
import { FormDialog, FormField, FormInput, FormTextarea, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Quality = () => {
  const qc = useQueryClient();
  const { roleName } = useRoleAccess();
  const [showNewEval, setShowNewEval] = useState(false);
  const [formName, setFormName] = useState("");
  const [formQuery, setFormQuery] = useState("");
  const [formExpected, setFormExpected] = useState("");
  const [formKbId, setFormKbId] = useState("");

  const canOpsManage = roleName === "owner" || roleName === "admin";

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["ops-evaluations"],
    queryFn: () => opsApi.listEvaluations(),
    enabled: canOpsManage,
  });

  const { data: metrics } = useQuery({
    queryKey: ["ops-quality-metrics"],
    queryFn: () => opsApi.getQualityMetrics(),
    enabled: canOpsManage,
  });

  const createEvalMut = useMutation({
    mutationFn: (data: { name: string; query: string; expected_answer: string; kb_id: string }) =>
      opsApi.createEvaluation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-evaluations"] });
      toast.success("评测任务已创建");
      setShowNewEval(false);
      setFormName("");
      setFormQuery("");
      setFormExpected("");
      setFormKbId("");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const runEvalMut = useMutation({
    mutationFn: (evalId: string) => opsApi.runEvaluation(evalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-evaluations"] });
      toast.success("评测已启动");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleCreate = () => {
    if (!formName.trim() || !formQuery.trim() || !formKbId.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    createEvalMut.mutate({
      name: formName,
      query: formQuery,
      expected_answer: formExpected,
      kb_id: formKbId,
    });
  };

  if (!canOpsManage) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          权限不足，需要管理员权限
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              质量评测
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              检索质量和模型评测
            </p>
          </div>
          <button
            onClick={() => setShowNewEval(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            新建评测
          </button>
        </div>

        {/* Quality Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">平均准确率</div>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.avg_accuracy ? `${(metrics.avg_accuracy * 100).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">平均召回率</div>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.avg_recall ? `${(metrics.avg_recall * 100).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">平均 F1 分数</div>
            <div className="text-2xl font-bold text-purple-600">
              {metrics?.avg_f1 ? `${(metrics.avg_f1 * 100).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">评测总数</div>
            <div className="text-2xl font-bold">{evaluations.length}</div>
          </div>
        </div>

        {/* Evaluations List */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="font-semibold">评测列表</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : evaluations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无评测任务
              </div>
            ) : (
              <div className="space-y-2">
                {evaluations.map((evaluation: any) => (
                  <div
                    key={evaluation.eval_id}
                    className="p-4 border rounded-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold mb-2">{evaluation.name}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          查询: {evaluation.query}
                        </div>
                        {evaluation.expected_answer && (
                          <div className="text-sm text-muted-foreground mb-2">
                            期望答案: {evaluation.expected_answer}
                          </div>
                        )}
                        {evaluation.last_result && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">最近结果: </span>
                            <span className="font-medium">
                              准确率 {(evaluation.last_result.accuracy * 100).toFixed(1)}% •
                              召回率 {(evaluation.last_result.recall * 100).toFixed(1)}% •
                              F1 {(evaluation.last_result.f1 * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          知识库: {evaluation.kb_id} • 创建时间: {new Date(evaluation.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {evaluation.status === "running" ? (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            运行中
                          </span>
                        ) : evaluation.status === "completed" ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            已完成
                          </span>
                        ) : evaluation.status === "failed" ? (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            失败
                          </span>
                        ) : (
                          <button
                            onClick={() => runEvalMut.mutate(evaluation.eval_id)}
                            disabled={runEvalMut.isPending}
                            className="px-3 py-1 text-sm border rounded-md hover:bg-muted flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            运行
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Evaluation Dialog */}
        <FormDialog
          open={showNewEval}
          onOpenChange={setShowNewEval}
          title="新建评测"
          description="创建新的质量评测任务"
        >
          <FormField label="评测名称" required>
            <FormInput
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入评测名称"
            />
          </FormField>
          <FormField label="测试查询" required>
            <FormTextarea
              value={formQuery}
              onChange={(e) => setFormQuery(e.target.value)}
              placeholder="输入测试查询问题"
              rows={3}
            />
          </FormField>
          <FormField label="期望答案">
            <FormTextarea
              value={formExpected}
              onChange={(e) => setFormExpected(e.target.value)}
              placeholder="输入期望的答案（可选）"
              rows={3}
            />
          </FormField>
          <FormField label="知识库 ID" required>
            <FormInput
              value={formKbId}
              onChange={(e) => setFormKbId(e.target.value)}
              placeholder="输入知识库 ID"
            />
          </FormField>
          <DialogButton onClick={handleCreate} disabled={createEvalMut.isPending}>
            {createEvalMut.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </FormDialog>
      </div>
    </AppLayout>
  );
};

export default Quality;
