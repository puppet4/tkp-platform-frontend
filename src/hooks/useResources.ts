import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  workspaceApi,
  kbApi,
  documentApi,
  type WorkspaceData,
  type KnowledgeBaseData,
  type DocumentData,
} from "@/lib/api";

// ─── Workspaces ──────────────────────────────────────────────────
export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.list(),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string }) =>
      workspaceApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

// ─── Knowledge Bases ─────────────────────────────────────────────
export function useKnowledgeBases(workspaceId?: string) {
  return useQuery({
    queryKey: ["knowledge-bases", workspaceId],
    queryFn: () => kbApi.list(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useKbStats(kbId?: string) {
  return useQuery({
    queryKey: ["kb-stats", kbId],
    queryFn: () => kbApi.stats(kbId!),
    enabled: !!kbId,
  });
}

export function useCreateKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspace_id: string; name: string; description?: string }) =>
      kbApi.create(data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["knowledge-bases", vars.workspace_id] }),
  });
}

export function useDeleteKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kbId: string) => kbApi.delete(kbId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

// ─── Documents ───────────────────────────────────────────────────
export function useDocuments(kbId?: string) {
  return useQuery({
    queryKey: ["documents", kbId],
    queryFn: () => documentApi.list(kbId!),
    enabled: !!kbId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, file }: { kbId: string; file: File }) =>
      documentApi.upload(kbId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => documentApi.delete(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useReindexDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => documentApi.reindex(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDocumentVersions(docId?: string) {
  return useQuery({
    queryKey: ["doc-versions", docId],
    queryFn: () => documentApi.listVersions(docId!),
    enabled: !!docId,
  });
}

export function useDocumentChunks(docId?: string, page = 1, size = 20) {
  return useQuery({
    queryKey: ["doc-chunks", docId, page, size],
    queryFn: () => documentApi.listChunks(docId!, page, size),
    enabled: !!docId,
  });
}
