import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { FolderOpen, Plus, Search, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FormDialog, FormField, FormInput, FormTextarea, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useConfirm } from "@/hooks/useConfirm";
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace, useUpdateWorkspace } from "@/hooks/useResources";
import { handleApiError } from "@/lib/error-handler";
import type { WorkspaceData } from "@/lib/api";

const Workspaces = () => {
  const navigate = useNavigate();
  const { canAction } = useRoleAccess();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingWs, setEditingWs] = useState<WorkspaceData | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSlug, setFormSlug] = useState("");

  const canWorkspaceCreate = canAction("api.workspace.create");
  const canWorkspaceUpdate = canAction("api.workspace.update");
  const canWorkspaceDelete = canAction("api.workspace.delete");

  const { data: workspaces = [], isLoading } = useWorkspaces();
  const createMut = useCreateWorkspace();
  const updateMut = useUpdateWorkspace();
  const deleteMut = useDeleteWorkspace();

  const filteredWorkspaces = workspaces.filter((ws: WorkspaceData) =>
    ws.name.toLowerCase().includes(search.toLowerCase()) ||
    ws.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error("请输入工作空间名称");
      return;
    }
    createMut.mutate(
      { name: formName, description: formDesc, slug: formSlug || undefined },
      {
        onSuccess: () => {
          toast.success("工作空间已创建");
          setShowCreate(false);
          setFormName("");
          setFormDesc("");
          setFormSlug("");
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleUpdate = () => {
    if (!editingWs || !formName.trim()) return;
    updateMut.mutate(
      { workspaceId: editingWs.workspace_id, name: formName, description: formDesc, slug: formSlug || undefined },
      {
        onSuccess: () => {
          toast.success("工作空间已更新");
          setEditingWs(null);
          setFormName("");
          setFormDesc("");
          setFormSlug("");
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleDelete = async (ws: WorkspaceData) => {
    if (!await confirm({ title: "删除工作空间", message: `确定要删除工作空间"${ws.name}"吗？`, confirmLabel: "删除" })) return;
    deleteMut.mutate(ws.workspace_id, {
      onSuccess: () => toast.success("工作空间已删除"),
      onError: (error) => toast.error(handleApiError(error)),
    });
  };

  const openEdit = (ws: WorkspaceData) => {
    setEditingWs(ws);
    setFormName(ws.name);
    setFormDesc(ws.description || "");
    setFormSlug(ws.slug || "");
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">工作空间</h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理工作空间和知识库
            </p>
          </div>
          {canWorkspaceCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              创建工作空间
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索工作空间..."
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? "未找到匹配的工作空间" : "暂无工作空间"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkspaces.map((ws: WorkspaceData) => (
              <div
                key={ws.workspace_id}
                className="p-6 bg-card border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/workspaces/${ws.workspace_id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FolderOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {canWorkspaceUpdate && (
                      <button
                        onClick={() => openEdit(ws)}
                        className="p-2 hover:bg-muted rounded-md"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {canWorkspaceDelete && (
                      <button
                        onClick={() => handleDelete(ws)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1">{ws.name}</h3>
                {ws.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {ws.description}
                  </p>
                )}
                {ws.slug && (
                  <div className="text-xs text-muted-foreground">
                    slug: {ws.slug}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <FormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="创建工作空间"
        description="创建一个新的工作空间来组织知识库"
      >
        <FormField label="名称" required>
          <FormInput
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="输入工作空间名称"
          />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="输入工作空间描述"
            rows={3}
          />
        </FormField>
        <FormField label="Slug">
          <FormInput
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            placeholder="输入唯一标识符（可选）"
          />
        </FormField>
        <DialogButton onClick={handleCreate} disabled={createMut.isPending}>
          {createMut.isPending ? "创建中..." : "创建"}
        </DialogButton>
      </FormDialog>

      {/* Edit Dialog */}
      <FormDialog
        open={!!editingWs}
        onOpenChange={(open) => !open && setEditingWs(null)}
        title="编辑工作空间"
        description="修改工作空间信息"
      >
        <FormField label="名称" required>
          <FormInput
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="输入工作空间名称"
          />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="输入工作空间描述"
            rows={3}
          />
        </FormField>
        <FormField label="Slug">
          <FormInput
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            placeholder="输入唯一标识符"
          />
        </FormField>
        <DialogButton onClick={handleUpdate} disabled={updateMut.isPending}>
          {updateMut.isPending ? "更新中..." : "更新"}
        </DialogButton>
      </FormDialog>
    </AppLayout>
  );
};

export default Workspaces;
