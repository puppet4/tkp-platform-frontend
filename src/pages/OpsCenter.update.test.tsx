import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import OpsCenter from "@/pages/OpsCenter";

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => ({
    roleName: "owner",
    canAction: () => true,
  }),
}));

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useQueryClientMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: (...args: unknown[]) => useQueryClientMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("OpsCenter update UX", () => {
  beforeEach(() => {
    useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn(async () => undefined),
    });

    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: undefined,
    });

    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      const key = queryKey[0];
      if (key === "ops-quota-policies") {
        return {
          data: [
            {
              id: "qp-1",
              metric_code: "retrieval.requests",
              scope_type: "workspace",
              scope_id: "ws-9",
              limit_value: 2048,
              window_minutes: 120,
              enabled: false,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          isLoading: false,
        };
      }
      if (key === "ops-quota-alerts") return { data: [], isLoading: false };
      if (key === "ops-webhooks") {
        return {
          data: [
            {
              webhook_id: "wh-1",
              name: "Slack 告警",
              url: "https://hooks.slack.com/services/T/B/C",
              event_types: ["alert.critical", "alert.warning"],
              enabled: false,
              created_at: "2026-01-01T00:00:00Z",
            },
          ],
          isLoading: false,
        };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it("supports editing quota policy from policy list", () => {
    render(<OpsCenter />);

    fireEvent.click(screen.getByRole("button", { name: "配额策略" }));

    expect(screen.getByText("retrieval.requests")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "编辑配额" }));

    expect(screen.getByDisplayValue("retrieval.requests")).toBeInTheDocument();
    expect(screen.getByDisplayValue("workspace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ws-9")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2048")).toBeInTheDocument();
    expect(screen.getByDisplayValue("120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新配额策略" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消编辑" })).toBeInTheDocument();
  });

  it("supports editing webhook from list", () => {
    render(<OpsCenter />);

    fireEvent.click(screen.getByRole("button", { name: "Webhook" }));

    expect(screen.getByText("Slack 告警")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "编辑 Webhook" }));

    expect(screen.getByDisplayValue("Slack 告警")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://hooks.slack.com/services/T/B/C")).toBeInTheDocument();
  });
});
