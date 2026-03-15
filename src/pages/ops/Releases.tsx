import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Rocket, Plus, Loader2, Webhook, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi, type ReleaseRolloutData, type AlertWebhookData } from "@/lib/api";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useConfirm } from "@/hooks/useConfirm";
import { handleApiError } from "@/lib/error-handler";

const Releases = () => {
  const qc = useQueryClient();
  const { roleName } = useRoleAccess();
  const confirm = useConfirm();
  const [showNewRelease, setShowNewRelease] = useState(false);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<AlertWebhookData | null>(null);

  const [formVersion, setFormVersion] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStrategy, setFormStrategy] = useState("blue_green");
  const [formPercentage, setFormPercentage] = useState("100");

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  const canOpsManage = roleName === "owner" || roleName === "admin";

  const { data: releases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ["ops-releases"],
    queryFn: () => opsApi.listReleases(),
    enabled: canOpsManage,
  });

  const { data: webhooks = [], isLoading: webhooksLoading } = useQuery({
    queryKey: ["ops-webhooks"],
    queryFn: () => opsApi.listWebhooks(),
    enabled: canOpsManage,
  });

  const createReleaseMut = useMutation({
    mutationFn: (data: { version: string; description: string; strategy: string; target_percentage: number }) =>
      opsApi.createRelease(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-releases"] });
      toast.success("发布已创建");
      setShowNewRelease(false);
      setFormVersion("");
      setFormDesc("");
      setFormStrategy("blue_green");
      setFormPercentage("100");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const rollbackReleaseMut = useMutation({
    mutationFn: (releaseId: string) => opsApi.rollbackRelease(releaseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-releases"] });
      toast.success("发布已回滚");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const createWebhookMut = useMutation({
    mutationFn: (data: { name: string; url: string; events: string[] }) =>
      opsApi.createWebhook(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-webhooks"] });
      toast.success("Webhook 已创建");
      setShowNewWebhook(false);
      setWebhookName("");
      setWebhookUrl("");
      setWebhookEvents([]);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateWebhookMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; url?: string; events?: string[] } }) =>
      opsApi.updateWebhook(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-webhooks"] });
      toast.success("Webhook 已更新");
      setEditingWebhook(null);
      setWebhookName("");
      setWebhookUrl("");
      setWebhookEvents([]);
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const deleteWebhookMut = useMutation({
    mutationFn: (id: string) => opsApi.deleteWebhook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-webhooks"] });
      toast.success("Webhook 已删除");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleCreateRelease = () => {
    if (!formVersion.trim() || !formDesc.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    createReleaseMut.mutate({
      version: formVersion,
      description: formDesc,
      strategy: formStrategy,
      target_percentage: parseInt(formPercentage),
    });
  };

  const handleCreateWebhook = () => {
    if (!webhookName.trim() || !webhookUrl.trim() || webhookEvents.length === 0) {
      toast.error("请填写完整信息");
      return;
    }
    createWebhookMut.mutate({
      name: webhookName,
      url: webhookUrl,
      events: webhookEvents,
    });
  };

  const handleUpdateWebhook = () => {
    if (!editingWebhook || !webhookName.trim() || !webhookUrl.trim()) return;
    updateWebhookMut.mutate({
      id: editingWebhook.webhook_id,
      data: {
        name: webhookName,
        url: webhookUrl,
        events: webhookEvents,
      },
    });
  };

  const openEditWebhook = (webhook: AlertWebhookData) => {
    setEditingWebhook(webhook);
    setWebhookName(webhook.name);
    setWebhookUrl(webhook.url);
    setWebhookEvents(webhook.events || []);
  };

  const toggleEvent = (event: string) => {
    setWebhookEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
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
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="w-6 h-6" />
            发布管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            版本发布和 Webhook 配置
          </p>
        </div>

        {/* Releases Section */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">版本发布</h2>
            <button
              onClick={() => setShowNewRelease(true)}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              新建发布
            </button>
          </div>
          <div className="p-4">
            {releasesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无发布记录
              </div>
            ) : (
              <div className="space-y-2">
                {releases.map((release: ReleaseRolloutData) => (
                  <div key={release.rollout_id} className="p-4 border rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">版本 {release.version}</span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            release.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : release.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : release.status === "rolled_back"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {release.status === "completed" ? "已完成" :
                             release.status === "in_progress" ? "进行中" :
                             release.status === "rolled_back" ? "已回滚" : "待发布"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {release.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          策略: {release.strategy === "blue_green" ? "蓝绿部署" :
                                release.strategy === "canary" ? "金丝雀发布" : "滚动更新"} •
                          目标比例: {release.target_percentage}% •
                          创建时间: {new Date(release.created_at).toLocaleString()}
                        </div>
                      </div>
                      {release.status === "in_progress" && (
                        <button
                          onClick={async () => {
                            if (await confirm({ title: "回滚发布", message: "确定要回滚此发布吗？", variant: "warning", confirmLabel: "回滚" })) {
                              rollbackReleaseMut.mutate(release.rollout_id);
                            }
                          }}
                          disabled={rollbackReleaseMut.isPending}
                          className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded-md hover:bg-red-50"
                        >
                          回滚
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Webhooks Section */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Webhook 配置
            </h2>
            <button
              onClick={() => setShowNewWebhook(true)}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              新建 Webhook
            </button>
          </div>
          <div className="p-4">
            {webhooksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无 Webhook 配置
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.map((webhook: AlertWebhookData) => (
                  <div key={webhook.webhook_id} className="p-4 border rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold mb-2">{webhook.name}</div>
                        <div className="text-sm text-muted-foreground mb-2 font-mono break-all">
                          {webhook.url}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events?.map((event: string) => (
                            <span key={event} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditWebhook(webhook)}
                          className="p-2 hover:bg-muted rounded-md"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm({ title: "删除 Webhook", message: "确定要删除此 Webhook 吗？", confirmLabel: "删除" })) {
                              deleteWebhookMut.mutate(webhook.webhook_id);
                            }
                          }}
                          disabled={deleteWebhookMut.isPending}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Release Dialog */}
        <FormDialog
          open={showNewRelease}
          onOpenChange={setShowNewRelease}
          title="新建发布"
          description="创建新的版本发布"
        >
          <FormField label="版本号" required>
            <FormInput
              value={formVersion}
              onChange={(e) => setFormVersion(e.target.value)}
              placeholder="例如: v1.2.3"
            />
          </FormField>
          <FormField label="描述" required>
            <FormTextarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="描述此版本的更新内容"
              rows={3}
            />
          </FormField>
          <FormField label="发布策略">
            <FormSelect value={formStrategy} onChange={(e) => setFormStrategy(e.target.value)}>
              <option value="blue_green">蓝绿部署</option>
              <option value="canary">金丝雀发布</option>
              <option value="rolling">滚动更新</option>
            </FormSelect>
          </FormField>
          <FormField label="目标比例 (%)">
            <FormInput
              type="number"
              value={formPercentage}
              onChange={(e) => setFormPercentage(e.target.value)}
              placeholder="100"
              min="0"
              max="100"
            />
          </FormField>
          <DialogButton onClick={handleCreateRelease} disabled={createReleaseMut.isPending}>
            {createReleaseMut.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </FormDialog>

        {/* Create Webhook Dialog */}
        <FormDialog
          open={showNewWebhook}
          onOpenChange={setShowNewWebhook}
          title="新建 Webhook"
          description="配置告警通知 Webhook"
        >
          <FormField label="名称" required>
            <FormInput
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              placeholder="输入 Webhook 名称"
            />
          </FormField>
          <FormField label="URL" required>
            <FormInput
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </FormField>
          <FormField label="事件类型" required>
            <div className="space-y-2">
              {["alert.triggered", "alert.resolved", "incident.created", "incident.resolved", "release.deployed"].map(event => (
                <label key={event} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{event}</span>
                </label>
              ))}
            </div>
          </FormField>
          <DialogButton onClick={handleCreateWebhook} disabled={createWebhookMut.isPending}>
            {createWebhookMut.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </FormDialog>

        {/* Edit Webhook Dialog */}
        <FormDialog
          open={!!editingWebhook}
          onOpenChange={(open) => !open && setEditingWebhook(null)}
          title="编辑 Webhook"
          description="更新 Webhook 配置"
        >
          <FormField label="名称" required>
            <FormInput
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              placeholder="输入 Webhook 名称"
            />
          </FormField>
          <FormField label="URL" required>
            <FormInput
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </FormField>
          <FormField label="事件类型" required>
            <div className="space-y-2">
              {["alert.triggered", "alert.resolved", "incident.created", "incident.resolved", "release.deployed"].map(event => (
                <label key={event} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{event}</span>
                </label>
              ))}
            </div>
          </FormField>
          <DialogButton onClick={handleUpdateWebhook} disabled={updateWebhookMut.isPending}>
            {updateWebhookMut.isPending ? "更新中..." : "更新"}
          </DialogButton>
        </FormDialog>
      </div>
    </AppLayout>
  );
};

export default Releases;
