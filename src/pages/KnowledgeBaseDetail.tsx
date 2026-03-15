import React, { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { FileText, Plus, ArrowLeft, Upload, Loader2, Trash2, RefreshCw, Users, Folder, ChevronRight, ChevronDown, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { FormDialog, FormField, FormInput, DialogButton } from "@/components/FormDialog";
import { toast } from "sonner";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { BatchUploadDialog } from "@/components/BatchUploadDialog";
import {
  useKnowledgeBases,
  useKbStats,
  useDocuments,
  useDeleteDocument,
  useBatchDeleteDocuments,
  useReindexDocument,
  useUpdateDocument,
  useKbMembers,
  useUpsertKbMember,
  useRemoveKbMember,
} from "@/hooks/useResources";
import { handleApiError } from "@/lib/error-handler";
import type { DocumentData, KbMemberData } from "@/lib/api";

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  docs: DocumentData[];
}

function buildDocTree(docs: DocumentData[]): { rootDocs: DocumentData[]; folders: FolderNode[] } {
  const rootDocs: DocumentData[] = [];
  const folderMap = new Map<string, FolderNode>();

  const getOrCreateFolder = (path: string): FolderNode => {
    if (folderMap.has(path)) return folderMap.get(path)!;
    const parts = path.split("/");
    const node: FolderNode = { name: parts[parts.length - 1], path, children: [], docs: [] };
    folderMap.set(path, node);
    if (parts.length > 1) {
      const parent = getOrCreateFolder(parts.slice(0, -1).join("/"));
      if (!parent.children.find((c) => c.path === path)) parent.children.push(node);
    }
    return node;
  };

  for (const doc of docs) {
    const uri = doc.source_uri;
    if (!uri || !uri.includes("/")) {
      rootDocs.push(doc);
    } else {
      const lastSlash = uri.lastIndexOf("/");
      const dirPath = uri.substring(0, lastSlash);
      getOrCreateFolder(dirPath).docs.push(doc);
    }
  }

  const topFolders: FolderNode[] = [];
  for (const [path] of folderMap) {
    if (!path.includes("/")) topFolders.push(folderMap.get(path)!);
  }
  topFolders.sort((a, b) => a.name.localeCompare(b.name));
  return { rootDocs, folders: topFolders };
}

function countFolderDocs(folder: FolderNode): number {
  let count = folder.docs.length;
  for (const child of folder.children) count += countFolderDocs(child);
  return count;
}

function collectFolderDocs(folder: FolderNode): DocumentData[] {
  const result: DocumentData[] = [...folder.docs];
  for (const child of folder.children) result.push(...collectFolderDocs(child));
  return result;
}

const KnowledgeBaseDetail = () => {
  const { kbId } = useParams<{ kbId: string }>();
  const navigate = useNavigate();
  const { canAction } = useRoleAccess();

  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState("viewer");
  const [renamingDoc, setRenamingDoc] = useState<DocumentData | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const canDocumentWrite = canAction("api.document.write");
  const canDocumentDelete = canAction("api.document.delete");
  const canMemberManage = canAction("api.kb.member.manage");

  const { data: kbs = [] } = useKnowledgeBases();
  const kb = kbs.find((k: any) => k.id === kbId);
  const { data: stats } = useKbStats(kbId || "");
  const { data: documents = [], isLoading: docsLoading } = useDocuments(kbId || "");
  const { data: members = [] } = useKbMembers(kbId || "", { enabled: showMembers && !!kbId });
  const docTree = useMemo(() => buildDocTree(documents), [documents]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, []);

  // Handle KB not found
  if (!docsLoading && kbId && !kb) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">知识库不存在或无权访问</p>
            <button
              onClick={() => navigate("/resources")}
              className="text-primary hover:underline"
            >
              返回资源列表
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const deleteMut = useDeleteDocument();
  const batchDeleteMut = useBatchDeleteDocuments();
  const reindexMut = useReindexDocument();
  const updateDocMut = useUpdateDocument();
  const upsertMemberMut = useUpsertKbMember();
  const removeMemberMut = useRemoveKbMember();

  const handleDelete = (doc: DocumentData) => {
    if (!confirm(`确定要删除文档"${doc.title}"吗？`)) return;
    deleteMut.mutate(doc.id, {
      onSuccess: () => toast.success("文档已删除"),
      onError: (error) => toast.error(handleApiError(error)),
    });
  };

  const handleDeleteFolder = (folder: FolderNode) => {
    const allDocs = collectFolderDocs(folder);
    if (allDocs.length === 0) return;
    if (!confirm(`确定要删除文件夹"${folder.name}"及其中 ${allDocs.length} 个文档吗？`)) return;
    batchDeleteMut.mutate(allDocs.map((d) => d.id), {
      onSuccess: () => toast.success(`已删除 ${allDocs.length} 个文档`),
      onError: (error) => toast.error(handleApiError(error)),
    });
  };

  const handleRename = () => {
    if (!renamingDoc || !renameTitle.trim()) return;
    updateDocMut.mutate(
      { docId: renamingDoc.id, data: { title: renameTitle.trim() } },
      {
        onSuccess: () => {
          toast.success("文档已重命名");
          setRenamingDoc(null);
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleReindex = (doc: DocumentData) => {
    if (!confirm(`确定要重新索引文档"${doc.title}"吗？`)) return;
    reindexMut.mutate(doc.id, {
      onSuccess: () => toast.success("重新索引任务已提交"),
      onError: (error) => toast.error(handleApiError(error)),
    });
  };

  const handleAddMember = () => {
    if (!memberUserId.trim() || !kbId) return;

    const trimmedUserId = memberUserId.trim();

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUserId)) {
      toast.error("用户ID格式不正确");
      return;
    }

    upsertMemberMut.mutate(
      { kbId, userId: trimmedUserId, role: memberRole },
      {
        onSuccess: () => {
          toast.success("成员已添加");
          setMemberUserId("");
          setMemberRole("viewer");
        },
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  const handleRemoveMember = (userId: string) => {
    if (!kbId || !confirm("确定要移除该成员吗？")) return;
    removeMemberMut.mutate(
      { kbId, userId },
      {
        onSuccess: () => toast.success("成员已移除"),
        onError: (error) => toast.error(handleApiError(error)),
      }
    );
  };

  if (!kb) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">
          知识库不存在
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
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{kb.name}</h1>
              {kb.description && (
                <p className="text-sm text-muted-foreground mt-1">{kb.description}</p>
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
            {canDocumentWrite && (
              <button
                onClick={() => setShowBatchUpload(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                上传文档
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-sm text-muted-foreground">总文档数</div>
              <div className="text-2xl font-bold mt-1">{stats.document_total}</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-sm text-muted-foreground">就绪文档</div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.document_ready}</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-sm text-muted-foreground">处理中</div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{stats.document_processing}</div>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <div className="text-sm text-muted-foreground">总切片数</div>
              <div className="text-2xl font-bold mt-1">{stats.chunk_total}</div>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-card rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">文档列表</h2>
          </div>
          <div className="p-4">
            {docsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                暂无文档
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const renderDocCard = (doc: DocumentData, depth: number) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                      style={{ marginLeft: depth * 20 }}
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.source_type} • 版本 {doc.current_version}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            doc.status === "ready"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {doc.status === "ready" ? "就绪" : doc.status === "processing" ? "处理中" : "失败"}
                        </span>
                        {canDocumentWrite && (
                          <button
                            onClick={() => { setRenamingDoc(doc); setRenameTitle(doc.title); }}
                            className="p-2 hover:bg-muted rounded-md"
                            title="重命名"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDocumentWrite && (
                          <button
                            onClick={() => handleReindex(doc)}
                            className="p-2 hover:bg-muted rounded-md"
                            title="重新索引"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {canDocumentDelete && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  const renderFolder = (folder: FolderNode, depth: number): React.ReactNode => {
                    const expanded = expandedFolders.has(folder.path);
                    const total = countFolderDocs(folder);
                    return (
                      <React.Fragment key={`folder-${folder.path}`}>
                        <div
                          className="flex items-center justify-between p-4 border rounded-md hover:bg-muted/50 cursor-pointer"
                          style={{ marginLeft: depth * 20 }}
                          onClick={() => toggleFolder(folder.path)}
                        >
                          <div className="flex items-center gap-3">
                            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <Folder className="w-5 h-5 text-amber-500" />
                            <span className="font-medium">{folder.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{total}</span>
                          </div>
                          {canDocumentDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                              className="p-2 hover:bg-destructive/10 text-destructive rounded-md"
                              title="删除文件夹"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {expanded && (
                          <>
                            {folder.children.map((child) => renderFolder(child, depth + 1))}
                            {folder.docs.map((doc) => renderDocCard(doc, depth + 1))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  };

                  return (
                    <>
                      {docTree.folders.map((folder) => renderFolder(folder, 0))}
                      {docTree.rootDocs.map((doc) => renderDocCard(doc, 0))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Batch Upload Dialog */}
        {kbId && (
          <BatchUploadDialog
            open={showBatchUpload}
            onClose={() => setShowBatchUpload(false)}
            kbId={kbId}
          />
        )}

        {/* Rename Dialog */}
        <FormDialog
          open={!!renamingDoc}
          onOpenChange={(open) => { if (!open) setRenamingDoc(null); }}
          title="重命名文档"
          description={`修改文档"${renamingDoc?.title}"的名称`}
        >
          <div className="space-y-4">
            <FormField label="新名称">
              <FormInput
                value={renameTitle}
                onChange={setRenameTitle}
                placeholder="输入新文档名称"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <DialogButton onClick={() => setRenamingDoc(null)}>取消</DialogButton>
              <DialogButton onClick={handleRename} disabled={!renameTitle.trim() || updateDocMut.isPending}>
                {updateDocMut.isPending ? "保存中..." : "保存"}
              </DialogButton>
            </div>
          </div>
        </FormDialog>

        {/* Members Dialog */}
        <FormDialog
          open={showMembers}
          onOpenChange={setShowMembers}
          title="成员管理"
          description="管理知识库成员和权限"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <FormField label="用户 ID">
                <FormInput
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  placeholder="输入用户 ID"
                />
              </FormField>
              <FormField label="角色">
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="viewer">查看者</option>
                  <option value="editor">编辑者</option>
                  <option value="owner">所有者</option>
                </select>
              </FormField>
              <DialogButton onClick={handleAddMember} disabled={upsertMemberMut.isPending}>
                添加成员
              </DialogButton>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">当前成员</h3>
              {members.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无成员</div>
              ) : (
                <div className="space-y-2">
                  {members.map((member: KbMemberData) => (
                    <div key={member.user_id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="text-sm font-medium">{member.user_id}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1 hover:bg-destructive/10 text-destructive rounded"
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

export default KnowledgeBaseDetail;
