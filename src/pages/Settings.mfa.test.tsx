import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import Settings from "@/pages/Settings";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/components/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      email: "tester@example.com",
      display_name: "Tester",
      avatar_initial: "T",
    },
  }),
}));

const getPreferencesMock = vi.fn(async () => ({
  theme: "light",
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  notifications: { email: true, browser: true, alerts: true },
  security: { password_reset_email: true, two_factor_enabled: false },
}));

vi.mock("@/lib/api", () => ({
  authApi: {
    mfaTotpStatus: vi.fn(async () => ({ enrolled: false, enabled: false, backup_codes_remaining: 0 })),
    mfaTotpSetup: vi.fn(),
    mfaTotpEnable: vi.fn(),
    mfaTotpDisable: vi.fn(),
  },
  usersApi: {
    getPreferences: (...args: unknown[]) => getPreferencesMock(...args),
    update: vi.fn(),
    upsertPreferences: vi.fn(),
  },
  setToken: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Settings MFA flow", () => {
  beforeEach(() => {
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    useQueryMock.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "user-preferences") return { data: undefined, isLoading: false };
      return { data: undefined, isLoading: false };
    });
  });

  it("requests mfa status query", () => {
    render(<Settings />);
    const hasMfaStatusQuery = useQueryMock.mock.calls.some((call) => call[0]?.queryKey?.[0] === "mfa-totp-status");
    expect(hasMfaStatusQuery).toBe(true);
  });
});
