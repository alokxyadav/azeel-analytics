import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "./page";

const push = vi.fn();
const signup = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ signup }) }));

beforeEach(() => { push.mockReset(); signup.mockReset(); });

async function fill(user: ReturnType<typeof userEvent.setup>, o: { name?: string; email?: string; pw?: string; confirm?: string }) {
  await user.type(screen.getByLabelText("Full name"), o.name ?? "Ann Lee");
  await user.type(screen.getByLabelText("Email"), o.email ?? "ann@example.com");
  await user.type(screen.getByLabelText("Password"), o.pw ?? "correct-horse-9");
  await user.type(screen.getByLabelText("Confirm password"), o.confirm ?? o.pw ?? "correct-horse-9");
  await user.click(screen.getByRole("button", { name: /create account/i }));
}

describe("SignupPage", () => {
  it("rejects a short password and a mismatched confirmation without calling the API", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);
    await fill(user, { pw: "short", confirm: "different" });
    expect(await screen.findByText("Use at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(signup).not.toHaveBeenCalled();
  });

  it("creates the account and continues to the dashboard", async () => {
    signup.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignupPage />);
    await fill(user, {});
    await waitFor(() => expect(signup).toHaveBeenCalledWith("Ann Lee", "ann@example.com", "correct-horse-9"));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
