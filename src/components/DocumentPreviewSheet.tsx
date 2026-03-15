import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { documentApi } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface DocumentPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId?: string;
  title?: string;
  content?: string;
}

export function DocumentPreviewSheet({
  open,
  onOpenChange,
  documentId,
  title,
  content,
}: DocumentPreviewSheetProps) {
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["document-full-text", documentId],
    queryFn: () => documentApi.getFullText(documentId!),
    enabled: open && !!documentId && !content,
  });

  const displayTitle = title || data?.title || "文档预览";
  const displayContent = content || data?.content || "";
  const showDownload = !!documentId;

  const handleDownload = async () => {
    if (!documentId || downloading) return;
    setDownloading(true);
    try {
      await documentApi.download(documentId);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full flex flex-col overflow-hidden"
      >
        <SheetHeader className="shrink-0">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="truncate">{displayTitle}</SheetTitle>
            {showDownload && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-secondary transition-colors shrink-0 disabled:opacity-50"
              >
                {downloading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />}
                下载原文
              </button>
            )}
          </div>
          <SheetDescription>
            {data
              ? `版本 ${data.version} · ${data.total_chunks} 个切片`
              : content
                ? "引用内容"
                : "加载中..."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto mt-4">
          {isLoading && !content ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayContent ? (
            <div className="prose prose-sm max-w-none break-words prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-violet-600 prose-code:bg-violet-50 dark:prose-code:bg-violet-950/30 dark:prose-code:text-violet-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 prose-pre:border prose-pre:rounded-xl prose-li:text-foreground">
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-16">
              暂无内容
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
