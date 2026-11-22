import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser, Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { a11y, APP, chooseFile, clickByText, launch, metrics, open, sampleCsv, setTheme, signUp, sleep, waitForDashboard, waitForText } from "./support";

let browser: Browser;
let page: Page;
const consoleProblems: string[] = [];
const csvPath = join(mkdtempSync(join(tmpdir(), "azeel-e2e-")), "quarterly_sales.csv");

beforeAll(async () => {
  writeFileSync(csvPath, sampleCsv());
  browser = await launch();
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") consoleProblems.push(m.text()); });
  page.on("pageerror", (e) => consoleProblems.push(`pageerror: ${String(e)}`));
});
afterAll(async () => { await browser?.close(); });

describe("public site", () => {
  it("renders the landing page with its stylesheet applied", async () => {
    await open(page, "/");
    expect(await page.title()).toMatch(/Azeel Analytics/);
    const h1 = await page.$eval("h1", (el) => el.textContent);
    expect(h1).toMatch(/spreadsheet/i);
    // Guards against a silently broken Tailwind build (an unstyled site still "loads").
    const style = await page.$eval("a[href='/signup'] button", (el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, radius: s.borderRadius }; });
    expect(style.bg).toBe("rgb(37, 99, 235)");
    expect(parseFloat(style.radius)).toBeGreaterThan(4);
    const font = await page.$eval("body", (el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain("geist");
  });

  it("does not request the session endpoint for anonymous visitors", async () => {
    const calls: string[] = [];
    const onReq = (r: { url(): string }) => { if (r.url().includes("/api/auth/me")) calls.push(r.url()); };
    page.on("request", onReq);
    await open(page, "/");
    page.off("request", onReq);
    expect(calls).toEqual([]);
  });

  it("has no horizontal overflow on a phone", async () => {
    const phone = await browser.newPage();
    await phone.setViewport({ width: 375, height: 800, isMobile: true });
    for (const path of ["/", "/login", "/signup", "/privacy"]) {
      await open(phone, path);
      const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
    await phone.close();
  });

  it("remembers dark mode across reloads without a flash of light theme", async () => {
    await open(page, "/");
    await page.click("button[aria-label='Switch to dark mode']");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await open(page, "/");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await setTheme(page, "light");
  });

  it("analyzes a CSV in the browser demo without uploading it", async () => {
    await open(page, "/");
    let uploaded = false;
    const onReq = (r: { url(): string; method(): string }) => { if (r.method() === "POST" && r.url().includes("/api/files")) uploaded = true; };
    page.on("request", onReq);
    await chooseFile(page, "#demo-file", csvPath);
    await page.waitForSelector("section#demo dl");
    page.off("request", onReq);
    const m = await metrics(page, "section#demo");
    expect(m["Rows"]).toBe("61");
    expect(m["Missing cells"]).toBe("11");
    expect(m["Duplicate rows"]).toBe("1");
    expect(uploaded).toBe(false);
  });

  it("submits the contact form through the API", async () => {
    await open(page, "/");
    await page.type("#cn", "Jo Bloggs");
    await page.type("#ce", "jo@example.com");
    await page.type("#cm", "Does the free plan include PDF reports?");
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/public/contact")),
      page.click("#contact form button[type=submit]"),
    ]);
    expect(resp.status()).toBe(201);
  });

  it("serves SEO and legal pages", async () => {
    for (const [path, needle] of [["/robots.txt", "Disallow: /dashboard"], ["/sitemap.xml", "<urlset"], ["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"]]) {
      const res = await fetch(APP + path);
      expect(res.status, path).toBe(200);
      expect(await res.text(), path).toContain(needle);
    }
    expect((await fetch(APP + "/no-such-page")).status).toBe(404);
  });
});

describe("account journey", () => {
  const email = `journey-${Date.now()}@example.com`;

  it("rejects bad sign-up input in the browser before calling the API", async () => {
    await open(page, "/signup");
    await page.type("#name", "A");
    await page.type("#email", "not-an-email");
    await page.type("#password", "short");
    await page.type("#confirm", "different");
    await page.click("button[type=submit]");
    await page.waitForSelector("p.text-xs");
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).toContain("Use at least 8 characters");
    expect(text).toContain("Passwords do not match");
    expect(page.url()).toContain("/signup");
  });

  it("signs up, lands on an empty dashboard, then uploads a file and sees its analysis", async () => {
    await signUp(page, email);
    expect(page.url()).toContain("/dashboard");
    await waitForText(page, "No files yet");

    await open(page, "/dashboard/upload");
    await chooseFile(page, "#file", csvPath);
    await page.waitForSelector("table");
    await clickByText(page, "button", "Upload and analyze");
    await page.waitForSelector("[role=tablist]", { timeout: 30_000 });
    expect(page.url()).toMatch(/\/dashboard\/files\/[\w-]+/);

    const m = await metrics(page);
    expect(m["Rows"]).toBe("61");
    expect(m["Columns"]).toBe("7");
    expect(m["Missing cells"]).toBe("11");
    expect(m["Duplicate rows"]).toBe("1");
  });

  it("searches and sorts across the whole file", async () => {
    await page.type("input[aria-label='Search rows']", "retail");
    await sleep(1200);
    const total = await page.evaluate(() => document.body.innerText.match(/(\d+) rows · page/)?.[1]);
    expect(Number(total)).toBeGreaterThan(0);
    expect(Number(total)).toBeLessThan(61);
    await page.$eval("input[aria-label='Search rows']", (el) => (el as HTMLInputElement).select());
    await page.keyboard.press("Backspace");
    await sleep(800);
  });

  it("shows plain-language statistics and meaningful charts", async () => {
    await clickByText(page, "[role=tab]", "Statistics");
    await sleep(400);
    const stats = await page.evaluate(() => document.body.innerText);
    expect(stats).toMatch(/decimal/);
    expect(stats).not.toMatch(/float64|int64/);
    expect(stats).toContain("order_total");

    await clickByText(page, "[role=tab]", "Charts");
    await page.waitForSelector(".recharts-wrapper", { timeout: 15_000 });
    await sleep(600);
    const titles = await page.$$eval("[role=tabpanel] h2", (els) => els.map((e) => e.textContent));
    expect(titles).toContain("Count by region");
    expect(titles).toContain("Total order_total by month");
    expect(titles.join()).not.toMatch(/by row/);
    // no chart may be drawn empty
    expect(await page.evaluate(() => document.body.innerText)).not.toContain("Not enough data");
    expect(await page.$$eval(".recharts-pie-sector", (e) => e.length)).toBeGreaterThan(0);
  });

  it("downloads CSV, Excel and PDF reports", async () => {
    await clickByText(page, "[role=tab]", "Reports");
    for (const [label, type] of [["CSV", "text/csv"], ["Excel", "spreadsheetml"], ["PDF summary", "application/pdf"]]) {
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/reports/")),
        clickByText(page, "[role=tabpanel] button", label),
      ]);
      expect(resp.status(), label).toBe(200);
      expect(resp.headers()["content-type"], label).toContain(type);
    }
  });

  it("lists the file, then signs out and is kept out of the dashboard", async () => {
    await open(page, "/dashboard");
    await waitForText(page, "quarterly_sales.csv");
    await clickByText(page, "nav button", "Log out");
    await page.waitForFunction(() => location.pathname === "/login", { timeout: 10_000 });
    await open(page, "/dashboard");
    await page.waitForFunction(() => location.pathname === "/login", { timeout: 10_000 });
  });

  it("logs back in, and an expired session sends the user to log in", async () => {
    await open(page, "/login");
    await page.type("#email", email);
    await page.type("#password", "correct-horse-9");
    await page.click("button[type=submit]");
    await waitForDashboard(page);
    // simulate expiry: the server-side cookie disappears while the page is open
    const client = await page.createCDPSession();
    await client.send("Network.clearBrowserCookies");
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForFunction(() => location.pathname === "/login", { timeout: 10_000 });
  });

  it("shows an error for a wrong password without revealing whether the account exists", async () => {
    await open(page, "/login");
    await page.type("#email", email);
    await page.type("#password", "totally-wrong-1");
    await page.click("button[type=submit]");
    await page.waitForSelector("[role=alert]");
    expect(await page.$eval("[role=alert]", (e) => e.textContent)).toBe("Incorrect email or password.");
  });

  it("produced no console errors or warnings during the whole journey", () => {
    // 401 responses from the deliberately-expired session are expected; anything else is a bug.
    const unexpected = consoleProblems.filter((m) => !/status of 401/.test(m));
    expect(unexpected).toEqual([]);
  });
});

describe("accessibility (WCAG 2.1 AA + best practices)", () => {
  const publicPages = ["/", "/login", "/signup", "/forgot-password", "/privacy", "/terms"];
  for (const theme of ["light", "dark"] as const) {
    it(`has no violations on public pages in ${theme} mode`, async () => {
      for (const path of publicPages) {
        await open(page, path);
        await setTheme(page, theme);
        expect(await a11y(page), `${theme} ${path}`).toEqual([]);
      }
    });
  }

  it("has no violations inside the dashboard in light and dark mode", async () => {
    await signUp(page);
    await open(page, "/dashboard/upload");
    await chooseFile(page, "#file", csvPath);
    await page.waitForSelector("table");
    await clickByText(page, "button", "Upload and analyze");
    await page.waitForSelector("[role=tablist]", { timeout: 30_000 });
    const filePage = page.url().replace(APP, "");
    for (const theme of ["light", "dark"] as const) {
      for (const path of ["/dashboard", "/dashboard/upload", "/dashboard/reports", "/dashboard/settings", "/dashboard/profile", filePage]) {
        await open(page, path);
        await setTheme(page, theme);
        expect(await a11y(page), `${theme} ${path}`).toEqual([]);
      }
    }
  });
});
