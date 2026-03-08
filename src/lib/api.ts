/**
 * TKP Backend API Client
 * Base URL configurable; token managed via localStorage.
 */

const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "";

// ─── Token helpers ───────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem("tkp_token");
}

export function setToken(token: string) {
  localStorage.setItem("tkp_token", token);
}

export function clearToken() {
  localStorage.removeItem("tkp_token");
}

// ─── Generic fetcher ─────────────────────────────────────────────
interface ApiResponse<T> {
  request_id: string;
  data: T;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === "object" && body && "message" in (body as Record<string, unknown>)
      ? String((body as Record<string, string>).message)
      : `API Error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errBody);
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

// Upload helper (multipart/form-data)
async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errBody);
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

// ─── Auth types ──────────────────────────────────────────────────
export interface AuthLoginData {
  access_token: string;
  token_type?: string;
  expires_at: string;
  expires_in: number;
  tenant_id?: string | null;
}

export interface AuthUserProfile {
  id: string;
  email: string;
  display_name: string;
  status: string;
  auth_provider: string;
  external_subject: string;
  last_login_at?: string | null;
}

export interface TenantAccessItem {
  tenant_id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

export interface WorkspaceAccessItem {
  workspace_id: string;
  tenant_id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

export interface AuthMeData {
  user: AuthUserProfile;
  tenants: TenantAccessItem[];
  workspaces: WorkspaceAccessItem[];
}

export interface PermissionSnapshotData {
  tenant_role: string;
  allowed_actions: string[];
}

export interface PermissionUIItemData {
  code: string;
  name: string;
  required_actions: string[];
  allowed: boolean;
}

export interface PermissionUIManifestData {
  version: string;
  tenant_role: string;
  allowed_actions: string[];
  menus: PermissionUIItemData[];
  buttons: PermissionUIItemData[];
  features: PermissionUIItemData[];
}

// ─── Auth API ────────────────────────────────────────────────────
export const authApi = {
  login(email: string, password: string) {
    return request<AuthLoginData>("POST", "/api/auth/login", { email, password }, false);
  },

  register(email: string, password: string, display_name?: string) {
    return request<{ user_id: string; email: string; display_name: string }>(
      "POST",
      "/api/auth/register",
      { email, password, display_name },
      false,
    );
  },

  logout() {
    return request<{ logged_out: boolean; revoked: boolean }>("POST", "/api/auth/logout");
  },

  me() {
    return request<AuthMeData>("GET", "/api/auth/me");
  },

  switchTenant(tenant_id: string) {
    return request<AuthLoginData>("POST", "/api/auth/switch-tenant", { tenant_id });
  },
};

// ─── Permissions API ─────────────────────────────────────────────
export const permissionsApi = {
  snapshot() {
    return request<PermissionSnapshotData>("GET", "/api/permissions/me");
  },

  uiManifest() {
    return request<PermissionUIManifestData>("GET", "/api/permissions/ui-manifest");
  },
};

// ─── Workspace types ─────────────────────────────────────────────
export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  role: string;
}

export interface WorkspaceMemberData {
  workspace_id: string;
  user_id: string;
  role: string;
  status: string;
}

// ─── KnowledgeBase types ─────────────────────────────────────────
export interface KnowledgeBaseData {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  embedding_model: string;
  status: string;
  role?: string | null;
}

export interface KnowledgeBaseStatsData {
  kb_id: string;
  document_total: number;
  document_ready: number;
  document_processing: number;
  document_failed: number;
  document_deleted: number;
  chunk_total: number;
  job_total: number;
  job_queued: number;
  job_processing: number;
}

// ─── Document types ──────────────────────────────────────────────
export interface DocumentData {
  id: string;
  workspace_id: string;
  kb_id: string;
  title: string;
  source_type: string;
  source_uri?: string | null;
  current_version: number;
  status: string;
  metadata?: Record<string, unknown> | null;
}

export interface DocumentVersionData {
  version: number;
  status: string;
  source_uri?: string | null;
  chunk_count: number;
  created_at: string;
}

export interface DocumentChunkData {
  chunk_id: string;
  version: number;
  sequence: number;
  content: string;
  token_count: number;
  metadata?: Record<string, unknown> | null;
}

export interface DocumentChunkPageData {
  items: DocumentChunkData[];
  total: number;
  page: number;
  size: number;
}

export interface DocumentUploadData {
  document_id: string;
  version: number;
  job_id: string;
  status: string;
}

// ─── Workspace API ───────────────────────────────────────────────
export const workspaceApi = {
  list() {
    return request<WorkspaceData[]>("GET", "/api/workspaces");
  },
  get(id: string) {
    return request<WorkspaceData>("GET", `/api/workspaces/${id}`);
  },
  create(data: { name: string; slug: string; description?: string }) {
    return request<WorkspaceData>("POST", "/api/workspaces", data);
  },
  update(id: string, data: { name?: string; slug?: string; description?: string }) {
    return request<WorkspaceData>("PATCH", `/api/workspaces/${id}`, data);
  },
  delete(id: string) {
    return request<WorkspaceData>("DELETE", `/api/workspaces/${id}`);
  },
  listMembers(id: string) {
    return request<WorkspaceMemberData[]>("GET", `/api/workspaces/${id}/members`);
  },
  addMember(wsId: string, userId: string, role: string) {
    return request<WorkspaceMemberData>("POST", `/api/workspaces/${wsId}/members`, { user_id: userId, role });
  },
  removeMember(wsId: string, userId: string) {
    return request<void>("DELETE", `/api/workspaces/${wsId}/members/${userId}`);
  },
};

// ─── KnowledgeBase API ───────────────────────────────────────────
export const kbApi = {
  list(workspaceId?: string) {
    const qs = workspaceId ? `?workspace_id=${workspaceId}` : "";
    return request<KnowledgeBaseData[]>("GET", `/api/knowledge-bases${qs}`);
  },
  get(kbId: string) {
    return request<KnowledgeBaseData>("GET", `/api/knowledge-bases/${kbId}`);
  },
  stats(kbId: string) {
    return request<KnowledgeBaseStatsData>("GET", `/api/knowledge-bases/${kbId}/stats`);
  },
  create(data: { workspace_id: string; name: string; description?: string }) {
    return request<KnowledgeBaseData>("POST", "/api/knowledge-bases", data);
  },
  update(kbId: string, data: { name?: string; description?: string }) {
    return request<KnowledgeBaseData>("PATCH", `/api/knowledge-bases/${kbId}`, data);
  },
  delete(kbId: string) {
    return request<KnowledgeBaseData>("DELETE", `/api/knowledge-bases/${kbId}`);
  },
};

// ─── Document API ────────────────────────────────────────────────
export const documentApi = {
  list(kbId: string) {
    return request<DocumentData[]>("GET", `/api/knowledge-bases/${kbId}/documents`);
  },
  get(docId: string) {
    return request<DocumentData>("GET", `/api/documents/${docId}`);
  },
  upload(kbId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return uploadRequest<DocumentUploadData>(`/api/knowledge-bases/${kbId}/documents`, fd);
  },
  update(docId: string, data: { title?: string; metadata?: Record<string, unknown> }) {
    return request<DocumentData>("PATCH", `/api/documents/${docId}`, data);
  },
  delete(docId: string) {
    return request<DocumentData>("DELETE", `/api/documents/${docId}`);
  },
  reindex(docId: string) {
    return request<{ job_id: string; status: string }>("POST", `/api/documents/${docId}/reindex`);
  },
  listVersions(docId: string) {
    return request<DocumentVersionData[]>("GET", `/api/documents/${docId}/versions`);
  },
  listChunks(docId: string, page = 1, size = 20) {
    return request<DocumentChunkPageData>("GET", `/api/documents/${docId}/chunks?page=${page}&size=${size}`);
  },
};

// ─── Retrieval types ─────────────────────────────────────────────
export interface RetrievalHitData {
  chunk_id: string;
  document_id: string;
  document_version_id: string;
  kb_id: string;
  chunk_no: number;
  title_path?: string | null;
  score: number;
  match_type: string;
  snippet: string;
  metadata?: Record<string, unknown> | null;
  citation?: Record<string, unknown> | null;
  reason: string;
  matched_terms: string[];
  score_breakdown?: Record<string, unknown>;
}

export interface RetrievalQueryResult {
  hits: RetrievalHitData[];
  latency_ms: number;
  retrieval_strategy: string;
  query_rewrite?: { original: string; rewritten: string } | null;
  effective_min_score: number;
  rerank_applied: boolean;
}

// ─── Retrieval API ───────────────────────────────────────────────
export const retrievalApi = {
  query(data: {
    query: string;
    kb_ids?: string[];
    top_k?: number;
    retrieval_strategy?: "hybrid" | "vector" | "keyword";
    min_score?: number;
    with_citations?: boolean;
  }) {
    return request<RetrievalQueryResult>("POST", "/api/retrieval/query", data);
  },
};

// ─── Chat / Conversation types ───────────────────────────────────
export interface ConversationData {
  id: string;
  title: string;
  message_count: number;
  kb_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Array<Record<string, unknown>>;
  created_at: string;
}

export interface ChatCompletionResult {
  message_id: string;
  answer: string;
  citations: Array<Record<string, unknown>>;
  usage: Record<string, number>;
  conversation_id: string;
}

// ─── Chat API ────────────────────────────────────────────────────
export const chatApi = {
  listConversations(limit = 50, offset = 0) {
    return request<ConversationData[]>("GET", `/api/chat/conversations?limit=${limit}&offset=${offset}`);
  },
  getConversation(id: string) {
    return request<ConversationData>("GET", `/api/chat/conversations/${id}`);
  },
  updateConversation(id: string, title: string) {
    return request<ConversationData>("PATCH", `/api/chat/conversations/${id}`, { title });
  },
  deleteConversation(id: string) {
    return request<void>("DELETE", `/api/chat/conversations/${id}`);
  },
  listMessages(conversationId: string, limit = 100, offset = 0) {
    return request<ConversationMessageData[]>(
      "GET",
      `/api/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
    );
  },
  completions(data: {
    conversation_id?: string | null;
    messages: Array<{ role: string; content: string }>;
    kb_ids?: string[];
  }) {
    return request<ChatCompletionResult>("POST", "/api/chat/completions", data);
  },
};

// ─── Agent types ─────────────────────────────────────────────────
export interface AgentRunBriefData {
  run_id: string;
  status: string;
}

export interface AgentRunDetailData {
  run_id: string;
  status: string;
  plan_json: Record<string, unknown>;
  tool_calls: Array<Record<string, unknown>>;
  cost: number;
  started_at?: string | null;
  finished_at?: string | null;
}

// ─── Agent API ───────────────────────────────────────────────────
export const agentApi = {
  create(data: { task: string; conversation_id?: string; kb_ids?: string[] }) {
    return request<AgentRunBriefData>("POST", "/api/agent/runs", data);
  },
  get(runId: string) {
    return request<AgentRunDetailData>("GET", `/api/agent/runs/${runId}`);
  },
  cancel(runId: string) {
    return request<AgentRunBriefData>("POST", `/api/agent/runs/${runId}/cancel`);
  },
};

// ─── Feedback types ──────────────────────────────────────────────
export interface FeedbackItemData {
  id: string;
  feedback_type: string;
  feedback_value?: string | null;
  comment?: string | null;
  tags?: string[] | null;
  conversation_id?: string | null;
  message_id?: string | null;
  retrieval_log_id?: string | null;
  processed: boolean;
  user_name?: string;
  created_at: string;
}

export interface FeedbackReplayData {
  replay_id: string;
  status: string;
  [key: string]: unknown;
}

// ─── Feedback API ────────────────────────────────────────────────
export const feedbackApi = {
  list(params?: { processed?: boolean; feedback_type?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.processed !== undefined) qs.set("processed", String(params.processed));
    if (params?.feedback_type) qs.set("feedback_type", params.feedback_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<FeedbackItemData[]>("GET", `/api/feedback${q ? `?${q}` : ""}`);
  },
  create(data: {
    feedback_type: string;
    feedback_value?: string;
    comment?: string;
    conversation_id?: string;
    message_id?: string;
  }) {
    return request<unknown>("POST", "/api/feedback", data);
  },
  replay(feedbackId: string, replayType = "full_pipeline") {
    return request<FeedbackReplayData>("POST", "/api/feedback/replay", {
      feedback_id: feedbackId,
      replay_type: replayType,
    });
  },
  getReplay(replayId: string) {
    return request<FeedbackReplayData>("GET", `/api/feedback/replay/${replayId}`);
  },
};

// ─── Governance types ────────────────────────────────────────────
export interface DeletionRequestData {
  id: string;
  resource_type: string;
  resource_id: string;
  reason: string;
  status: string;
  requested_by: string;
  requested_at: string;
  proof_id?: string | null;
  target_name?: string;
  [key: string]: unknown;
}

export interface DeletionProofData {
  proof_id: string;
  deleted_at: string;
  executed_by: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Governance API ──────────────────────────────────────────────
export const governanceApi = {
  createDeletionRequest(resourceType: string, resourceId: string, reason: string) {
    return request<DeletionRequestData>(
      "POST",
      `/api/governance/deletion/requests?resource_type=${encodeURIComponent(resourceType)}&resource_id=${encodeURIComponent(resourceId)}&reason=${encodeURIComponent(reason)}`,
    );
  },
  approveDeletion(requestId: string) {
    return request<unknown>("POST", `/api/governance/deletion/requests/${requestId}/approve`);
  },
  rejectDeletion(requestId: string, reason: string) {
    return request<unknown>(
      "POST",
      `/api/governance/deletion/requests/${requestId}/reject?reject_reason=${encodeURIComponent(reason)}`,
    );
  },
  executeDeletion(requestId: string) {
    return request<unknown>("POST", `/api/governance/deletion/requests/${requestId}/execute`);
  },
  getDeletionProof(proofId: string) {
    return request<DeletionProofData>("GET", `/api/governance/deletion/proofs/${proofId}`);
  },
};

// ─── Ops types ───────────────────────────────────────────────────
export interface OpsOverviewData {
  tenant_id: string;
  window_hours: number;
  generated_at: string;
  ingestion_alert_status: string;
  ingestion_backlog_total: number;
  ingestion_failure_rate: number;
  retrieval_zero_hit_rate: number;
  estimated_total_cost: number;
  incident_open_total: number;
  incident_critical_open_total: number;
  webhook_enabled_total: number;
}

export interface CostSummaryData {
  tenant_id: string;
  window_hours: number;
  retrieval_request_total: number;
  chat_completion_total: number;
  prompt_tokens_total: number;
  completion_tokens_total: number;
  total_tokens: number;
  agent_run_total: number;
  agent_cost_total: number;
  chat_estimated_cost: number;
  estimated_total_cost: number;
}

export interface IncidentTicketData {
  ticket_id: string;
  title: string;
  severity: string;
  status: string;
  assignee?: string | null;
  description?: string | null;
  resolution?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface AlertWebhookData {
  webhook_id: string;
  name: string;
  url: string;
  event_types: string[];
  enabled: boolean;
  created_at: string;
  [key: string]: unknown;
}

export interface ReleaseRolloutData {
  rollout_id: string;
  version: string;
  status: string;
  progress: number;
  description?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface IngestionAlertsData {
  overall_status: string;
  rules: Array<{
    rule: string;
    status: string;
    current_value: number;
    threshold_warn: number;
    threshold_critical: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface SLOSummaryData {
  overall_status: string;
  items: Array<{
    metric: string;
    current: number;
    target: number;
    met: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface RetrievalQualityData {
  window_hours: number;
  zero_hit_rate: number;
  citation_coverage_rate: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  total_queries: number;
  [key: string]: unknown;
}

// ─── Ops API ─────────────────────────────────────────────────────
export const opsApi = {
  overview(windowHours = 24) {
    return request<OpsOverviewData>("GET", `/api/ops/overview?window_hours=${windowHours}`);
  },
  costSummary(windowHours = 24) {
    return request<CostSummaryData>("GET", `/api/ops/cost/summary?window_hours=${windowHours}`);
  },
  costLeaderboard(windowHours = 24, limit = 10) {
    return request<Array<Record<string, unknown>>>("GET", `/api/ops/cost/leaderboard?window_hours=${windowHours}&limit=${limit}`);
  },
  ingestionAlerts(windowHours = 24) {
    return request<IngestionAlertsData>("GET", `/api/ops/ingestion/alerts?window_hours=${windowHours}`);
  },
  sloSummary(windowHours = 24) {
    return request<SLOSummaryData>("GET", `/api/ops/slo/mvp-summary?window_hours=${windowHours}`);
  },
  retrievalQuality(windowHours = 24) {
    return request<RetrievalQualityData>("GET", `/api/ops/retrieval/quality?window_hours=${windowHours}`);
  },
  tenantHealth(windowHours = 24) {
    return request<Array<Record<string, unknown>>>("GET", `/api/ops/tenant-health?window_hours=${windowHours}`);
  },
  // Incidents
  listTickets(params?: { status?: string; severity?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.severity) qs.set("severity", params.severity);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<IncidentTicketData[]>("GET", `/api/ops/incidents/tickets${q ? `?${q}` : ""}`);
  },
  createTicket(data: { title: string; severity: string; description?: string }) {
    return request<IncidentTicketData>("POST", "/api/ops/incidents/tickets", data);
  },
  updateTicket(ticketId: string, data: { status?: string; assignee?: string; resolution?: string }) {
    return request<IncidentTicketData>("PATCH", `/api/ops/incidents/tickets/${ticketId}`, data);
  },
  diagnosis(windowHours = 24) {
    return request<Array<Record<string, unknown>>>("GET", `/api/ops/incidents/diagnosis?window_hours=${windowHours}`);
  },
  // Webhooks
  listWebhooks() {
    return request<AlertWebhookData[]>("GET", "/api/ops/alerts/webhooks");
  },
  upsertWebhook(data: { name: string; url: string; event_types: string[]; enabled: boolean }) {
    return request<AlertWebhookData>("PUT", "/api/ops/alerts/webhooks", data);
  },
  // Rollouts
  listRollouts(params?: { status?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<ReleaseRolloutData[]>("GET", `/api/ops/release/rollouts${q ? `?${q}` : ""}`);
  },
  createRollout(data: { version: string; description?: string }) {
    return request<ReleaseRolloutData>("POST", "/api/ops/release/rollouts", data);
  },
  rollback(rolloutId: string, reason: string) {
    return request<ReleaseRolloutData>("POST", `/api/ops/release/rollouts/${rolloutId}/rollback`, { reason });
  },
};
