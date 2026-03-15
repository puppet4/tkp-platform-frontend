import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Database, Plus, ArrowLeft, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { FormDialog, FormField, FormInput, FormTextarea, FormSelect, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useConfirm } from "@/hooks/useConfirm";
import {
  useWorkspaces,
  useKnowledgeBases,
  useCreateKb,
  useDeleteKb,
  useUpdateKb,
  useWorkspaceMembers,
  useUpsertWorkspaceMember,
  useRemoveWorkspaceMember,
} from "@/hooks/useResources";
import { handleApiError } from "@/lib/error-handler";
import type { KnowledgeBaseData, WorkspaceMemberData } from "@/lib/api";

const WorkspaceDetail = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { canAction } = useRoleAccess();
  const confirm = useConfirm();

  const [showCreateKb, setShowCreateKb] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBaseData | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formEmbedding, setFormEmbedding] = useState("openai-text-embedding-3-small");
  const [formStrategy, setFormStrategy] = useState("hybrid");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const canKbCreate = canAction("api.kb.create");
  const canKbUpdate = canAction("api.kb.update");
  const canKbDelete = canAction("api.kb.delete");
  const canMemberManage = canAction("api.workspace.member.manage");

  const { data: workspaces = [] } = useWorkspaces();
  const workspace = workspaces.find((ws: any) => ws.workspace_id === workspaceId);
  const { data: kbs = [], isLoading: kbsLoading } = useKnowledgeBases(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId || "", { enabled: showMembers && !!workspaceId });

  // Handle workspace not found
  if (!kbsLoading && workspaceId && !workspace) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">工作空间不存在或无权访问</p>
            <button
              onClick={() => navigate("/workspaces")}
              className="text-primary hover:underline"
            >
              返回工作空间列表
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const createKbMut = useCreateKb();
  const updateKbMut = useUpdateKb();
  const deleteKbMut = useDeleteKb();
  const upsertMemberMut = useUpsertWorkspaceMember();
  const removeMemberMut = useRemoveWorkspaceMember();

  const handleCreateKb = () => {
    if (!formName.trim() || !workspaceId) return;

    const trimmedName = formName.trim();
    const trimmedDesc = formDesc.trim();

    if (trimmedName.length > 100) {
      toast.error("知识库名称不能超过100个字符");
      return;
    }

    createKbMut.mutate(
      {
        workspace_id: workspaceId,
        name: trimmedName,
        description: trimmedDesc,
        embedding_model: formEmbedding,
        retrieval_strategy: formStrategy,
      },
      {
        onSuccess: () => {
          toast.success("知识库已创建");
          setShowCreateKb(false);
          setFormName("");
          setFormDesc("");
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleUpdateKb = () => {
    if (!editingKb || !formName.trim()) return;

    const trimmedName = formName.trim();
    const trimmedDesc = formDesc.trim();

    if (trimmedName.length > 100) {
      toast.error("知识库名称不能超过100个字符");
      return;
    }

    updateKbMut.mutate(
      {
        kbId: editingKb.id,
        name: trimmedName,
        description: trimmedDesc,
      },
      {
        onSuccess: () => {
          toast.success("知识库已更新");
          setEditingKb(null);
          setFormName("");
          setFormDesc("");
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleDeleteKb = async (kb: KnowledgeBaseData) => {
    if (!await confirm({ title: "删除知识库", message: `确定要删除知识库"${kb.name}"吗？`, confirmLabel: "删除" })) return;
    deleteKbMut.mutate(kb.id, {
      onSuccess: () => toast.success("知识库已删除"),
      onError: (error) => toast.error(handleApiError(error)),
    });
  };

  const handleAddMember = () => {
    if (!memberUserId.trim() || !workspaceId) return;

    const trimmedUserId = memberUserId.trim();

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUserId)) {
      toast.error("用户ID格式不正确");
      return;
    }

    upsertMemberMut.mutate(
      { workspaceId, userId: trimmedUserId, role: memberRole },
      {
        onSuccess: () => {
          toast.success("成员已添加");
          setMemberUserId("");
          setMemberRole("member");
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId || !await confirm({ title: "移除成员", message: "确定要移除该成员吗？", confirmLabel: "移除" })) return;
    removeMemberMut.mutate(
      { workspaceId, userId },
      {
        onSuccess: () => toast.success("成员已移除"),
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const openEditKb = (kb: KnowledgeBaseData) => {
    setEditingKb(kb);
    setFormName(kb.name);
    setFormDesc(kb.description || "");
  };

  if (!workspace) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          工作空间不存在
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/workspaces")}
              className="p-2 hover:bg-muted rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{workspace.name}</h1>
              {workspace.description && (
                <p className="text-sm text-muted-foreground mt-1">{workspace.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canMemberManage && (
              <button
                onClick={() => setShowMembers(true)}
                className="px-4 py-2 border rounded-md hover:bg-muted flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                成员管理
              </button>
            )}
            {canKbCreate && (
              <button
                onClick={() => setShowCreateKb(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                创建知识库
              </button>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">知识库列表</h2>
          </div>
          <div className="p-4">
            {kbsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : kbs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无知识库
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kbs.map((kb: KnowledgeBaseData) => (
                  <div
                    key={kb.id}
                    className="p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {canKbUpdate && (
                          <button
                            onClick={() => openEditKb(kb)}
                            className="p-1.5 hover:bg-muted rounded-md"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canKbDelete && (
                          <button
                            onClick={() => handleDeleteKb(kb)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">{kb.name}</h3>
                    {kb.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{kb.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-muted rounded">{kb.embedding_model}</span>
                      <span className="px-2 py-1 bg-muted rounded">{kb.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create KB Dialog */}
        <FormDialog
          open={showCreateKb}
          onOpenChange={setShowCreateKb}
          title="创建知识库"
          onSubmit={handleCreateKb}
          loading={createKbMut.isPending}
        >
          <FormField label="知识库名称" required>
            <FormInput
              value={formName}
              onChange={setFormName}
              placeholder="输入知识库名称"
            />
          </FormField>
          <FormField label="描述">
            <FormTextarea
              value={formDesc}
              onChange={setFormDesc}
              placeholder="输入描述（可选）"
            />
          </FormField>
          <FormField label="向量模型">
            <FormSelect value={formEmbedding} onChange={setFormEmbedding}>
              <option value="openai-text-embedding-3-small">OpenAI text-embedding-3-small</option>
              <option value="openai-text-embedding-3-large">OpenAI text-embedding-3-large</option>
            </FormSelect>
          </FormField>
          <FormField label="检索策略">
            <FormSelect value={formStrategy} onChange={setFormStrategy}>
              <option value="hybrid">混合检索</option>
              <option value="vector">向量检索</option>
              <option value="keyword">关键词检索</option>
            </FormSelect>
          </FormField>
        </FormDialog>

        {/* Edit KB Dialog */}
        <FormDialog
          open={!!editingKb}
          onOpenChange={(open) => !open && setEditingKb(null)}
          title="编辑知识库"
          onSubmit={handleUpdateKb}
          loading={updateKbMut.isPending}
        >
          <FormField label="知识库名称" required>
            <FormInput
              value={formName}
              onChange={setFormName}
              placeholder="输入知识库名称"
            />
          </FormField>
          <FormField label="描述">
            <FormTextarea
              value={formDesc}
              onChange={setFormDesc}
              placeholder="输入描述（可选）"
            />
          </FormField>
        </FormDialog>

        {/* Members Dialog */}
        <FormDialog
          open={showMembers}
          onOpenChange={setShowMembers}
          title="成员管理"
          onSubmit={handleAddMember}
          submitLabel="添加成员"
          loading={upsertMemberMut.isPending}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <FormField label="用户ID">
                <FormInput
                  value={memberUserId}
                  onChange={setMemberUserId}
                  placeholder="输入用户ID"
                />
              </FormField>
              <FormField label="角色">
                <FormSelect value={memberRole} onChange={setMemberRole}>
                  <option value="owner">所有者</option>
                  <option value="editor">编辑者</option>
                  <option value="member">成员</option>
                </FormSelect>
              </FormField>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">当前成员</h3>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无成员</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member: WorkspaceMemberData) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div>
                        <div className="font-medium text-sm">{member.email}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1 hover:bg-destructive/10 text-destructive rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FormDialog>
      </div>
    </AppLayout>
  );
};

export default WorkspaceDetail;
