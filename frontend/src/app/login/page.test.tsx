import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import LoginPage from "./page";

const push = vi.fn();
const login = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ login }) }));

beforeEach(() => { push.mockReset(); login.mockReset(); });

describe("LoginPage", () => {
  it("signs in with the chosen remember-me setting and goes to the dashboard", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-9");
    await user.click(screen.getByLabelText(/keep me logged in/i)); // untick
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("ann@example.com", "correct-horse-9", false));
    expect(push).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the server's error and stays on the page", async () => {
    login.mockRejectedValue(new ApiError("Incorrect email or password.", 401));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "ann@example.com");
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(push).not.toHaveBeenCalled();
  });

  it("can reveal and hide the password", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(field).toHaveAttribute("type", "text");
  });
});
