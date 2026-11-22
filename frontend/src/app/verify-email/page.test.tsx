import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import VerifyEmailPage from "./page";

const verifyEmail = vi.fn();
const refreshUser = vi.fn();
let token: string | null = "tok";
vi.mock("next/navigation", () => ({ useSearchParams: () => ({ get: () => token }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: null, refreshUser }) }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: { auth: { verifyEmail: (...a: unknown[]) => verifyEmail(...a) } } }));

beforeEach(() => { verifyEmail.mockReset(); refreshUser.mockReset(); token = "tok"; });

describe("VerifyEmailPage", () => {
  it("confirms the address using the token from the link", async () => {
    verifyEmail.mockResolvedValue(undefined);
    render(<VerifyEmailPage />);
    expect(await screen.findByText(/email address is confirmed/i)).toBeInTheDocument();
    expect(verifyEmail).toHaveBeenCalledWith("tok");
    expect(refreshUser).toHaveBeenCalled();
  });

  it("explains an expired or invalid link", async () => {
    verifyEmail.mockRejectedValue(new ApiError("This verification link is invalid or has expired.", 400));
    render(<VerifyEmailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid or has expired/i);
  });

  it("handles a link without a token without calling the API", async () => {
    token = null;
    render(<VerifyEmailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/missing its token/i);
    expect(verifyEmail).not.toHaveBeenCalled();
  });
});
