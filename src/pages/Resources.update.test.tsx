import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Resources from "@/pages/Resources";

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/hooks/useRoleAccess", () => ({
  useRoleAccess: () => ({
    canAction: () => true,
  }),
}));

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

const workspaceGetMock = vi.fn();
const kbGetMock = vi.fn();

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ApiError";
    }
  },
  workspaceApi: {
    get: (...args: unknown[]) => workspaceGetMock(...args),
  },
  kbApi: {
    get: (...args: unknown[]) => kbGetMock(...args),
  },
  usersApi: {
    list: vi.fn(async () => []),
  },
  documentApi: {
    getIngestionJob: vi.fn(),
    retryIngestionJob: vi.fn(),
    deadLetterIngestionJob: vi.fn(),
  },
}));

vi.mock("@/hooks/useResources", () => ({
  useWorkspaces: () => ({
    data: [
      {
        id: "ws-1",
        name: "空间A",
        slug: "space-a",
        description: "workspace-desc",
        status: "active",
      },
    ],
    isLoading: false,
  }),
  useCreateWorkspace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteWorkspace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateWorkspace: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWorkspaceMembers: () => ({ data: [] }),
  useUpsertWorkspaceMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveWorkspaceMember: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useKnowledgeBases: () => ({
    data: [
      {
        id: "kb-1",
        name: "知识库A",
        description: "kb-desc",
        status: "active",
        embedding_model: "text-embedding-3-large",
      },
    ],
    isLoading: false,
  }),
  useKbStats: () => ({ data: undefined }),
  useCreateKb: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteKb: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateKb: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useKbMembers: () => ({ data: [] }),
  useUpsertKbMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveKbMember: () => ({ mutateAsync: vi.fn(), isPending: false }),

  useDocuments: () => ({ data: [], isLoading: false }),
  useUploadDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReindexDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateDocument: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDocumentVersions: () => ({ data: [], isLoading: false }),
  useDocumentChunks: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}));

describe("Resources update entry", () => {
  beforeEach(() => {
    toastMock.mockReset();
    workspaceGetMock.mockReset();
    kbGetMock.mockReset();

    workspaceGetMock.mockRejectedValue(new Error("workspace detail failed"));
    kbGetMock.mockRejectedValue(new Error("kb detail failed"));

    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });

    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "tenant-users") return { data: [], isLoading: false };
      if (queryKey[0] === "ingestion-job") {
        return {
          data: undefined,
          isLoading: false,
          isFetching: false,
          refetch: vi.fn(async () => undefined),
        };
      }
      return { data: undefined, isLoading: false };
    });
  });

  it("opens workspace edit dialog with fallback data when detail query fails", async () => {
    render(<Resources />);

    fireEvent.click(screen.getByText("空间A"));
    fireEvent.click(screen.getByRole("button", { name: "编辑工作空间" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("空间A")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("space-a")).toBeInTheDocument();
    expect(workspaceGetMock).toHaveBeenCalledWith("ws-1");
  });

  it("opens kb edit dialog with fallback data when detail query fails", async () => {
    render(<Resources />);

    fireEvent.click(screen.getByText("空间A"));
    fireEvent.click(screen.getByText("知识库A"));
    fireEvent.click(screen.getByRole("button", { name: "编辑知识库" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("知识库A")).toBeInTheDocument();
    });
    expect(kbGetMock).toHaveBeenCalledWith("kb-1");
  });
});
