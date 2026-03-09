import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AlertTriangle, Plus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { opsApi, type IncidentTicketData } from "@/lib/api";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { handleApiError } from "@/lib/error-handler";

const Incidents = () => {
  const qc = useQueryClient();
  const { roleName } = useRoleAccess();
  const [showCreate, setShowCreate] = useState(false);
  const [editingIncident, setEditingIncident] = useState<IncidentTicketData | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSeverity, setFormSeverity] = useState("medium");
  const [formStatus, setFormStatus] = useState("open");

  const canOpsManage = roleName === "owner" || roleName === "admin";

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["ops-incidents"],
    queryFn: () => opsApi.listIncidents(),
    enabled: canOpsManage,
  });

  const createMut = useMutation({
    mutationFn: (data: { title: string; description: string; severity: string }) =>
      opsApi.createIncident(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-incidents"] });
      toast.success("事件已创建");
      setShowCreate(false);
      setFormTitle("");
      setFormDesc("");
      setFormSeverity("medium");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string; status?: string; severity?: string } }) =>
      opsApi.updateIncident(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ops-incidents"] });
      toast.success("事件已更新");
      setEditingIncident(null);
      setFormTitle("");
      setFormDesc("");
      setFormStatus("open");
      setFormSeverity("medium");
    },
    onError: (error) => toast.error(handleApiError(error)),
  });

  const handleCreate = () => {
    if (!formTitle.trim() || !formDesc.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    createMut.mutate({
      title: formTitle,
      description: formDesc,
      severity: formSeverity,
    });
  };

  const handleUpdate = () => {
    if (!editingIncident || !formTitle.trim()) return;
    updateMut.mutate({
      id: editingIncident.incident_id,
      data: {
        title: formTitle,
        description: formDesc,
        status: formStatus,
        severity: formSeverity,
      },
    });
  };

  const openEdit = (incident: IncidentTicketData) => {
    setEditingIncident(incident);
    setFormTitle(incident.title);
    setFormDesc(incident.description || "");
    setFormStatus(incident.status);
    setFormSeverity(incident.severity);
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

  const openIncidents = incidents.filter((i: IncidentTicketData) => i.status === "open");
  const inProgressIncidents = incidents.filter((i: IncidentTicketData) => i.status === "in_progress");
  const resolvedIncidents = incidents.filter((i: IncidentTicketData) => i.status === "resolved");

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              事件管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              故障事件跟踪和处理
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            创建事件
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">待处理</div>
            <div className="text-2xl font-bold text-orange-600">{openIncidents.length}</div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">处理中</div>
            <div className="text-2xl font-bold text-blue-600">{inProgressIncidents.length}</div>
          </div>
          <div className="p-4 bg-card border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">已解决</div>
            <div className="text-2xl font-bold text-green-600">{resolvedIncidents.length}</div>
          </div>
        </div>

        {/* Incidents List */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="font-semibold">事件列表</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无事件
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.map((incident: IncidentTicketData) => (
                  <div
                    key={incident.incident_id}
                    className="p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => openEdit(incident)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{incident.title}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              incident.severity === "critical"
                                ? "bg-red-100 text-red-800"
                                : incident.severity === "high"
                                ? "bg-orange-100 text-orange-800"
                                : incident.severity === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {incident.severity === "critical"
                              ? "严重"
                              : incident.severity === "high"
                              ? "高"
                              : incident.severity === "medium"
                              ? "中"
                              : "低"}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {incident.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          创建时间: {new Date(incident.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        {incident.status === "open" && (
                          <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                            待处理
                          </span>
                        )}
                        {incident.status === "in_progress" && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            处理中
                          </span>
                        )}
                        {incident.status === "resolved" && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            已解决
                          </span>
                        )}
                        {incident.status === "closed" && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            已关闭
                          </span>
                        )}
                      </div>
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
          title="创建事件"
          description="记录新的故障事件"
        >
          <FormField label="标题" required>
            <FormInput
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="输入事件标题"
            />
          </FormField>
          <FormField label="描述" required>
            <FormTextarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="详细描述事件情况"
              rows={4}
            />
          </FormField>
          <FormField label="严重程度">
            <FormSelect value={formSeverity} onChange={(e) => setFormSeverity(e.target.value)}>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="critical">严重</option>
            </FormSelect>
          </FormField>
          <DialogButton onClick={handleCreate} disabled={createMut.isPending}>
            {createMut.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </FormDialog>

        {/* Edit Dialog */}
        <FormDialog
          open={!!editingIncident}
          onOpenChange={(open) => !open && setEditingIncident(null)}
          title="编辑事件"
          description="更新事件信息和状态"
        >
          <FormField label="标题" required>
            <FormInput
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="输入事件标题"
            />
          </FormField>
          <FormField label="描述">
            <FormTextarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="详细描述事件情况"
              rows={4}
            />
          </FormField>
          <FormField label="状态">
            <FormSelect value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
              <option value="open">待处理</option>
              <option value="in_progress">处理中</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </FormSelect>
          </FormField>
          <FormField label="严重程度">
            <FormSelect value={formSeverity} onChange={(e) => setFormSeverity(e.target.value)}>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="critical">严重</option>
            </FormSelect>
          </FormField>
          <DialogButton onClick={handleUpdate} disabled={updateMut.isPending}>
            {updateMut.isPending ? "更新中..." : "更新"}
          </DialogButton>
        </FormDialog>
      </div>
    </AppLayout>
  );
};

export default Incidents;
