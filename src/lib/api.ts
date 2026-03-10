/**
 * TKP Backend API Client
 * Base URL configurable; token managed via localStorage.
 */

const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "";

// ─── Token helpers ───────────────────────────────────────────────
// WARNING: localStorage is vulnerable to XSS attacks. In production, consider:
// 1. Using HttpOnly cookies for token storage
// 2. Implementing Content Security Policy (CSP)
// 3. Using secure, httpOnly cookies with SameSite attribute
const TOKEN_KEY = "tkp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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
  code?: string;

  constructor(status: number, body: unknown) {
    // Extract error message from standardized error response
    let message = `API Error ${status}`;
    let code: string | undefined;

    if (typeof body === "object" && body !== null) {
      if ("error" in body) {
        const errorObj = (body as { error: { message?: string; code?: string } }).error;
        if (errorObj.message) message = errorObj.message;
        if (errorObj.code) code = errorObj.code;
      } else if ("message" in body) {
        message = String((body as { message: unknown }).message);
      } else if ("detail" in body) {
        const detail = (body as { detail: unknown }).detail;
        if (typeof detail === "string") {
          message = detail;
        } else if (Array.isArray(detail)) {
          const first = detail[0] as { msg?: unknown } | undefined;
          message = typeof first?.msg === "string" ? first.msg : "请求参数校验失败";
        } else if (detail && typeof detail === "object" && "message" in detail) {
          message = String((detail as { message: unknown }).message);
        }
      }
    }

    super(message);
    this.status = status;
    this.body = body;
    this.code = code;
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

  const json = await res.json().catch(() => null);
  // All responses now follow the standard { data } structure
  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiResponse<T>).data;
  }
  return json as T;
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

  const json = await res.json().catch(() => null);
  // All responses now follow the standard { data } structure
  if (json && typeof json === "object" && "data" in json) {
    return (json as ApiResponse<T>).data;
  }
  return json as T;
}

// ─── Auth types ──────────────────────────────────────────────────
export interface AuthLoginData {
  access_token: string;
  token_type?: string;
  expires_at: string;
  expires_in: number;
  tenant_id?: string | null;
}

export interface MFATotpStatusData {
  enrolled: boolean;
  enabled: boolean;
  backup_codes_remaining: number;
}

export interface MFATotpSetupData {
  enrolled: boolean;
  enabled: boolean;
  secret: string;
  otpauth_uri: string;
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

export interface TenantRolePermissionData {
  role: string;
  permission_codes: string[];
}

export interface PermissionPolicyCenterData {
  template_version: string;
  catalog: string[];
  role_permissions: TenantRolePermissionData[];
  ui_manifest: PermissionUIManifestData;
}

export interface PermissionTemplateData {
  template_key: string;
  version: string;
  catalog: string[];
  role_permissions: TenantRolePermissionData[];
}

export interface PermissionTemplatePublishData {
  template_key: string;
  version: string;
  overwrite_existing: boolean;
  role_permissions: TenantRolePermissionData[];
}

export interface PermissionPolicySnapshotData {
  snapshot_id: string;
  template_version: string;
  role_permissions: TenantRolePermissionData[];
  note?: string | null;
  created_at: string;
}

export interface PermissionPolicyRollbackData {
  snapshot_id: string;
  role_permissions: TenantRolePermissionData[];
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

  mfaTotpStatus() {
    return request<MFATotpStatusData>("GET", "/api/auth/mfa/totp/status");
  },

  mfaTotpSetup(password: string) {
    return request<MFATotpSetupData>("POST", "/api/auth/mfa/totp/setup", { password });
  },

  mfaTotpEnable(code: string) {
    return request<{ enabled: boolean; backup_codes: string[] }>("POST", "/api/auth/mfa/totp/enable", { code });
  },

  mfaTotpDisable(payload: { password: string; otp_code?: string; backup_code?: string }) {
    return request<{ enabled: boolean }>("POST", "/api/auth/mfa/totp/disable", payload);
  },

  loginMfa(challengeToken: string, payload: { otp_code?: string; backup_code?: string }) {
    return request<AuthLoginData>("POST", "/api/auth/login/mfa", {
      challenge_token: challengeToken,
      ...payload,
    }, false);
  },
};

// ─── Permissions API ─────────────────────────────────────────────
export const permissionsApi = {
  snapshot() {
    return request<PermissionSnapshotData>("GET", "/api/permissions/me");
  },

  listPolicySnapshots(limit = 20, windowDays = 90) {
    return request<PermissionPolicySnapshotData[]>("GET", `/api/permissions/policies/snapshots?limit=${limit}&window_days=${windowDays}`);
  },

  latestPolicySnapshot() {
    return this.listPolicySnapshots(1, 90).then(snapshots => snapshots[0] || null);
  },

  uiManifest() {
    return request<PermissionUIManifestData>("GET", "/api/permissions/ui-manifest");
  },

  catalog() {
    return request<{ permission_codes: string[] }>("GET", "/api/permissions/catalog").then(
      (res) => (res.permission_codes ?? []).map(code => ({ code, name: code, description: code })),
    );
  },

  policyCenter() {
    return request<PermissionPolicyCenterData>("GET", "/api/permissions/policy-center");
  },

  defaultTemplate() {
    return request<PermissionTemplateData>("GET", "/api/permissions/templates/default");
  },

  publishDefaultTemplate(overwriteExisting = false) {
    return request<PermissionTemplatePublishData>("POST", "/api/permissions/templates/default/publish", {
      overwrite_existing: overwriteExisting,
    });
  },

  listRoles() {
    return request<TenantRolePermissionData[]>("GET", "/api/permissions/roles");
  },

  updateRole(role: string, permissionCodes: string[]) {
    return request<TenantRolePermissionData>(
      "PUT",
      `/api/permissions/roles/${encodeURIComponent(role)}`,
      { permission_codes: permissionCodes },
    );
  },

  resetRole(role: string) {
    return request<TenantRolePermissionData>(
      "DELETE",
      `/api/permissions/roles/${encodeURIComponent(role)}`,
    );
  },

  createPolicySnapshot(note?: string) {
    return request<PermissionPolicySnapshotData>("POST", "/api/permissions/policies/snapshots", {
      note,
    });
  },

  rollbackPolicySnapshot(snapshotId: string) {
    return request<PermissionPolicyRollbackData>(
      "POST",
      `/api/permissions/policies/snapshots/${encodeURIComponent(snapshotId)}/rollback`,
    );
  },
};

// ─── Users types/API ────────────────────────────────────────────
export interface TenantUserData {
  user_id: string;
  email: string;
  display_name: string;
  user_status: string;
  tenant_role: string;
  membership_status: string;
}

export interface UserPreferencesData {
  theme: "light" | "dark";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    browser: boolean;
    alerts: boolean;
    [key: string]: boolean;
  };
  security?: {
    password_reset_email: boolean;
    two_factor_enabled: boolean;
    [key: string]: boolean;
  };
}

export interface TenantData {
  tenant_id: string;
  name: string;
  slug: string;
  role: string;
  status: string;
}

export interface TenantMemberData {
  tenant_id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
}

export const usersApi = {
  list() {
    return request<TenantUserData[]>("GET", "/api/users");
  },
  get(userId: string) {
    return request<TenantUserData>("GET", `/api/users/${userId}`);
  },
  update(userId: string, data: { display_name?: string; status?: string }) {
    return request<TenantUserData>("PATCH", `/api/users/${userId}`, data);
  },
  remove(userId: string) {
    return request<TenantUserData>("DELETE", `/api/users/${userId}`);
  },
  getPreferences(userId: string) {
    return request<UserPreferencesData>("GET", `/api/users/${userId}/preferences`);
  },
  upsertPreferences(userId: string, data: UserPreferencesData) {
    return request<UserPreferencesData>("PUT", `/api/users/${userId}/preferences`, data);
  },
};

export const tenantApi = {
  list() {
    return request<TenantData[]>("GET", "/api/tenants");
  },
  create(data: { name: string; slug: string }) {
    return request<{
      tenant_id: string;
      name: string;
      slug: string;
      role: string;
      default_workspace_id: string;
    }>("POST", "/api/tenants", data);
  },
  get(tenantId: string) {
    return request<TenantData>("GET", `/api/tenants/${tenantId}`);
  },
  update(tenantId: string, data: { name?: string; slug?: string; status?: string }) {
    return request<TenantData>("PATCH", `/api/tenants/${tenantId}`, data);
  },
  delete(tenantId: string) {
    return request<TenantData>("DELETE", `/api/tenants/${tenantId}`);
  },
  listInvitations() {
    return request<TenantData[]>("GET", "/api/tenants/invitations");
  },
  join(tenantId: string) {
    return request<TenantMemberData>("POST", `/api/tenants/${tenantId}/join`);
  },
  listMembers(tenantId: string) {
    return request<TenantMemberData[]>("GET", `/api/tenants/${tenantId}/members`);
  },
  inviteMember(tenantId: string, email: string, role: string) {
    return request<TenantMemberData>("POST", `/api/tenants/${tenantId}/invitations`, { email, role });
  },
  addMemberDirectly(tenantId: string, email: string, role: string) {
    return request<TenantMemberData>("POST", `/api/tenants/${tenantId}/members`, { email, role });
  },
  updateMemberRole(tenantId: string, userId: string, role: string) {
    return request<TenantMemberData>(
      "PUT",
      `/api/tenants/${tenantId}/members/${encodeURIComponent(userId)}/role`,
      { role },
    );
  },
  removeMember(tenantId: string, userId: string) {
    return request<TenantMemberData>("DELETE", `/api/tenants/${tenantId}/members/${encodeURIComponent(userId)}`);
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
  email: string;
  role: string;
  status: string;
}

export interface KBMemberData {
  kb_id: string;
  user_id: string;
  email?: string;
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

export interface KBMemberData {
  kb_id: string;
  user_id: string;
  role: string;
  status: string;
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

export interface IngestionJobDiagnosisData {
  category: string;
  summary: string;
  suggestion: string;
}

export interface IngestionJobData {
  job_id: string;
  workspace_id: string;
  document_id: string;
  document_version_id: string;
  status: string;
  stage: string;
  progress: number;
  attempt_count: number;
  max_attempts: number;
  next_run_at: string | null;
  locked_at?: string | null;
  locked_by?: string | null;
  heartbeat_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  terminal: boolean;
  retryable: boolean;
  can_retry_now: boolean;
  retry_in_seconds: number;
  diagnosis: IngestionJobDiagnosisData;
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
  upsertMember(wsId: string, data: { user_id: string; role: string }) {
    return request<WorkspaceMemberData>("POST", `/api/workspaces/${wsId}/members`, data);
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
  listMembers(kbId: string) {
    return request<KBMemberData[]>("GET", `/api/knowledge-bases/${kbId}/members`);
  },
  upsertMember(kbId: string, userId: string, role: string) {
    return request<KBMemberData>(
      "PUT",
      `/api/knowledge-bases/${kbId}/members/${encodeURIComponent(userId)}`,
      { role },
    );
  },
  removeMember(kbId: string, userId: string) {
    return request<KBMemberData>(
      "DELETE",
      `/api/knowledge-bases/${kbId}/members/${encodeURIComponent(userId)}`,
    );
  },
  getStats(kbId: string) {
    return request<KnowledgeBaseStatsData>("GET", `/api/knowledge-bases/${kbId}/stats`);
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
  upload(kbId: string, formData: FormData) {
    return uploadRequest<DocumentUploadData>(`/api/knowledge-bases/${kbId}/documents`, formData);
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
  getIngestionStatus(docId: string) {
    return request<{
      document_id: string;
      status: string;
      current_version: number;
      latest_job?: {
        job_id: string;
        status: string;
        progress?: number;
        error_message?: string;
        created_at: string;
        updated_at: string;
      };
    }>("GET", `/api/documents/${docId}/ingestion-status`);
  },
  getIngestionJob(jobId: string) {
    return request<IngestionJobData>("GET", `/api/ingestion-jobs/${encodeURIComponent(jobId)}`);
  },
  retryIngestionJob(jobId: string) {
    return request<IngestionJobData>(
      "POST",
      `/api/ingestion-jobs/${encodeURIComponent(jobId)}/retry`,
    );
  },
  deadLetterIngestionJob(jobId: string, reason?: string) {
    return request<IngestionJobData>(
      "POST",
      `/api/ingestion-jobs/${encodeURIComponent(jobId)}/dead-letter`,
      { reason },
    );
  },
  listVersions(docId: string) {
    return request<
      Array<{
        id: string;
        document_id: string;
        version: number;
        object_key?: string | null;
        parse_status: string;
        created_at: string;
      }>
    >("GET", `/api/documents/${docId}/versions`).then((versions) =>
      versions.map((item) => ({
        version: item.version,
        status: item.parse_status,
        source_uri: item.object_key ?? null,
        chunk_count: 0,
        created_at: item.created_at,
      })),
    );
  },
  listChunks(docId: string, page = 1, size = 20) {
    const offset = Math.max(0, (page - 1) * size);
    return request<{
      version: number;
      total: number;
      offset: number;
      limit: number;
      items: Array<{
        id: string;
        chunk_no: number;
        content: string;
        token_count: number;
      }>;
    }>("GET", `/api/documents/${docId}/chunks?offset=${offset}&limit=${size}`).then((chunkPage) => ({
      total: chunkPage.total,
      page: Math.floor(chunkPage.offset / Math.max(chunkPage.limit, 1)) + 1,
      size: chunkPage.limit,
      items: chunkPage.items.map((item) => ({
        chunk_id: item.id,
        version: chunkPage.version,
        sequence: item.chunk_no,
        content: item.content,
        token_count: item.token_count,
      })),
    }));
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

type ConversationKbScope =
  | string[]
  | {
      kb_ids?: string[] | null;
    }
  | null
  | undefined;

function normalizeConversationKbScope(scope: ConversationKbScope): string[] | undefined {
  if (Array.isArray(scope)) {
    return scope.filter((id): id is string => typeof id === "string");
  }

  if (scope && typeof scope === "object" && "kb_ids" in scope) {
    const kbIds = scope.kb_ids;
    if (Array.isArray(kbIds)) {
      return kbIds.filter((id): id is string => typeof id === "string");
    }
  }

  return undefined;
}

// ─── Chat API ────────────────────────────────────────────────────
export const chatApi = {
  listConversations(limit = 50, offset = 0) {
    return request<{
      conversations: Array<{
        conversation_id: string;
        title: string;
        kb_scope?: ConversationKbScope;
        created_at: string;
        updated_at: string;
      }>;
    }>("GET", `/api/chat/conversations?limit=${limit}&offset=${offset}`).then((resp) =>
      (resp.conversations ?? []).map((item) => ({
        id: item.conversation_id,
        title: item.title,
        message_count: 0,
        kb_ids: normalizeConversationKbScope(item.kb_scope),
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    );
  },
  getConversation(id: string) {
    return request<{
      conversation_id: string;
      title: string;
      message_count: number;
      kb_scope?: ConversationKbScope;
      created_at: string;
      updated_at: string;
    }>("GET", `/api/chat/conversations/${id}`).then((item) => ({
      id: item.conversation_id,
      title: item.title,
      message_count: item.message_count,
      kb_ids: normalizeConversationKbScope(item.kb_scope),
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },
  updateConversation(id: string, title: string) {
    return request<{
      conversation_id: string;
      title: string;
      created_at?: string;
      updated_at: string;
    }>("PATCH", `/api/chat/conversations/${id}`, { title }).then((item) => ({
      id: item.conversation_id,
      title: item.title,
      message_count: 0,
      created_at: item.created_at || item.updated_at, // 后端暂未返回 created_at，使用 updated_at 作为 fallback
      updated_at: item.updated_at,
    }));
  },
  createConversation(data: { kb_ids: string[] }) {
    return request<{
      conversation_id: string;
      title: string;
      kb_scope?: ConversationKbScope;
      created_at: string;
      updated_at: string;
    }>("POST", "/api/chat/conversations", { kb_ids: data.kb_ids }).then((item) => ({
      id: item.conversation_id,
      title: item.title,
      message_count: 0,
      kb_ids: normalizeConversationKbScope(item.kb_scope),
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },
  deleteConversation(id: string) {
    return request<void>("DELETE", `/api/chat/conversations/${id}`);
  },
  listMessages(conversationId: string, limit = 100, offset = 0) {
    return request<{
      messages: Array<{
        message_id: string;
        role: "user" | "assistant" | "system";
        content: string;
        citations?: Array<Record<string, unknown>>;
        created_at: string;
      }>;
    }>(
      "GET",
      `/api/chat/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
    ).then((resp) =>
      (resp.messages ?? []).map((item) => ({
        id: item.message_id,
        role: item.role,
        content: item.content,
        citations: item.citations,
        created_at: item.created_at,
      })),
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
  list(params?: { status?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<AgentRunBriefData[]>("GET", `/api/agent/runs${q ? `?${q}` : ""}`);
  },
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
    return request<{
      feedbacks: Array<{
        feedback_id: string;
        feedback_type: string;
        feedback_value?: string | null;
        comment?: string | null;
        tags?: string[] | null;
        conversation_id?: string | null;
        message_id?: string | null;
        retrieval_log_id?: string | null;
        processed: boolean;
        created_at: string;
      }>;
    }>("GET", `/api/feedback${q ? `?${q}` : ""}`).then((resp) =>
      (resp.feedbacks ?? []).map((item) => ({
        id: item.feedback_id,
        feedback_type: item.feedback_type,
        feedback_value: item.feedback_value,
        comment: item.comment,
        tags: item.tags,
        conversation_id: item.conversation_id,
        message_id: item.message_id,
        retrieval_log_id: item.retrieval_log_id,
        processed: item.processed,
        created_at: item.created_at,
      })),
    );
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
  request_id: string;
  tenant_id?: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  reason?: string;
  status: string;
  requested_at: string;
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

export interface RetentionCleanupData {
  resource_type: string;
  dry_run: boolean;
  expired_count?: number;
  deleted_count?: number;
  archived_count?: number;
  [key: string]: unknown;
}

export interface PIIMaskData {
  original_length: number;
  masked_text: string;
  masked_length: number;
}

// ─── Governance API ──────────────────────────────────────────────
export const governanceApi = {
  listDeletionRequests(params?: { status?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<{ requests: DeletionRequestData[] }>("GET", `/api/governance/deletion/requests${q ? `?${q}` : ""}`);
  },
  createDeletionRequest(resourceType: string, resourceId: string, reason: string) {
    return request<DeletionRequestData>(
      "POST",
      "/api/governance/deletion/requests",
      {
        resource_type: resourceType,
        resource_id: resourceId,
        reason: reason,
      },
    );
  },
  approveDeletion(requestId: string) {
    return request<unknown>("POST", `/api/governance/deletion/requests/${requestId}/approve`);
  },
  rejectDeletion(requestId: string, reason: string) {
    return request<unknown>(
      "POST",
      `/api/governance/deletion/requests/${requestId}/reject`,
      { reason },
    );
  },
  cancelDeletion(requestId: string) {
    return request<unknown>("POST", `/api/governance/deletion/requests/${requestId}/cancel`);
  },
  executeDeletion(requestId: string) {
    return request<unknown>("POST", `/api/governance/deletion/requests/${requestId}/execute`);
  },
  getDeletionProof(proofId: string) {
    return request<{
      proof_id: string;
      request_id: string;
      resource_type: string;
      resource_id: string;
      deleted_at: string;
      data_hash?: string;
      proof_hash?: string;
      deleted_by?: string | null;
    }>("GET", `/api/governance/deletion/proofs/${proofId}`).then((proof) => ({
      proof_id: proof.proof_id,
      deleted_at: proof.deleted_at,
      executed_by: proof.deleted_by ?? "",
      resource_type: proof.resource_type,
      resource_id: proof.resource_id,
      details: {
        request_id: proof.request_id,
        data_hash: proof.data_hash,
        proof_hash: proof.proof_hash,
      },
    }));
  },
  retentionCleanup(resourceType: string, dryRun = true) {
    return request<RetentionCleanupData>("POST", "/api/governance/retention/cleanup", {
      resource_type: resourceType,
      dry_run: dryRun,
    });
  },
  listRetentionPolicies() {
    return request<{
      policies: Array<{
        resource_type: string;
        retention_days: number;
        auto_delete: boolean;
        archive_before_delete: boolean;
      }>;
    }>("GET", "/api/governance/retention/policies");
  },
  createRetentionPolicy(resourceType: string, retentionDays: number, autoDelete = false, archiveBeforeDelete = false) {
    return request<{
      resource_type: string;
      retention_days: number;
      auto_delete: boolean;
      archive_before_delete: boolean;
    }>("POST", "/api/governance/retention/policies", {
      resource_type: resourceType,
      retention_days: retentionDays,
      auto_delete: autoDelete,
      archive_before_delete: archiveBeforeDelete,
    });
  },
  updateRetentionPolicy(resourceType: string, retentionDays: number, autoDelete = false, archiveBeforeDelete = false) {
    return request<{
      resource_type: string;
      retention_days: number;
      auto_delete: boolean;
      archive_before_delete: boolean;
    }>("PUT", `/api/governance/retention/policies/${encodeURIComponent(resourceType)}`, {
      resource_type: resourceType,
      retention_days: retentionDays,
      auto_delete: autoDelete,
      archive_before_delete: archiveBeforeDelete,
    });
  },
  executeRetention() {
    // 执行所有自动清理策略
    return request<Record<string, unknown>>("POST", "/api/governance/retention/execute");
  },
  cleanupExpiredData(resourceType: string, dryRun: boolean) {
    return this.retentionCleanup(resourceType, dryRun);
  },
  piiMask(text: string, piiTypes?: string[]) {
    return request<PIIMaskData>("POST", "/api/governance/pii/mask", {
      text: text,
      pii_types: piiTypes ?? [],
    });
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

export interface AlertData {
  alert_id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  triggered_at: string;
  [key: string]: unknown;
}

export interface QuotaData {
  quota_id: string;
  metric_code: string;
  scope_type: string;
  scope_id: string;
  limit_value: number;
  current_usage?: number;
  window_type: string;
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

export interface IngestionMetricsData {
  queued: number;
  processing: number;
  retrying: number;
  completed: number;
  dead_letter: number;
  backlog_total: number;
  completed_last_window: number;
  dead_letter_last_window: number;
  failure_rate_last_window: number;
  avg_latency_ms_last_window?: number | null;
  p95_latency_ms_last_window?: number | null;
  stale_processing_jobs: number;
  [key: string]: unknown;
}

export interface QuotaPolicyData {
  id: string;
  scope_type: string;
  scope_id: string;
  metric_code: string;
  limit_value: number;
  window_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface QuotaAlertData {
  alert_id: string;
  metric_code: string;
  scope_type: string;
  scope_id: string;
  limit_value: number;
  used_value: number;
  projected_value: number;
  window_minutes: number;
  created_at: string;
  [key: string]: unknown;
}

export interface RetrievalEvalSampleData {
  query: string;
  expected_terms: string[];
  matched: boolean;
  hit_count: number;
  citation_covered: boolean;
  top_hit_score?: number | null;
  latency_ms: number;
}

export interface RetrievalEvalRunData {
  run_id: string;
  name: string;
  status: string;
  sample_total: number;
  matched_total: number;
  hit_at_k: number;
  citation_coverage_rate: number;
  avg_latency_ms?: number | null;
  created_at: string;
}

export interface RetrievalEvalRunDetailData extends RetrievalEvalRunData {
  results: RetrievalEvalSampleData[];
}

export interface RetrievalEvalCompareData {
  delta_hit_at_k?: number | null;
  delta_citation_coverage_rate?: number | null;
  delta_avg_latency_ms?: number | null;
  improved: boolean;
  baseline: RetrievalEvalRunDetailData;
  current: RetrievalEvalRunDetailData;
  [key: string]: unknown;
}

export interface AlertDispatchResultData {
  event_type: string;
  severity: string;
  dry_run: boolean;
  matched_webhook_total: number;
  delivered_total: number;
  results: Array<{
    webhook_id: string;
    name: string;
    url: string;
    status_code?: number | null;
    delivered: boolean;
    error?: string | null;
    dry_run: boolean;
  }>;
}

export interface SecurityBaselineData {
  overall_status: string;
  checks: Array<{ code: string; name: string; status: string; message: string }>;
}

export interface PublicSLAData {
  version: string;
  service_tier: string;
  availability_sla: Record<string, unknown>;
  support_sla: Record<string, unknown>;
  slo: Array<Record<string, unknown>>;
  updated_at: string;
}

export interface RunbookSummaryData {
  version: string;
  oncall: Record<string, unknown>;
  playbooks: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  updated_at: string;
}

interface IncidentTicketRawData {
  ticket_id: string;
  title: string;
  severity: string;
  status: string;
  assignee_user_id?: string | null;
  summary?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface ReleaseRolloutRawData {
  rollout_id: string;
  version: string;
  status: string;
  canary_percent?: number;
  note?: string | null;
  created_at: string;
  [key: string]: unknown;
}

function mapIncidentTicket(raw: IncidentTicketRawData): IncidentTicketData {
  return {
    ...raw,
    assignee: raw.assignee_user_id ?? null,
    description: raw.summary ?? null,
    resolution: raw.resolution_note ?? null,
  };
}

function mapReleaseRollout(raw: ReleaseRolloutRawData): ReleaseRolloutData {
  return {
    ...raw,
    progress: raw.canary_percent ?? 0,
    description: raw.note ?? null,
  };
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
    return request<{
      overall_status: string;
      rules: Array<{
        name: string;
        status: string;
        current: number;
        warn_threshold: number;
        critical_threshold: number;
      }>;
    }>("GET", `/api/ops/ingestion/alerts?window_hours=${windowHours}`).then((raw) => ({
      overall_status: raw.overall_status,
      rules: (raw.rules ?? []).map((rule) => ({
        rule: rule.name,
        status: rule.status,
        current_value: rule.current,
        threshold_warn: rule.warn_threshold,
        threshold_critical: rule.critical_threshold,
      })),
    }));
  },
  ingestionMetrics(windowHours = 24, staleSeconds = 120) {
    return request<IngestionMetricsData>(
      "GET",
      `/api/ops/ingestion/metrics?window_hours=${windowHours}&stale_seconds=${staleSeconds}`,
    );
  },
  sloSummary(windowHours = 24) {
    return request<{
      overall_status: string;
      checks: Array<{
        name: string;
        current: number;
        target: number;
        status: string;
      }>;
    }>("GET", `/api/ops/slo/mvp-summary?window_hours=${windowHours}`).then((raw) => ({
      overall_status: raw.overall_status === "pass" ? "met" : "miss",
      items: (raw.checks ?? []).map((item) => ({
        metric: item.name,
        current: item.current,
        target: item.target,
        met: item.status === "pass",
      })),
    }));
  },
  retrievalQuality(windowHours = 24) {
    return request<{
      window_hours: number;
      zero_hit_rate: number;
      citation_coverage_rate: number;
      avg_latency_ms?: number | null;
      p95_latency_ms?: number | null;
      query_total: number;
    }>("GET", `/api/ops/retrieval/quality?window_hours=${windowHours}`).then((raw) => ({
      window_hours: raw.window_hours,
      zero_hit_rate: raw.zero_hit_rate,
      citation_coverage_rate: raw.citation_coverage_rate,
      latency_p50_ms: raw.avg_latency_ms ?? 0,
      latency_p95_ms: raw.p95_latency_ms ?? 0,
      latency_p99_ms: raw.p95_latency_ms ?? 0,
      total_queries: raw.query_total,
    }));
  },
  evaluateRetrieval(data: { kb_ids?: string[]; top_k?: number; samples: Array<{ query: string; expected_terms?: string[] }> }) {
    return request<{
      sample_total: number;
      matched_total: number;
      hit_at_k: number;
      citation_coverage_rate: number;
      avg_latency_ms?: number | null;
      results: RetrievalEvalSampleData[];
    }>("POST", "/api/ops/retrieval/evaluate", data);
  },
  createEvalRun(data: { name: string; kb_ids?: string[]; top_k?: number; samples: Array<{ query: string; expected_terms?: string[] }> }) {
    return request<RetrievalEvalRunDetailData>("POST", "/api/ops/retrieval/evaluate/runs", data);
  },
  listEvalRuns(limit = 20, offset = 0) {
    return request<RetrievalEvalRunData[]>("GET", `/api/ops/retrieval/evaluate/runs?limit=${limit}&offset=${offset}`);
  },
  getEvalRun(runId: string) {
    return request<RetrievalEvalRunDetailData>("GET", `/api/ops/retrieval/evaluate/runs/${runId}`);
  },
  compareEvalRuns(baselineRunId: string, currentRunId: string) {
    const qs = new URLSearchParams();
    qs.set("baseline_run_id", baselineRunId);
    qs.set("current_run_id", currentRunId);
    return request<RetrievalEvalCompareData>("GET", `/api/ops/retrieval/evaluate/compare?${qs.toString()}`);
  },
  upsertQuotaPolicy(data: { metric_code: string; scope_type?: string; scope_id?: string; limit_value: number; window_minutes: number; enabled?: boolean }) {
    return request<QuotaPolicyData>("PUT", "/api/ops/quotas", data);
  },
  createQuotaPolicy(data: { metric_code: string; scope_type?: string; scope_id?: string; limit_value: number; window_minutes?: number; enabled?: boolean }) {
    return request<QuotaPolicyData>("POST", "/api/ops/quotas", {
      ...data,
      window_minutes: data.window_minutes ?? 60,
    });
  },
  updateQuotaPolicy(policyId: string, data: { metric_code: string; scope_type?: string; scope_id?: string; limit_value: number; window_minutes?: number; enabled?: boolean }) {
    return request<QuotaPolicyData>("PUT", `/api/ops/quotas/${policyId}`, {
      ...data,
      window_minutes: data.window_minutes ?? 60,
    });
  },
  listQuotaPolicies() {
    return request<QuotaPolicyData[]>("GET", "/api/ops/quotas");
  },
  listQuotaAlerts(windowHours = 24, limit = 20) {
    return request<QuotaAlertData[]>(`GET`, `/api/ops/quotas/alerts?window_hours=${windowHours}&limit=${limit}`);
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
    return request<IncidentTicketRawData[]>("GET", `/api/ops/incidents/tickets${q ? `?${q}` : ""}`).then((items) =>
      items.map(mapIncidentTicket),
    );
  },
  createTicket(data: {
    title: string;
    severity: string;
    description?: string;
    source_code?: string;
    diagnosis?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }) {
    return request<IncidentTicketRawData>("POST", "/api/ops/incidents/tickets", {
      source_code: data.source_code ?? "manual",
      severity: data.severity,
      title: data.title,
      summary: data.description || data.title,
      diagnosis: data.diagnosis ?? {},
      context: data.context ?? {},
    }).then(mapIncidentTicket);
  },
  updateTicket(ticketId: string, data: { status?: string; assignee?: string; resolution?: string }) {
    return request<IncidentTicketRawData>("PATCH", `/api/ops/incidents/tickets/${ticketId}`, {
      status: data.status,
      assignee_user_id: data.assignee,
      resolution_note: data.resolution,
    }).then(mapIncidentTicket);
  },
  diagnosis(windowHours = 24) {
    return request<Array<Record<string, unknown>>>("GET", `/api/ops/incidents/diagnosis?window_hours=${windowHours}`);
  },
  // Webhooks
  listWebhooks() {
    return request<AlertWebhookData[]>("GET", "/api/ops/alerts/webhooks").then((items) =>
      items.map((item) => ({
        ...item,
        events: item.event_types ?? [],
      })),
    );
  },
  upsertWebhook(data: { name: string; url: string; event_types: string[]; enabled: boolean }) {
    return request<AlertWebhookData>("PUT", "/api/ops/alerts/webhooks", data);
  },
  deleteWebhook(webhookId: string) {
    return request<{ webhook_id: string; deleted: boolean }>("DELETE", `/api/ops/alerts/webhooks/${webhookId}`);
  },
  dispatchAlert(data: {
    event_type: string;
    severity: string;
    title: string;
    message: string;
    attributes?: Record<string, unknown>;
    dry_run?: boolean;
  }) {
    return request<AlertDispatchResultData>("POST", "/api/ops/alerts/dispatch", {
      ...data,
      attributes: data.attributes ?? {},
      dry_run: data.dry_run ?? true,
    });
  },
  acknowledgeAlert(alertId: string) {
    return request<{ alert_id: string; status: string }>("POST", `/api/ops/alerts/${alertId}/acknowledge`);
  },
  resolveAlert(alertId: string) {
    return request<{ alert_id: string; status: string }>("POST", `/api/ops/alerts/${alertId}/resolve`);
  },
  // Ingestion Jobs
  listIngestionJobs(params?: { status?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<Array<{
      job_id: string;
      document_id: string;
      status: string;
      progress: number;
      error_message?: string | null;
      created_at: string;
      updated_at: string;
    }>>("GET", `/api/ops/ingestion/jobs${q ? `?${q}` : ""}`);
  },
  // Rollouts
  listRollouts(params?: { status?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<ReleaseRolloutRawData[]>("GET", `/api/ops/release/rollouts${q ? `?${q}` : ""}`).then((items) =>
      items.map(mapReleaseRollout),
    );
  },
  createRollout(data: {
    version: string;
    description?: string;
    strategy?: string;
    risk_level?: string;
    canary_percent?: number;
    scope?: Record<string, unknown>;
  }) {
    return request<ReleaseRolloutRawData>("POST", "/api/ops/release/rollouts", {
      version: data.version,
      strategy: data.strategy ?? "canary",
      risk_level: data.risk_level ?? "medium",
      canary_percent: data.canary_percent ?? 10,
      scope: data.scope ?? {},
      note: data.description,
    }).then(mapReleaseRollout);
  },
  rollback(rolloutId: string, reason: string) {
    return request<ReleaseRolloutRawData>("POST", `/api/ops/release/rollouts/${rolloutId}/rollback`, { reason }).then(mapReleaseRollout);
  },
  listDeletionProofs(params?: { resource_type?: string; limit?: number; offset?: number }) {
    const qs = new URLSearchParams();
    if (params?.resource_type) qs.set("resource_type", params.resource_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return request<Array<{
      proof_id: string;
      resource_type: string;
      resource_id: string;
      deleted_at: string;
      deleted_by?: string | null;
      proof_payload?: Record<string, unknown>;
      [key: string]: unknown;
    }>>("GET", `/api/ops/compliance/deletion-proofs${q ? `?${q}` : ""}`).then((items) =>
      items.map((item) => ({
        proof_id: item.proof_id,
        deleted_at: item.deleted_at,
        executed_by: item.deleted_by ?? "",
        resource_type: item.resource_type,
        resource_id: item.resource_id,
        details: item.proof_payload,
      })),
    );
  },
  securityBaseline() {
    return request<SecurityBaselineData>("GET", "/api/ops/compliance/security-baseline");
  },
  publicSLA() {
    return request<PublicSLAData>("GET", "/api/ops/sla/public");
  },
  runbook() {
    return request<RunbookSummaryData>("GET", "/api/ops/runbook");
  },
  // Ops pages compatibility methods
  async getMetrics(timeRange = 24) {
    const [overview, ingestion, retrieval] = await Promise.all([
      this.overview(timeRange),
      this.ingestionMetrics(timeRange).catch(() => null),
      this.retrievalQuality(timeRange).catch(() => null),
    ]);
    return {
      active_alerts: overview.incident_open_total ?? 0,
      critical_alerts: overview.incident_critical_open_total ?? 0,
      ingestion_jobs: ingestion?.backlog_total ?? 0,
      processing_jobs: ingestion?.processing ?? 0,
      avg_response_time: retrieval?.latency_p50_ms ?? ingestion?.avg_latency_ms_last_window ?? 0,
      p95_response_time: retrieval?.latency_p95_ms ?? ingestion?.p95_latency_ms_last_window ?? 0,
      cpu_usage: 0,
      memory_usage: 0,
      disk_usage: 0,
      network_usage: 0,
      recent_activities: [],
    };
  },
  async listAlerts(status?: string) {
    const [quotaAlerts, ingestionAlerts] = await Promise.all([
      this.listQuotaAlerts(24, 50).catch(() => [] as QuotaAlertData[]),
      this.ingestionAlerts(24).catch(() => ({ rules: [] as IngestionAlertsData["rules"] })),
    ]);
    const quotaItems: AlertData[] = quotaAlerts.map((item) => ({
      alert_id: item.alert_id,
      title: `配额告警: ${item.metric_code}`,
      message: `${item.scope_type}/${item.scope_id} 已使用 ${item.used_value}/${item.limit_value}`,
      severity: item.used_value >= item.limit_value ? "critical" : "warning",
      status: "active",
      triggered_at: item.created_at,
    }));
    const ingestionItems: AlertData[] = (ingestionAlerts.rules ?? []).map((rule) => ({
      alert_id: `ingestion-${rule.rule}`,
      title: `入库监控: ${rule.rule}`,
      message: `当前值 ${rule.current_value}，告警阈值 ${rule.threshold_warn}/${rule.threshold_critical}`,
      severity: rule.status === "critical" ? "critical" : rule.status === "warn" ? "warning" : "info",
      status: rule.status === "pass" ? "resolved" : "active",
      triggered_at: new Date().toISOString(),
    }));
    const merged = [...quotaItems, ...ingestionItems];
    if (!status) return merged;
    return merged.filter((item) => item.status === status);
  },
  acknowledgeAlert(alertId: string) {
    return request<{ alert_id: string; status: string }>("POST", `/api/ops/alerts/${encodeURIComponent(alertId)}/acknowledge`);
  },
  resolveAlert(alertId: string) {
    return request<{ alert_id: string; status: string }>("POST", `/api/ops/alerts/${encodeURIComponent(alertId)}/resolve`);
  },
  listIngestionJobs(statusFilter?: string, limit = 50, offset = 0) {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status_filter", statusFilter);
    qs.set("limit", String(limit));
    qs.set("offset", String(offset));
    return request<{
      jobs: Array<{
        job_id: string;
        document_id: string;
        status: string;
        progress?: number;
        error_message?: string;
        created_at?: string;
        updated_at?: string;
      }>;
      total: number;
      limit: number;
      offset: number;
    }>("GET", `/api/ops/ingestion/jobs?${qs.toString()}`);
  },
  // Incidents
  listIncidents() {
    return this.listTickets({ limit: 100 }).then((items) =>
      items.map((item) => ({
        ...item,
        incident_id: String(item.ticket_id ?? ""),
        severity: item.severity === "warn" ? "medium" : item.severity === "info" ? "low" : item.severity,
      })),
    );
  },
  createIncident(data: { title: string; description: string; severity: string }) {
    return this.createTicket(data).then((item) => ({
      ...item,
      incident_id: String(item.ticket_id ?? ""),
      severity: item.severity === "warn" ? "medium" : item.severity === "info" ? "low" : item.severity,
    }));
  },
  updateIncident(id: string, data: { title?: string; description?: string; status?: string; severity?: string }) {
    return this.updateTicket(id, {
      status: data.status,
      resolution: data.status === "resolved" ? data.description : undefined,
    }).then((item) => ({
      ...item,
      incident_id: String(item.ticket_id ?? id),
      severity: item.severity === "warn" ? "medium" : item.severity === "info" ? "low" : item.severity,
    }));
  },
  // Quality & Evaluations
  async getQualityMetrics() {
    const quality = await this.retrievalQuality(24);
    const accuracy = 1 - (quality.zero_hit_rate ?? 0);
    const recall = quality.citation_coverage_rate ?? 0;
    return {
      avg_accuracy: accuracy,
      avg_recall: recall,
      avg_f1: accuracy + recall > 0 ? (2 * accuracy * recall) / (accuracy + recall) : 0,
    };
  },
  listEvaluations() {
    return this.listEvalRuns(50, 0).then((runs) =>
      runs.map((run) => ({
        eval_id: run.run_id,
        name: run.name,
        query: "",
        expected_answer: "",
        kb_id: "",
        status: run.status,
        created_at: run.created_at,
        last_result: {
          accuracy: run.hit_at_k,
          recall: run.citation_coverage_rate,
          f1:
            run.hit_at_k + run.citation_coverage_rate > 0
              ? (2 * run.hit_at_k * run.citation_coverage_rate) / (run.hit_at_k + run.citation_coverage_rate)
              : 0,
        },
      })),
    );
  },
  createEvaluation(data: { name: string; query: string; expected_answer: string; kb_id: string }) {
    return this.createEvalRun({
      name: data.name,
      kb_ids: data.kb_id ? [data.kb_id] : [],
      top_k: 5,
      samples: [{ query: data.query, expected_terms: data.expected_answer ? [data.expected_answer] : [] }],
    }).then((run) => ({
      eval_id: run.run_id,
      name: run.name,
      query: data.query,
      expected_answer: data.expected_answer,
      kb_id: data.kb_id,
      status: run.status,
      created_at: run.created_at,
    }));
  },
  runEvaluation(evalId: string) {
    return this.getEvalRun(evalId).then((run) => ({
      eval_id: run.run_id,
      status: run.status,
      last_result: {
        accuracy: run.hit_at_k,
        recall: run.citation_coverage_rate,
        f1:
          run.hit_at_k + run.citation_coverage_rate > 0
            ? (2 * run.hit_at_k * run.citation_coverage_rate) / (run.hit_at_k + run.citation_coverage_rate)
            : 0,
      },
    }));
  },
  // Quotas
  listQuotas() {
    return this.listQuotaPolicies().then((items) =>
      items.map((item) => ({
        quota_id: item.id,
        metric_code: item.metric_code,
        scope_type: item.scope_type,
        scope_id: item.scope_id,
        limit_value: item.limit_value,
        current_usage: 0,
        window_type: item.window_minutes >= 43200 ? "monthly" : item.window_minutes >= 1440 ? "daily" : "total",
      })),
    );
  },
  createQuota(data: { metric_code: string; scope_type: string; scope_id: string; limit_value: number; window_type: string }) {
    const windowMap: Record<string, number> = { daily: 1440, monthly: 43200, total: 5256000 };
    return this.upsertQuotaPolicy({
      metric_code: data.metric_code,
      scope_type: data.scope_type,
      scope_id: data.scope_id,
      limit_value: data.limit_value,
      window_minutes: windowMap[data.window_type] ?? 1440,
      enabled: true,
    }).then((item) => ({
      quota_id: item.id,
      metric_code: item.metric_code,
      scope_type: item.scope_type,
      scope_id: item.scope_id,
      limit_value: item.limit_value,
      current_usage: 0,
      window_type: item.window_minutes >= 43200 ? "monthly" : item.window_minutes >= 1440 ? "daily" : "total",
    }));
  },
  updateQuota(id: string, data: { limit_value: number }) {
    return this.updateQuotaPolicy(id, {
      metric_code: "",
      scope_type: "",
      scope_id: "",
      limit_value: data.limit_value,
    }).then((updated) => ({
      quota_id: updated.policy_id,
      metric_code: updated.metric_code,
      scope_type: updated.scope_type,
      scope_id: updated.scope_id,
      limit_value: updated.limit_value,
      current_usage: 0,
      window_type: updated.window_seconds >= 2592000 ? "monthly" : updated.window_seconds >= 86400 ? "daily" : "total",
    }));
  },
  // Releases & Webhooks
  listReleases() {
    return this.listRollouts({ limit: 50 }).then((items) =>
      items.map((item) => ({
        ...item,
        strategy: String(item.strategy ?? "canary"),
        target_percentage: Number(item.progress ?? 0),
      })),
    );
  },
  createRelease(data: { version: string; description: string; strategy: string; target_percentage: number }) {
    return this.createRollout({
      version: data.version,
      description: data.description,
      strategy: data.strategy,
      canary_percent: data.target_percentage,
    }).then((item) => ({
      ...item,
      strategy: data.strategy,
      target_percentage: Number(item.progress ?? data.target_percentage),
    }));
  },
  rollbackRelease(releaseId: string) {
    return this.rollback(releaseId, "manual rollback").then((item) => ({
      ...item,
      strategy: String(item.strategy ?? "canary"),
      target_percentage: Number(item.progress ?? 0),
    }));
  },
  createWebhook(data: { name: string; url: string; events: string[] }) {
    return this.upsertWebhook({
      name: data.name,
      url: data.url,
      event_types: data.events,
      enabled: true,
    }).then((item) => ({
      ...item,
      events: item.event_types ?? data.events,
    }));
  },
  updateWebhook(id: string, data: { name?: string; url?: string; events?: string[] }) {
    return this.listWebhooks().then((webhooks) => {
      const existing = webhooks.find((item) => item.webhook_id === id);
      if (!existing) throw new Error("webhook not found");
      return this.upsertWebhook({
        name: data.name ?? existing.name,
        url: data.url ?? existing.url,
        event_types: data.events ?? existing.event_types ?? [],
        enabled: existing.enabled,
      }).then((updated) => ({
        ...updated,
        events: updated.event_types ?? data.events ?? [],
      }));
    });
  },
  deleteWebhook(webhookId: string) {
    return request<{ webhook_id: string; deleted: boolean }>("DELETE", `/api/ops/alerts/webhooks/${webhookId}`);
  },
};
