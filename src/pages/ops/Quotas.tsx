import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { TrendingUp, Plus, Loader2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi, type QuotaData } from "@/lib/api";
import { FormDialog, FormField, FormInput, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Quotas = () => {
  const qc = useQueryClient();
  const { roleName } = useRoleAccess();
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuota, setEditingQuota] = useState<QuotaData | null>(null);
  const [formMetric, setFormMetric] = useState("chat_tokens");
  const [formScope, setFormScope] = useState("tenant");
  const [formScopeId, setFormScopeId] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formWindow, setFormWindow] = useState("daily");

  const canOpsManage = roleName === "owner" || roleName === "admin";

  const { data: quotas = [], isLoading } = useQuery({
    queryKey: ["ops-quotas"],
    queryFn: () => opsApi.listQuotas(),
    enabled: canOpsManage,
  });

  const createMut = useMutation({
    mutationFn: (data: { metric_code: string; scope_type: string; scope_id: string; limit_value: number; window_type: string }) =>
      opsApi.createQuota(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-quotas"] });
      toast.success("配额已创建");
      setShowCreate(false);
      resetForm();
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { limit_value: number } }) =>
      opsApi.updateQuota(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-quotas"] });
      toast.success("配额已更新");
      setEditingQuota(null);
      resetForm();
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const resetForm = () => {
    setFormMetric("chat_tokens");
    setFormScope("tenant");
    setFormScopeId("");
    setFormLimit("");
    setFormWindow("daily");
  };

  const handleCreate = () => {
    if (!formScopeId.trim() || !formLimit.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    createMut.mutate({
      metric_code: formMetric,
      scope_type: formScope,
      scope_id: formScopeId,
      limit_value: parseInt(formLimit),
      window_type: formWindow,
    });
  };

  const handleUpdate = () => {
    if (!editingQuota || !formLimit.trim()) return;
    updateMut.mutate({
      id: editingQuota.quota_id,
      data: { limit_value: parseInt(formLimit) },
    });
  };

  const openEdit = (quota: QuotaData) => {
    setEditingQuota(quota);
    setFormLimit(quota.limit_value.toString());
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
              配额管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              租户和工作空间配额管理
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建配额
          </button>
        </div>

        {/* Quotas List */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="font-semibold">配额列表</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : quotas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无配额配置
              </div>
            ) : (
              <div className="space-y-2">
                {quotas.map((quota: QuotaData) => (
                  <div
                    key={quota.quota_id}
                    className="p-4 border rounded-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">
                            {quota.metric_code === "chat_tokens"
                              ? "对话 Token"
                              : quota.metric_code === "documents"
                              ? "文档数量"
                              : quota.metric_code === "storage_bytes"
                              ? "存储空间"
                              : quota.metric_code}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                            {quota.scope_type === "tenant" ? "租户" : "工作空间"}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
                            {quota.window_type === "daily"
                              ? "每日"
                              : quota.window_type === "monthly"
                              ? "每月"
                              : "总量"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          范围 ID: {quota.scope_id}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">限额: </span>
                            <span className="font-medium">{quota.limit_value.toLocaleString()}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">已使用: </span>
                            <span className="font-medium">{quota.current_usage?.toLocaleString() || 0}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">使用率: </span>
                            <span className={`font-medium ${
                              (quota.current_usage || 0) / quota.limit_value > 0.8
                                ? "text-red-600"
                                : (quota.current_usage || 0) / quota.limit_value > 0.6
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}>
                              {((quota.current_usage || 0) / quota.limit_value * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              (quota.current_usage || 0) / quota.limit_value > 0.8
                                ? "bg-red-600"
                                : (quota.current_usage || 0) / quota.limit_value > 0.6
                                ? "bg-orange-600"
                                : "bg-green-600"
                            }`}
                            style={{ width: `${Math.min(((quota.current_usage || 0) / quota.limit_value * 100), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <button
                        onClick={() => openEdit(quota)}
                        className="p-2 hover:bg-muted rounded-md"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Dialog */}
        <FormDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          title="创建配额"
          description="为租户或工作空间设置配额限制"
        >
          <FormField label="指标类型" required>
            <FormSelect value={formMetric} onChange={(e) => setFormMetric(e.target.value)}>
              <option value="chat_tokens">对话 Token</option>
              <option value="documents">文档数量</option>
              <option value="storage_bytes">存储空间</option>
              <option value="api_calls">API 调用</option>
            </FormSelect>
          </FormField>
          <FormField label="范围类型" required>
            <FormSelect value={formScope} onChange={(e) => setFormScope(e.target.value)}>
              <option value="tenant">租户</option>
              <option value="workspace">工作空间</option>
            </FormSelect>
          </FormField>
          <FormField label="范围 ID" required>
            <FormInput
              value={formScopeId}
              onChange={(e) => setFormScopeId(e.target.value)}
              placeholder="输入租户或工作空间 ID"
            />
          </FormField>
          <FormField label="限额值" required>
            <FormInput
              type="number"
              value={formLimit}
              onChange={(e) => setFormLimit(e.target.value)}
              placeholder="输入限额值"
            />
          </FormField>
          <FormField label="时间窗口" required>
            <FormSelect value={formWindow} onChange={(e) => setFormWindow(e.target.value)}>
              <option value="daily">每日</option>
              <option value="monthly">每月</option>
              <option value="total">总量</option>
            </FormSelect>
          </FormField>
          <DialogButton onClick={handleCreate} disabled={createMut.isPending}>
            {createMut.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </FormDialog>

        {/* Edit Dialog */}
        <FormDialog
          open={!!editingQuota}
          onOpenChange={(open) => !open && setEditingQuota(null)}
          title="编辑配额"
          description="更新配额限制值"
        >
          <FormField label="限额值" required>
            <FormInput
              type="number"
              value={formLimit}
              onChange={(e) => setFormLimit(e.target.value)}
              placeholder="输入限额值"
            />
          </FormField>
          <DialogButton onClick={handleUpdate} disabled={updateMut.isPending}>
            {updateMut.isPending ? "更新中..." : "更新"}
          </DialogButton>
        </FormDialog>
      </div>
    </AppLayout>
  );
};

export default Quotas;
