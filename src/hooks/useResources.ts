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

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; slug?: string; description?: string } }) =>
      workspaceApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useWorkspaceMembers(workspaceId?: string) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceApi.listMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useUpsertWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wsId, userId, role }: { wsId: string; userId: string; role: string }) =>
      workspaceApi.addMember(wsId, userId, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-members", vars.wsId] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wsId, userId }: { wsId: string; userId: string }) =>
      workspaceApi.removeMember(wsId, userId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-members", vars.wsId] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
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

export function useUpdateKb() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, data }: { kbId: string; data: { name?: string; description?: string } }) =>
      kbApi.update(kbId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useKbMembers(kbId?: string) {
  return useQuery({
    queryKey: ["kb-members", kbId],
    queryFn: () => kbApi.listMembers(kbId!),
    enabled: !!kbId,
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
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["kb-members", vars.kbId] }),
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

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, data }: { docId: string; data: { title?: string; metadata?: Record<string, unknown> } }) =>
      documentApi.update(docId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["doc-versions", vars.docId] });
      qc.invalidateQueries({ queryKey: ["doc-chunks", vars.docId] });
    },
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
