import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  agentApi,
  chatApi,
  documentApi,
  feedbackApi,
  governanceApi,
  kbApi,
  opsApi,
  permissionsApi,
  tenantApi,
  usersApi,
  authApi,
} from "@/lib/api";

describe("api client base url", () => {
  const makeStorage = () => {
    const data: Record<string, string> = {};
    return {
      getItem: (key: string) => (key in data ? data[key] : null),
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
      removeItem: (key: string) => {
        delete data[key];
      },
      clear: () => {
        Object.keys(data).forEach((key) => delete data[key]);
      },
    };
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses same-origin /api path by default in development", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-1",
          data: { tenant_role: "owner", allowed_actions: [] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await permissionsApi.snapshot();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/permissions/me");
  });

  it("adapts chat conversations from wrapped payload object", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-chat-list",
          data: {
            conversations: [
              {
                conversation_id: "conv-1",
                title: "会话 A",
                created_at: "2026-03-08T00:00:00Z",
                updated_at: "2026-03-08T00:00:00Z",
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const list = await chatApi.listConversations();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]?.id).toBe("conv-1");
  });

  it("adapts chat conversation kb scope when backend returns object payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-chat-list-kb-scope",
          data: {
            conversations: [
              {
                conversation_id: "conv-2",
                title: "会话 B",
                kb_scope: {
                  kb_ids: ["kb-1", "kb-2"],
                },
                created_at: "2026-03-08T00:00:00Z",
                updated_at: "2026-03-08T00:00:00Z",
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const list = await chatApi.listConversations();
    expect(list[0]?.kb_ids).toEqual(["kb-1", "kb-2"]);
  });

  it("adapts chat conversation detail kb scope when backend returns object payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-chat-detail-kb-scope",
          data: {
            conversation_id: "conv-3",
            title: "会话 C",
            message_count: 2,
            kb_scope: {
              kb_ids: ["kb-9"],
            },
            created_at: "2026-03-08T00:00:00Z",
            updated_at: "2026-03-08T00:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const detail = await chatApi.getConversation("conv-3");
    expect(detail.kb_ids).toEqual(["kb-9"]);
  });

  it("adapts chat messages from wrapped payload object", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-chat-msg",
          data: {
            conversation_id: "conv-1",
            messages: [
              {
                message_id: "msg-1",
                role: "assistant",
                content: "你好",
                created_at: "2026-03-08T00:00:00Z",
              },
            ],
            total: 1,
            limit: 100,
            offset: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const list = await chatApi.listMessages("conv-1");
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]?.id).toBe("msg-1");
  });

  it("adapts feedback list from wrapped payload object", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-feedback",
          data: {
            feedbacks: [
              {
                feedback_id: "fb-1",
                feedback_type: "thumbs_up",
                processed: false,
                created_at: "2026-03-08T00:00:00Z",
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const list = await feedbackApi.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0]?.id).toBe("fb-1");
  });

  it("supports governance raw JSON response without data envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "dr-1",
          status: "pending",
          requested_at: "2026-03-08T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await governanceApi.createDeletionRequest("document", "doc-1", "reason");
    expect((res as { request_id?: string }).request_id).toBe("dr-1");
  });

  it("extracts message from FastAPI detail error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "deletion request not found",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    await expect(governanceApi.executeDeletion("req-404")).rejects.toMatchObject({
      status: 404,
      message: "deletion request not found",
    });
  });

  it("maps create ticket payload to backend schema", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-ticket",
          data: {
            ticket_id: "t-1",
            title: "异常",
            severity: "warn",
            status: "open",
            created_at: "2026-03-08T00:00:00Z",
            updated_at: "2026-03-08T00:00:00Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await opsApi.createTicket({ title: "异常", severity: "warn", description: "摘要内容" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"));

    expect(body.source_code).toBeTypeOf("string");
    expect(body.summary).toBe("摘要内容");
  });

  it("maps document chunks pagination params and response shape", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-chunks",
          data: {
            document_id: "doc-1",
            version: 3,
            document_version_id: "dv-1",
            total: 21,
            offset: 20,
            limit: 20,
            items: [
              {
                id: "chunk-21",
                document_id: "doc-1",
                document_version_id: "dv-1",
                chunk_no: 21,
                content: "content",
                token_count: 12,
                created_at: "2026-03-08T00:00:00Z",
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const page = await documentApi.listChunks("doc-1", 2, 20);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("offset=20");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("limit=20");
    expect(page.page).toBe(2);
    expect(page.items[0]?.chunk_id).toBe("chunk-21");
  });

  it("supports listing agent runs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          request_id: "req-agent-list",
          data: [{ run_id: "run-1", status: "queued" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const runs = await agentApi.list({ limit: 10 });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/agent/runs?limit=10");
    expect(runs[0]?.run_id).toBe("run-1");
  });

  it("supports listing governance deletion requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          requests: [{ request_id: "dr-1", status: "pending", requested_at: "2026-03-08T00:00:00Z" }],
          total: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const reqs = await governanceApi.listDeletionRequests({ limit: 20 });
    expect(reqs.length).toBe(1);
    expect(reqs[0]?.request_id).toBe("dr-1");
  });

  it("supports user preferences read/write", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-pref-get",
            data: {
              theme: "dark",
              language: "zh-CN",
              timezone: "Asia/Shanghai",
              notifications: { email: true, browser: true, alerts: true },
              security: { password_reset_email: true, two_factor_enabled: false },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-pref-put",
            data: {
              theme: "light",
              language: "en",
              timezone: "UTC",
              notifications: { email: false, browser: true, alerts: true },
              security: { password_reset_email: false, two_factor_enabled: true },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const pref = await usersApi.getPreferences("u-1");
    expect(pref.theme).toBe("dark");
    await usersApi.upsertPreferences("u-1", {
      theme: "light",
      language: "en",
      timezone: "UTC",
      notifications: { email: false, browser: true, alerts: true },
      security: { password_reset_email: false, two_factor_enabled: true },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/users/u-1/preferences");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/users/u-1/preferences");
  });

  it("supports kb members list/upsert/remove", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-kb-members-list",
            data: [
              { kb_id: "kb-1", user_id: "u-1", role: "owner", status: "active" },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-kb-member-upsert",
            data: { kb_id: "kb-1", user_id: "u-2", role: "editor", status: "active" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-kb-member-remove",
            data: { kb_id: "kb-1", user_id: "u-2", role: "editor", status: "disabled" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const members = await kbApi.listMembers("kb-1");
    expect(members[0]?.user_id).toBe("u-1");

    await kbApi.upsertMember("kb-1", "u-2", "editor");
    const upsertReq = fetchMock.mock.calls[1];
    expect(upsertReq?.[0]).toBe("/api/knowledge-bases/kb-1/members/u-2");
    expect(upsertReq?.[1]?.method).toBe("PUT");
    expect(JSON.parse(String(upsertReq?.[1]?.body ?? "{}"))).toEqual({ role: "editor" });

    await kbApi.removeMember("kb-1", "u-2");
    const removeReq = fetchMock.mock.calls[2];
    expect(removeReq?.[0]).toBe("/api/knowledge-bases/kb-1/members/u-2");
    expect(removeReq?.[1]?.method).toBe("DELETE");
  });

  it("supports permissions role matrix list and update", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-role-list",
            data: [
              { role: "owner", permission_codes: ["tenant.read", "workspace.member.manage"] },
              { role: "viewer", permission_codes: ["tenant.read"] },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-role-update",
            data: { role: "viewer", permission_codes: ["tenant.read", "chat.completion"] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const roles = await permissionsApi.listRoles();
    expect(roles.length).toBe(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/permissions/roles");

    await permissionsApi.updateRole("viewer", ["tenant.read", "chat.completion"]);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/permissions/roles/viewer");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PUT");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body ?? "{}"))).toEqual({
      permission_codes: ["tenant.read", "chat.completion"],
    });
  });

  it("supports tenant member management endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-tenant-members",
            data: [{ tenant_id: "t-1", user_id: "u-1", email: "a@example.com", role: "owner", status: "active" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-tenant-invite",
            data: { tenant_id: "t-1", user_id: "u-2", email: "b@example.com", role: "member", status: "invited" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-tenant-role",
            data: { tenant_id: "t-1", user_id: "u-2", email: "b@example.com", role: "admin", status: "active" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const members = await tenantApi.listMembers("t-1");
    expect(members.length).toBe(1);
    await tenantApi.inviteMember("t-1", "b@example.com", "member");
    await tenantApi.updateMemberRole("t-1", "u-2", "admin");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/tenants/t-1/members");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/tenants/t-1/invitations");
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/tenants/t-1/members/u-2/role");
  });

  it("supports governance retention cleanup and pii masking", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-retention",
            deleted_count: 0,
            dry_run: true,
            resource_type: "retrieval_logs",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-pii",
            original_length: 10,
            masked_text: "a***@example.com",
            masked_length: 14,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await governanceApi.retentionCleanup("retrieval_logs", true);
    const masked = await governanceApi.piiMask("a@example.com", ["email"]);
    expect(masked.masked_text).toContain("***");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/governance/retention/cleanup");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/api/governance/pii/mask");
  });

  it("supports mfa setup/enable/disable and login second-step", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-mfa-setup",
            data: { enrolled: true, enabled: false, secret: "ABCDEF123456", otpauth_uri: "otpauth://totp/test" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-mfa-enable",
            data: { enabled: true, backup_codes: ["ABCD-EFGH"] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-mfa-disable",
            data: { enabled: false },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "req-mfa-login",
            data: { access_token: "token-x", expires_at: "2026-03-08T00:00:00Z", expires_in: 3600, tenant_id: "t-1" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const setup = await authApi.mfaTotpSetup("StrongPassw0rd!");
    expect(setup.secret).toBe("ABCDEF123456");
    await authApi.mfaTotpEnable("123456");
    await authApi.mfaTotpDisable({ password: "StrongPassw0rd!", backup_code: "ABCD-EFGH" });
    const login = await authApi.loginMfa("challenge-token", { otp_code: "123456" });
    expect(login.access_token).toBe("token-x");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/mfa/totp/setup");
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/auth/login/mfa");
  });
});
