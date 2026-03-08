import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import Chat from "@/pages/Chat";

Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe("Chat new conversation flow", () => {
  beforeEach(() => {
    const conversations = [
      {
        id: "conv-1",
        title: "历史会话",
        message_count: 3,
        created_at: "2026-03-08T00:00:00Z",
        updated_at: "2026-03-08T00:00:00Z",
      },
    ];
    const kbs = [
      {
        id: "kb-1",
        name: "知识库一",
        description: "desc",
        status: "active",
        embedding_model: "text-embedding-3-small",
      },
    ];
    const messageList: Array<{
      id: string;
      role: "user" | "assistant" | "system";
      content: string;
      created_at: string;
    }> = [];

    useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn(async () => undefined),
    });

    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      const key = queryKey[0];
      if (key === "conversations") {
        return {
          data: conversations,
          isLoading: false,
        };
      }
      if (key === "all-knowledge-bases") {
        return {
          data: kbs,
          isLoading: false,
        };
      }
      if (key === "conv-detail") return { data: undefined, isLoading: false, refetch: vi.fn(async () => undefined) };
      if (key === "conv-messages") return { data: messageList, isLoading: false };
      return { data: undefined, isLoading: false };
    });
  });

  it("keeps draft state after creating a new conversation", async () => {
    render(<Chat />);

    expect(screen.getByRole("heading", { name: "历史会话" })).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("新建对话"));
    fireEvent.click(screen.getByText("知识库一"));
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(screen.getByText("新对话")).toBeInTheDocument();
    });
  });
});
