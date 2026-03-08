import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import Governance from "@/pages/Governance";

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    uiManifest: null,
    refreshPermissions: vi.fn(async () => undefined),
  }),
}));

const useRoleAccessMock = vi.fn(() => ({
  roleName: "viewer",
  canAction: () => false,
  canFeature: () => false,
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => useRoleAccessMock(),
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

describe("Governance page access control", () => {
  beforeEach(() => {
    useRoleAccessMock.mockReturnValue({
      roleName: "viewer",
      canAction: () => false,
      canFeature: () => false,
    });

    useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn(async () => undefined),
    });

    useMutationMock.mockImplementation(() => ({
      mutate: vi.fn(),
      isPending: false,
    }));

    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      const key = queryKey[0];
      if (key === "permission-catalog") return { data: ["api.workspace.read"], isLoading: false };
      if (key === "permission-roles") return { data: [], isLoading: false };
      if (key === "permission-ui-manifest-runtime") {
        return {
          data: {
            tenant_role: "viewer",
            version: "test",
            allowed_actions: [],
            menus: [],
            buttons: [],
            features: [],
          },
          refetch: vi.fn(async () => undefined),
        };
      }
      if (key === "governance-deletion-requests") return { data: [], isLoading: false };
      if (key === "governance-deletion-proofs") return { data: [], isLoading: false };
      return { data: undefined, isLoading: false };
    });
  });

  it("hides permission-center tab when role lacks permission feature", () => {
    render(<Governance />);
    expect(screen.queryByText("权限中心")).not.toBeInTheDocument();
    expect(screen.getByText("删除治理")).toBeInTheDocument();
  });
});
