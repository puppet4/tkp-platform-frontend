import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  workspaceApi,
  kbApi,
  documentApi,
} from "@/lib/api";

// ─── Workspaces ──────────────────────────────────────────────────
export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.list(),
  });
}

export function useWorkspace(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => workspaceApi.get(workspaceId),
    enabled: options?.enabled !== false && !!workspaceId,
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

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, name, description, slug }: { workspaceId: string; name?: string; description?: string; slug?: string }) =>
      workspaceApi.update(workspaceId, { name, description, slug }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["workspace", vars.workspaceId] });
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workspaceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useWorkspaceMembers(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceApi.listMembers(workspaceId),
    enabled: options?.enabled !== false && !!workspaceId,
  });
}

export function useUpsertWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: string }) =>
      workspaceApi.upsertMember(workspaceId, { user_id: userId, role }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-members", vars.workspaceId] });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      workspaceApi.removeMember(workspaceId, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-members", vars.workspaceId] });
    },
  });
}

// ─── Knowledge Bases ─────────────────────────────────────────────
export function useKnowledgeBases(workspaceId?: string) {
  return useQuery({
    queryKey: workspaceId ? ["knowledge-bases", workspaceId] : ["knowledge-bases"],
    queryFn: () => kbApi.list(workspaceId),
  });
}

export function useKnowledgeBase(kbId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["knowledge-base", kbId],
    queryFn: () => kbApi.get(kbId),
    enabled: options?.enabled !== false && !!kbId,
  });
}

export function useKnowledgeBaseStats(kbId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["kb-stats", kbId],
    queryFn: () => kbApi.getStats(kbId),
    enabled: options?.enabled !== false && !!kbId,
  });
}

export function useCreateKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspace_id: string; name: string; description?: string }) =>
      kbApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useUpdateKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, name, description }: { kbId: string; name?: string; description?: string }) =>
      kbApi.update(kbId, { name, description }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["knowledge-bases"] });
      qc.invalidateQueries({ queryKey: ["knowledge-base", vars.kbId] });
    },
  });
}

export function useDeleteKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kbId: string) => kbApi.delete(kbId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useKbMembers(kbId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["kb-members", kbId],
    queryFn: () => kbApi.listMembers(kbId),
    enabled: options?.enabled !== false && !!kbId,
  });
}

export function useUpsertKbMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, userId, role }: { kbId: string; userId: string; role: string }) =>
      kbApi.upsertMember(kbId, userId, role),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["kb-members", vars.kbId] }),
  });
}

export function useRemoveKbMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, userId }: { kbId: string; userId: string }) =>
      kbApi.removeMember(kbId, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["kb-members", vars.kbId] });
    },
  });
}

// ─── Documents ───────────────────────────────────────────────────
export function useDocuments(kbId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["documents", kbId],
    queryFn: () => documentApi.list(kbId),
    enabled: options?.enabled !== false && !!kbId,
  });
}

export function useDocument(docId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["document", docId],
    queryFn: () => documentApi.get(docId),
    enabled: options?.enabled !== false && !!docId,
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

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, file }: { kbId: string; file: File }) => documentApi.upload(kbId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: { title?: string; metadata?: Record<string, any> } }) =>
      documentApi.update(docId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document", vars.docId] });
    },
  });
}

export function useDocumentVersions(docId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["document-versions", docId],
    queryFn: () => documentApi.listVersions(docId),
    enabled: options?.enabled !== false && !!docId,
  });
}

export function useDocumentChunks(docId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["document-chunks", docId],
    queryFn: () => documentApi.listChunks(docId),
    enabled: options?.enabled !== false && !!docId,
  });
}

// Aliases for backward compatibility
export const useCreateKb = useCreateKnowledgeBase;
export const useUpdateKb = useUpdateKnowledgeBase;
export const useDeleteKb = useDeleteKnowledgeBase;
export const useKbStats = useKnowledgeBaseStats;
