import chromium from "@sparticuz/chromium";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer, { type Browser, type ElementHandle, type Page } from "puppeteer-core";

export const APP = process.env.E2E_APP_URL || "http://localhost:3100";
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

export async function launch(): Promise<Browser> {
  return puppeteer.launch({
    args: [...chromium.args, "--no-sandbox"],
    executablePath: process.env.CHROME_PATH || (await chromium.executablePath()),
    headless: "shell",
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function open(page: Page, path: string) {
  await page.goto(APP + path, { waitUntil: "networkidle0" });
  // Submit buttons are disabled until the page has hydrated, so this waits for interactivity too.
  await page.waitForFunction(() => ![...document.querySelectorAll("button[type=submit]")].some((b) => (b as HTMLButtonElement).disabled), { timeout: 15_000 });
}

export async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    localStorage.setItem("azeel_theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

/** Accessibility violations (WCAG 2.1 A/AA + best practice) on the current page. */
export async function a11y(page: Page): Promise<string[]> {
  await sleep(500); // let colour transitions settle so contrast is measured on final colours
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.violations.map((v: any) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target.join(" ")}`);
  });
}

export async function signUp(page: Page, email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`) {
  await open(page, "/signup");
  await page.type("#name", "Priya Nair");
  await page.type("#email", email);
  await page.type("#password", "correct-horse-9");
  await page.type("#confirm", "correct-horse-9");
  await page.click("button[type=submit]");
  await waitForDashboard(page);
  return email;
}

/** 61 rows: 5 blank order_total, 6 blank discount (11 missing cells), 1 duplicate row, dates over 6 months. */
export function sampleCsv(): string {
  const regions = ["West", "East", "South", "North"];
  const lines = ["order_id,region,channel,order_total,units,discount,order_date"];
  for (let i = 1; i <= 60; i++) {
    const total = i % 12 === 0 ? "" : (50 + ((i * 37) % 400) + 0.25).toFixed(2);
    const discount = i % 10 === 0 ? "" : ((i % 7) / 20).toFixed(2);
    lines.push(`${1000 + i},${regions[i % 4]},${i % 3 ? "Online" : "Retail"},${total},${1 + ((i * 11) % 40)},${discount},2026-0${1 + (i % 6)}-${String((i % 27) + 1).padStart(2, "0")}`);
  }
  lines.push(lines[5]); // exact duplicate of an earlier row
  return lines.join("\n");
}

/** Reads the label/value pairs of the first <dl> that contains all the given labels. */
export async function metrics(page: Page, scope = "main"): Promise<Record<string, string>> {
  return page.evaluate((root) => {
    const out: Record<string, string> = {};
    (document.querySelector(root) ?? document).querySelectorAll("dl").forEach((dl) => dl.querySelectorAll("dt").forEach((dt) => { out[dt.textContent || ""] = dt.nextElementSibling?.textContent || ""; }));
    return out;
  }, scope);
}

export async function clickByText(page: Page, selector: string, text: string) {
  const ok = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim().includes(t));
    el?.click();
    return Boolean(el);
  }, selector, text);
  if (!ok) throw new Error(`No ${selector} containing "${text}"`);
}

export async function chooseFile(page: Page, selector: string, path: string) {
  const input = (await page.$(selector)) as ElementHandle<HTMLInputElement> | null;
  if (!input) throw new Error(`No file input matches ${selector}`);
  await input.uploadFile(path);
}

/** Client-side navigation does not fire a page load, so wait for the dashboard's own content instead. */
export async function waitForDashboard(page: Page) {
  await page.waitForFunction(() => location.pathname.startsWith("/dashboard"), { timeout: 20_000 });
  await page.waitForSelector("main#main h1", { timeout: 20_000 });
}

export async function waitForText(page: Page, text: string) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 20_000 }, text);
}
