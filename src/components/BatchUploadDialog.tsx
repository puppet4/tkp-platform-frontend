import { useCallback, useRef, DragEvent } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2, RefreshCw, FolderOpen } from "lucide-react";
import { FormDialog, DialogButton } from "@/components/FormDialog";
import { Progress } from "@/components/ui/progress";
import { useBatchUpload, type FileItem, type BatchPhase } from "@/hooks/useBatchUpload";
import { useImportBatch } from "@/hooks/useResources";
import { useQueryClient } from "@tanstack/react-query";

const ACCEPTED_EXTENSIONS = [".pdf", ".md", ".docx", ".txt", ".html", ".csv", ".pptx"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 500;

interface BatchUploadDialogProps {
  open: boolean;
  onClose: () => void;
  kbId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFiles(fileList: File[]): { valid: File[]; errors: string[] } {
  const errors: string[] = [];
  const valid: File[] = [];
  for (const file of fileList) {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      errors.push(`${file.name}: 不支持的文件格式`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: 文件超过 50MB 限制`);
      continue;
    }
    valid.push(file);
  }
  return { valid, errors };
}

export function BatchUploadDialog({ open, onClose, kbId }: BatchUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const {
    files, addFiles, removeFile, clearFiles,
    startUpload, cancelUpload, retryFailed,
    batchId, phase, stats,
  } = useBatchUpload(kbId);

  const { data: batchDetail } = useImportBatch(
    phase === "done" ? batchId : null,
    { enabled: phase === "done" && !!batchId },
  );

  const handleFilesSelected = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const arr = Array.from(fileList);
    const remaining = MAX_FILES - files.length;
    if (arr.length > remaining) {
      alert(`最多添加 ${MAX_FILES} 个文件，当前还可添加 ${remaining} 个`);
      return;
    }
    const { valid, errors } = validateFiles(arr);
    if (errors.length > 0) {
      alert("部分文件被跳过：\n" + errors.join("\n"));
    }
    if (valid.length > 0) {
      const paths = valid.map((f) => (f as any).webkitRelativePath || undefined);
      addFiles(valid, paths);
    }
  }, [files.length, addFiles]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFilesSelected(e.dataTransfer.files);
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClose = () => {
    if (phase === "uploading") {
      if (!confirm("正在上传中，确定要关闭吗？")) return;
      cancelUpload();
    }
    if (phase === "done" || phase === "uploading") {
      qc.invalidateQueries({ queryKey: ["documents", kbId] });
      qc.invalidateQueries({ queryKey: ["kb-stats", kbId] });
      qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
    }
    clearFiles();
    onClose();
  };

  const overallProgress = stats.total > 0
    ? Math.round(((stats.uploaded + stats.failed) / stats.total) * 100)
    : 0;

  const statusIcon = (item: FileItem) => {
    switch (item.status) {
      case "pending": return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "uploading": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "success": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const ingestionStatusLabel = (s?: string | null) => {
    switch (s) {
      case "queued": return "排队中";
      case "processing": return "处理中";
      case "completed": return "完成";
      case "dead_letter": return "失败";
      default: return s || "";
    }
  };

  // Map batch detail files by document_id for ingestion phase
  const batchFileMap = new Map(
    (batchDetail?.files || []).map((f) => [f.document_id, f]),
  );

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      title="批量上传文档"
      description={phase === "selecting" ? "选择要上传到知识库的文档文件（支持多选）" : undefined}
      width="max-w-2xl"
      footer={
        phase === "selecting" ? (
          <>
            <DialogButton onClick={handleClose}>取消</DialogButton>
            <DialogButton
              variant="primary"
              disabled={files.length === 0}
              onClick={startUpload}
            >
              开始上传 ({files.length} 个文件)
            </DialogButton>
          </>
        ) : phase === "uploading" ? (
          <DialogButton onClick={cancelUpload}>取消上传</DialogButton>
        ) : (
          <>
            {stats.failed > 0 && (
              <DialogButton onClick={retryFailed}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重试失败 ({stats.failed})
              </DialogButton>
            )}
            <DialogButton variant="primary" onClick={handleClose}>
              关闭
            </DialogButton>
          </>
        )
      }
    >
      {/* Phase 1: File Selection */}
      {phase === "selecting" && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is non-standard
            webkitdirectory=""
            className="hidden"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />

          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">点击选择文件或拖拽至此</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              支持 {ACCEPTED_EXTENSIONS.join(", ")} · 单文件最大 50MB · 最多 {MAX_FILES} 个
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              选择文件
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              选择文件夹
            </button>
          </div>

          {files.length > 0 && (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <div className="p-2 border-b bg-secondary/30 text-xs text-muted-foreground flex justify-between">
                <span>已选择 {files.length} 个文件</span>
                <span>{formatSize(files.reduce((s, f) => s + f.file.size, 0))}</span>
              </div>
              <div className="divide-y">
                {files.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{item.relativePath || item.file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(item.file.size)}</span>
                    </div>
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase 2: Upload Progress */}
      {phase === "uploading" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>上传进度</span>
              <span className="text-muted-foreground">
                已上传 {stats.uploaded}/{stats.total}
                {stats.failed > 0 && <span className="text-red-500">，失败 {stats.failed}</span>}
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
            {files.map((item) => (
              <div key={item.id} className="px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  {statusIcon(item)}
                  <span className="truncate flex-1">{item.relativePath || item.file.name}</span>
                  {item.status === "uploading" && (
                    <span className="text-xs text-muted-foreground">{item.progress}%</span>
                  )}
                  {item.duplicate && (
                    <span className="text-xs text-yellow-600">重复</span>
                  )}
                </div>
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="h-1 mt-1" />
                )}
                {item.error && (
                  <p className="text-xs text-red-500 mt-1">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 3: Done / Ingestion Monitoring */}
      {phase === "done" && (
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>上传完成</span>
            <span className="text-muted-foreground">
              成功 {stats.uploaded}，失败 {stats.failed}，共 {stats.total}
            </span>
          </div>

          {batchDetail && (
            <div className="px-3 py-2 bg-secondary/30 rounded-md text-sm">
              批次状态：
              <span className={
                batchDetail.status === "completed" ? "text-green-600 font-medium" :
                batchDetail.status === "partial_failure" ? "text-yellow-600 font-medium" :
                batchDetail.status === "cancelled" ? "text-red-600 font-medium" :
                "text-blue-600 font-medium"
              }>
                {batchDetail.status === "completed" ? "全部完成" :
                 batchDetail.status === "partial_failure" ? "部分失败" :
                 batchDetail.status === "cancelled" ? "已取消" :
                 batchDetail.status === "ingesting" ? "入库中" :
                 batchDetail.status}
              </span>
            </div>
          )}

          <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
            {files.map((item) => {
              const batchFile = item.documentId ? batchFileMap.get(item.documentId) : undefined;
              return (
                <div key={item.id} className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    {statusIcon(item)}
                    <span className="truncate flex-1">{item.relativePath || item.file.name}</span>
                    {item.duplicate && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">重复跳过</span>
                    )}
                    {batchFile && batchFile.job_status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        batchFile.job_status === "completed" ? "bg-green-100 text-green-700" :
                        batchFile.job_status === "processing" ? "bg-blue-100 text-blue-700" :
                        batchFile.job_status === "dead_letter" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {ingestionStatusLabel(batchFile.job_status)}
                        {batchFile.job_progress != null && batchFile.job_status === "processing" && ` ${batchFile.job_progress}%`}
                      </span>
                    )}
                  </div>
                  {item.error && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}
                  {batchFile?.error && (
                    <p className="text-xs text-red-500 mt-1">{batchFile.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
