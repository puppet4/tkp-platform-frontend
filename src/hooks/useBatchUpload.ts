import { useCallback, useRef, useState } from "react";
import { importBatchApi } from "@/lib/api";
import type { BatchUploadFileResult } from "@/lib/api";

export type FileItemStatus = "pending" | "uploading" | "success" | "failed";

export interface FileItem {
  id: string;
  file: File;
  relativePath?: string;
  status: FileItemStatus;
  progress: number;
  error?: string;
  documentId?: string;
  duplicate?: boolean;
}

export type BatchPhase = "selecting" | "uploading" | "done";

export interface BatchStats {
  total: number;
  uploaded: number;
  failed: number;
  uploading: number;
}

const CONCURRENCY = 3;

let fileIdCounter = 0;
function nextFileId() {
  return `file-${++fileIdCounter}-${Date.now()}`;
}

export function useBatchUpload(kbId: string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [phase, setPhase] = useState<BatchPhase>("selecting");
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const stats: BatchStats = {
    total: files.length,
    uploaded: files.filter((f) => f.status === "success").length,
    failed: files.filter((f) => f.status === "failed").length,
    uploading: files.filter((f) => f.status === "uploading").length,
  };

  const addFiles = useCallback((newFiles: File[], relativePaths?: string[]) => {
    const items: FileItem[] = newFiles.map((file, i) => ({
      id: nextFileId(),
      file,
      relativePath: relativePaths?.[i],
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setBatchId(null);
    setPhase("selecting");
    cancelledRef.current = false;
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<FileItem>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const uploadSingleFile = useCallback(
    async (item: FileItem, currentBatchId: string, signal: AbortSignal) => {
      updateFile(item.id, { status: "uploading", progress: 0 });

      const formData = new FormData();
      formData.append("file", item.file);
      if (item.relativePath) {
        formData.append("relative_path", item.relativePath);
      }

      try {
        const result = await importBatchApi.uploadFile(
          currentBatchId,
          formData,
          (loaded, total) => {
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            updateFile(item.id, { progress: pct });
          },
          signal,
        );
        updateFile(item.id, {
          status: "success",
          progress: 100,
          documentId: result.document_id,
          duplicate: result.duplicate,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "上传失败";
        updateFile(item.id, { status: "failed", error: msg, progress: 0 });
      }
    },
    [updateFile],
  );

  const startUpload = useCallback(async () => {
    if (files.length === 0 || !kbId) return;
    cancelledRef.current = false;
    setPhase("uploading");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const batch = await importBatchApi.create(kbId, { total_files: files.length });
      setBatchId(batch.id);

      // Concurrent upload pool
      const pending = files.filter((f) => f.status !== "success");
      let idx = 0;

      const runNext = async (): Promise<void> => {
        while (idx < pending.length) {
          if (cancelledRef.current) return;
          const current = pending[idx++];
          await uploadSingleFile(current, batch.id, controller.signal);
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => runNext());
      await Promise.all(workers);

      // Finalize
      if (!cancelledRef.current) {
        await importBatchApi.finalize(batch.id);
      }
    } catch (err) {
      // batch creation failed
      if (!cancelledRef.current) {
        console.error("Batch upload failed:", err);
      }
    } finally {
      setPhase("done");
      abortRef.current = null;
    }
  }, [files, kbId, uploadSingleFile]);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    if (batchId) {
      importBatchApi.cancel(batchId).catch(() => {});
    }
    setPhase("done");
  }, [batchId]);

  const retryFailed = useCallback(async () => {
    if (!batchId) return;
    const failedFiles = files.filter((f) => f.status === "failed");
    if (failedFiles.length === 0) return;

    cancelledRef.current = false;
    setPhase("uploading");

    const controller = new AbortController();
    abortRef.current = controller;

    let idx = 0;
    const runNext = async (): Promise<void> => {
      while (idx < failedFiles.length) {
        if (cancelledRef.current) return;
        const current = failedFiles[idx++];
        await uploadSingleFile(current, batchId, controller.signal);
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, failedFiles.length) }, () => runNext());
    await Promise.all(workers);

    setPhase("done");
    abortRef.current = null;
  }, [batchId, files, uploadSingleFile]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    startUpload,
    cancelUpload,
    retryFailed,
    batchId,
    phase,
    stats,
  };
}
