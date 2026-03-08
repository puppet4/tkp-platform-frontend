import { afterEach, describe, expect, it, vi } from "vitest";

import { permissionsApi } from "@/lib/api";

describe("api client base url", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
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
});
