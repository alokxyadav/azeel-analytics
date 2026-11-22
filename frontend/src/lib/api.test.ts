import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, UNAUTHORIZED_EVENT } from "./api";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let unauthorized = 0;
const onUnauthorized = () => { unauthorized++; };

beforeEach(() => { unauthorized = 0; window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized); });
afterEach(() => { window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized); vi.restoreAllMocks(); });

describe("api client", () => {
  it("always sends the session cookie and JSON bodies", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, { id: "1" }));
    await api.auth.login("a@b.co", "pw", true);
    const [, init] = spy.mock.calls[0];
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual({ email: "a@b.co", password: "pw", remember: true });
  });

  it("turns the server's message into an ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(400, { detail: "An account with this email already exists." }));
    await expect(api.auth.signup("Ann", "a@b.co", "x")).rejects.toMatchObject({ message: "An account with this email already exists.", status: 400 });
  });

  it("falls back to the first validation message when detail is a list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(422, { detail: [{ msg: "field required" }] }));
    await expect(api.files.list()).rejects.toThrow("field required");
  });

  it("announces an expired session, but not a failed login attempt", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(401, { detail: "You need to log in to continue." }));
    await expect(api.files.list()).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toBe(1);
    await expect(api.auth.login("a@b.co", "wrong", true)).rejects.toBeInstanceOf(ApiError);
    await expect(api.auth.me()).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toBe(1);   // login and /me are "silent": no redirect loops
  });

  it("explains network failures and rate limits in plain language", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(api.files.list()).rejects.toThrow(/cannot reach the server/i);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json(429, { detail: "Too many attempts. Try again in 30 seconds." }));
    await expect(api.auth.login("a@b.co", "pw", true)).rejects.toThrow("Too many attempts. Try again in 30 seconds.");
  });

  it("returns undefined for 204 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.auth.logout()).resolves.toBeUndefined();
  });

  it("builds a preview query with search and sort", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, {}));
    await api.analytics.preview("f1", 2, 20, "south", "sales", "desc");
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain("/api/analytics/f1/preview?");
    expect(url).toContain("page=2");
    expect(url).toContain("search=south");
    expect(url).toContain("sort_by=sales");
    expect(url).toContain("sort_dir=desc");
  });
});
