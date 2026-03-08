import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  FolderOpen, Database, FileText, Plus, Search,
  ChevronRight, ArrowLeft, MoreHorizontal, Upload, RefreshCw,
  AlertCircle, Layers, Eye, Loader2
} from "lucide-react";
import { FormDialog, FormField, FormInput, FormTextarea, DialogButton } from "@/components/FormDialog";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/UniversalStates";
import { LoadingSkeleton } from "@/components/UniversalStates";
import { PageTabs } from "@/components/PageTabs";
import {
  useWorkspaces, useCreateWorkspace,
  useKnowledgeBases, useKbStats, useCreateKb,
  useDocuments, useUploadDocument, useReindexDocument,
  useDocumentVersions, useDocumentChunks,
} from "@/hooks/useResources";
import type { WorkspaceData, KnowledgeBaseData, DocumentData } from "@/lib/api";
import { ApiError } from "@/lib/api";

type View = "workspaces" | "kb-list" | "doc-list" | "doc-detail";

const Resources = () => {
  const { toast } = useToast();
  const [view, setView] = useState<View>("workspaces");
  const [selectedWs, setSelectedWs] = useState<WorkspaceData | null>(null);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseData | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [search, setSearch] = useState("");
  const [docTab, setDocTab] = useState<"versions" | "chunks">("versions");
  const [chunkPage, setChunkPage] = useState(1);

  // Dialogs
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showCreateKb, setShowCreateKb] = useState(false);
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [showConfirmReindex, setShowConfirmReindex] = useState<DocumentData | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormSlug(""); setSelectedFile(null);
  };

  // ─── Data hooks ───────────────────────────────────────────────
  const { data: workspaces = [], isLoading: wsLoading } = useWorkspaces();
  const { data: kbs = [], isLoading: kbLoading } = useKnowledgeBases(selectedWs?.id);
  const { data: kbStats } = useKbStats(selectedKb?.id);
  const { data: docs = [], isLoading: docsLoading } = useDocuments(selectedKb?.id);
  const { data: versions = [], isLoading: versionsLoading } = useDocumentVersions(
    view === "doc-detail" ? selectedDoc?.id : undefined
  );
  const { data: chunksPage, isLoading: chunksLoading } = useDocumentChunks(
    view === "doc-detail" && docTab === "chunks" ? selectedDoc?.id : undefined,
    chunkPage
  );

  // ─── Mutations ────────────────────────────────────────────────
  const createWs = useCreateWorkspace();
  const createKb = useCreateKb();
  const uploadDoc = useUploadDocument();
  const reindexDoc = useReindexDocument();

  const handleCreateWs = async () => {
    try {
      await createWs.mutateAsync({ name: formName, slug: formSlug, description: formDesc || undefined });
      toast({ title: "工作空间创建成功" });
      setShowCreateWs(false);
      resetForm();
    } catch (e) {
      toast({ title: "创建失败", description: e instanceof ApiError ? e.message : "未知错误", variant: "destructive" });
    }
  };

  const handleCreateKb = async () => {
    if (!selectedWs) return;
    try {
      await createKb.mutateAsync({ workspace_id: selectedWs.id, name: formName, description: formDesc || undefined });
      toast({ title: "知识库创建成功" });
      setShowCreateKb(false);
      resetForm();
    } catch (e) {
      toast({ title: "创建失败", description: e instanceof ApiError ? e.message : "未知错误", variant: "destructive" });
    }
  };

  const handleUploadDoc = async () => {
    if (!selectedKb || !selectedFile) return;
    try {
      await uploadDoc.mutateAsync({ kbId: selectedKb.id, file: selectedFile });
      toast({ title: "文档上传成功", description: "正在处理中…" });
      setShowUploadDoc(false);
      resetForm();
    } catch (e) {
      toast({ title: "上传失败", description: e instanceof ApiError ? e.message : "未知错误", variant: "destructive" });
    }
  };

  const handleReindex = async () => {
    if (!showConfirmReindex) return;
    try {
      await reindexDoc.mutateAsync(showConfirmReindex.id);
      toast({ title: "重建索引任务已提交" });
      setShowConfirmReindex(null);
    } catch (e) {
      toast({ title: "操作失败", description: e instanceof ApiError ? e.message : "未知错误", variant: "destructive" });
    }
  };

  // ─── Filtering ────────────────────────────────────────────────
  const filteredKbs = kbs.filter(kb => kb.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDocs = docs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  // ─── Breadcrumb ───────────────────────────────────────────────
  const breadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = [{ label: "资源中心" }];
    if (view === "kb-list" && selectedWs) {
      parts.push({ label: "工作空间", onClick: () => { setView("workspaces"); setSelectedWs(null); } });
      parts.push({ label: selectedWs.name });
    }
    if (view === "doc-list" && selectedKb) {
      parts.push({ label: "工作空间", onClick: () => { setView("workspaces"); setSelectedWs(null); setSelectedKb(null); } });
      if (selectedWs) parts.push({ label: selectedWs.name, onClick: () => { setView("kb-list"); setSelectedKb(null); } });
      parts.push({ label: selectedKb.name });
    }
    if (view === "doc-detail" && selectedDoc) {
      parts.push({ label: "工作空间", onClick: () => { setView("workspaces"); setSelectedWs(null); setSelectedKb(null); setSelectedDoc(null); } });
      if (selectedWs) parts.push({ label: selectedWs.name, onClick: () => { setView("kb-list"); setSelectedKb(null); setSelectedDoc(null); } });
      if (selectedKb) parts.push({ label: selectedKb.name, onClick: () => { setView("doc-list"); setSelectedDoc(null); } });
      parts.push({ label: selectedDoc.title });
    }
    return parts;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      active: { label: "正常", cls: "bg-success/10 text-success" },
      ready: { label: "就绪", cls: "bg-success/10 text-success" },
      indexing: { label: "索引中", cls: "bg-warning/10 text-warning" },
      processing: { label: "处理中", cls: "bg-warning/10 text-warning" },
      queued: { label: "队列中", cls: "bg-warning/10 text-warning" },
      error: { label: "异常", cls: "bg-destructive/10 text-destructive" },
      failed: { label: "失败", cls: "bg-destructive/10 text-destructive" },
      deleted: { label: "已删除", cls: "bg-muted text-muted-foreground" },
    };
    const m = map[status] || { label: status, cls: "bg-secondary text-muted-foreground" };
    return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${m.cls}`}>{m.label}</span>;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          {breadcrumb().map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {b.onClick ? (
                <button onClick={b.onClick} className="hover:text-foreground transition-colors">{b.label}</button>
              ) : (
                <span className="text-foreground font-medium">{b.label}</span>
              )}
            </span>
          ))}
        </div>

        {/* ─── Workspaces ─────────────────────────────────────── */}
        {view === "workspaces" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">工作空间</h2>
              <button onClick={() => setShowCreateWs(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> 创建空间
              </button>
            </div>
            {wsLoading ? (
              <LoadingSkeleton rows={3} columns={3} />
            ) : workspaces.length === 0 ? (
              <EmptyState icon={<FolderOpen className="h-8 w-8" />} title="暂无工作空间" description="点击上方「创建空间」开始" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {workspaces.map(ws => (
                  <div key={ws.id}
                    onClick={() => { setSelectedWs(ws); setView("kb-list"); setSearch(""); }}
                    className="bg-card rounded-lg border border-border p-4 shadow-xs hover:shadow-card-hover hover:border-primary/20 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <FolderOpen className="h-4 w-4 text-accent" />
                      </div>
                      <button onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mt-3 group-hover:text-primary transition-colors">{ws.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{ws.description || "—"}</p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                      <span className="font-mono">{ws.slug}</span>
                      {statusBadge(ws.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── KB List ────────────────────────────────────────── */}
        {view === "kb-list" && selectedWs && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => { setView("workspaces"); setSelectedWs(null); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <h2 className="text-lg font-semibold text-foreground">{selectedWs.name} / 知识库</h2>
              </div>
              <button onClick={() => setShowCreateKb(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> 创建知识库
              </button>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索知识库..."
                className="w-full h-8 rounded-md border border-input bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors" />
            </div>
            {kbLoading ? (
              <LoadingSkeleton rows={4} columns={3} />
            ) : (
              <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">名称</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">模型</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredKbs.map(kb => (
                      <tr key={kb.id} onClick={() => { setSelectedKb(kb); setView("doc-list"); setSearch(""); }}
                        className="hover:bg-secondary/30 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{kb.name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{kb.description || "—"}</div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(kb.status)}</td>
                        <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono">{kb.embedding_model}</td>
                        <td className="px-4 py-3">
                          <button onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-secondary">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredKbs.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-12 text-center">
                        <EmptyState icon={<Database className="h-8 w-8" />} title="暂无知识库" description="点击上方「创建知识库」开始" />
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Document List ──────────────────────────────────── */}
        {view === "doc-list" && selectedKb && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => { setView("kb-list"); setSelectedKb(null); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedKb.name}</h2>
                  {kbStats && (
                    <p className="text-[11px] text-muted-foreground">
                      {kbStats.document_ready} 就绪 · {kbStats.document_processing} 处理中 · {kbStats.chunk_total} 切片
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setShowUploadDoc(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Upload className="h-3.5 w-3.5" /> 上传文档
              </button>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文档..."
                className="w-full h-8 rounded-md border border-input bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors" />
            </div>
            {docsLoading ? (
              <LoadingSkeleton rows={4} columns={4} />
            ) : (
              <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">文档</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">版本</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">来源</th>
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDocs.map(doc => (
                      <tr key={doc.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <button onClick={() => { setSelectedDoc(doc); setView("doc-detail"); setDocTab("versions"); setChunkPage(1); }}
                              className="font-medium text-foreground truncate max-w-[240px] hover:text-primary transition-colors text-left">
                              {doc.title}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground">v{doc.current_version}</td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px] font-mono">{doc.source_type}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {(doc.status === "failed" || doc.status === "error") && (
                              <button onClick={() => setShowConfirmReindex(doc)} className="p-1 rounded hover:bg-warning/10" title="重建索引">
                                <RefreshCw className="h-3.5 w-3.5 text-warning" />
                              </button>
                            )}
                            <button onClick={() => { setSelectedDoc(doc); setView("doc-detail"); setDocTab("versions"); setChunkPage(1); }}
                              className="p-1 rounded hover:bg-secondary" title="详情">
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredDocs.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center">
                        <EmptyState icon={<FileText className="h-8 w-8" />} title="暂无文档" description="点击上方「上传文档」开始" />
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Document Detail ────────────────────────────────── */}
        {view === "doc-detail" && selectedDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setView("doc-list"); setSelectedDoc(null); }} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedDoc.title}</h2>
                <p className="text-[11px] text-muted-foreground">
                  v{selectedDoc.current_version} · {selectedDoc.source_type} · {statusBadge(selectedDoc.status)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowConfirmReindex(selectedDoc)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm font-medium hover:bg-secondary transition-colors">
                <RefreshCw className="h-3.5 w-3.5" /> 重建索引
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
              <button onClick={() => setDocTab("versions")}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors relative ${docTab === "versions" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                版本历史
                {docTab === "versions" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
              <button onClick={() => { setDocTab("chunks"); setChunkPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors relative ${docTab === "chunks" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                <Layers className="h-3.5 w-3.5" /> 切片列表
                {docTab === "chunks" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
            </div>

            {/* Versions */}
            {docTab === "versions" && (
              versionsLoading ? <LoadingSkeleton rows={3} columns={4} /> : (
                <div className="bg-card rounded-lg border border-border shadow-xs overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">版本</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">状态</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">切片数</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">创建时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {versions.map(v => (
                        <tr key={v.version} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">v{v.version}</td>
                          <td className="px-4 py-3">{statusBadge(v.status)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.chunk_count}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.created_at}</td>
                        </tr>
                      ))}
                      {versions.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">暂无版本记录</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Chunks */}
            {docTab === "chunks" && (
              chunksLoading ? <LoadingSkeleton rows={3} columns={2} /> : (
                <div className="space-y-2">
                  {chunksPage?.items.map((chunk, i) => (
                    <div key={chunk.chunk_id} className="bg-card rounded-lg border border-border p-3.5 shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          #{(chunkPage - 1) * 20 + i + 1}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{chunk.token_count} tokens</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{chunk.content}</p>
                    </div>
                  ))}
                  {chunksPage && chunksPage.total > 20 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button disabled={chunkPage <= 1} onClick={() => setChunkPage(p => p - 1)}
                        className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary disabled:opacity-40">上一页</button>
                      <span className="text-sm text-muted-foreground">{chunkPage} / {Math.ceil(chunksPage.total / 20)}</span>
                      <button disabled={chunkPage >= Math.ceil(chunksPage.total / 20)} onClick={() => setChunkPage(p => p + 1)}
                        className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-secondary disabled:opacity-40">下一页</button>
                    </div>
                  )}
                  {(!chunksPage || chunksPage.items.length === 0) && (
                    <EmptyState icon={<Layers className="h-8 w-8" />} title="暂无切片" description="文档处理完成后将显示切片" />
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ─── Dialogs ──────────────────────────────────────────── */}
      <FormDialog open={showCreateWs} onClose={() => { setShowCreateWs(false); resetForm(); }} title="创建工作空间"
        footer={<>
          <DialogButton onClick={() => { setShowCreateWs(false); resetForm(); }}>取消</DialogButton>
          <DialogButton variant="primary" disabled={!formName || !formSlug || createWs.isPending} onClick={handleCreateWs}>
            {createWs.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </>}>
        <FormField label="空间名称" required><FormInput value={formName} onChange={setFormName} placeholder="如：产品研发" /></FormField>
        <FormField label="标识 (slug)" required hint="小写字母、数字和连字符"><FormInput value={formSlug} onChange={setFormSlug} placeholder="如：product-dev" /></FormField>
        <FormField label="描述"><FormTextarea value={formDesc} onChange={setFormDesc} placeholder="描述此空间的用途..." /></FormField>
      </FormDialog>

      <FormDialog open={showCreateKb} onClose={() => { setShowCreateKb(false); resetForm(); }} title="创建知识库"
        footer={<>
          <DialogButton onClick={() => { setShowCreateKb(false); resetForm(); }}>取消</DialogButton>
          <DialogButton variant="primary" disabled={!formName || createKb.isPending} onClick={handleCreateKb}>
            {createKb.isPending ? "创建中..." : "创建"}
          </DialogButton>
        </>}>
        <FormField label="知识库名称" required><FormInput value={formName} onChange={setFormName} placeholder="如：API 接口文档" /></FormField>
        <FormField label="描述"><FormTextarea value={formDesc} onChange={setFormDesc} placeholder="描述此知识库包含的内容..." /></FormField>
      </FormDialog>

      <FormDialog open={showUploadDoc} onClose={() => { setShowUploadDoc(false); resetForm(); }} title="上传文档"
        footer={<>
          <DialogButton onClick={() => { setShowUploadDoc(false); resetForm(); }}>取消</DialogButton>
          <DialogButton variant="primary" disabled={!selectedFile || uploadDoc.isPending} onClick={handleUploadDoc}>
            {uploadDoc.isPending ? "上传中..." : "上传"}
          </DialogButton>
        </>}>
        <FormField label="选择文件" required hint="支持 PDF、Markdown、DOCX 等格式">
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.md,.docx,.txt,.html,.csv"
            onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4 text-success" />
                <span className="text-sm text-foreground font-medium">{selectedFile.name}</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">点击选择文件或拖拽至此</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">PDF, MD, DOCX, TXT</p>
              </>
            )}
          </div>
        </FormField>
      </FormDialog>

      <FormDialog open={!!showConfirmReindex} onClose={() => setShowConfirmReindex(null)} title="确认重建索引" width="max-w-sm"
        footer={<>
          <DialogButton onClick={() => setShowConfirmReindex(null)}>取消</DialogButton>
          <DialogButton variant="primary" disabled={reindexDoc.isPending} onClick={handleReindex}>
            {reindexDoc.isPending ? "处理中..." : "确认重建"}
          </DialogButton>
        </>}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-warning/10"><AlertCircle className="h-5 w-5 text-warning" /></div>
          <div>
            <p className="text-sm text-foreground">确定对「{showConfirmReindex?.title}」重建索引？</p>
            <p className="text-[11px] text-muted-foreground mt-1">重建过程中文档将暂时不可检索。</p>
          </div>
        </div>
      </FormDialog>
    </AppLayout>
  );
};

export default Resources;
