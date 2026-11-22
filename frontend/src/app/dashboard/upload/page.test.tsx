import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadPage from "./page";

const push = vi.fn();
const upload = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: { files: { upload: (...a: unknown[]) => upload(...a) } } }));

beforeEach(() => { push.mockReset(); upload.mockReset(); });
const input = () => document.getElementById("file") as HTMLInputElement;
const setup = () => userEvent.setup({ applyAccept: false });

describe("UploadPage", () => {
  it("rejects unsupported file types before uploading", async () => {
    const user = setup();
    render(<UploadPage />);
    await user.upload(input(), new File(["MZ"], "setup.exe", { type: "application/octet-stream" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/not supported/i);
    expect(screen.queryByRole("button", { name: /upload and analyze/i })).not.toBeInTheDocument();
  });

  it("rejects legacy .xls files, which the server cannot read", async () => {
    const user = setup();
    render(<UploadPage />);
    await user.upload(input(), new File(["x"], "old.xls"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/\.csv or \.xlsx/i);
  });

  it("rejects files over 100 MB and empty files", async () => {
    const user = setup();
    render(<UploadPage />);
    const big = new File(["x"], "big.csv");
    Object.defineProperty(big, "size", { value: 101 * 1024 * 1024 });
    await user.upload(input(), big);
    expect(await screen.findByRole("alert")).toHaveTextContent(/limit is 100 MB/i);
    await user.upload(input(), new File([], "empty.csv"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/empty/i);
  });

  it("uploads a valid CSV and opens its analysis", async () => {
    upload.mockResolvedValue({ id: "abc" });
    const user = setup();
    render(<UploadPage />);
    await user.upload(input(), new File(["a,b\n1,2\n"], "data.csv", { type: "text/csv" }));
    await user.click(await screen.findByRole("button", { name: /upload and analyze/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/files/abc"));
  });
});
