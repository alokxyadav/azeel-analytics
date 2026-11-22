// Regenerates the product screenshots on the landing page from the real app with sample data.
//   npm run build && npm run screenshots
import chromium from "@sparticuz/chromium";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const APP = process.env.E2E_APP_URL || "http://localhost:3100";
const OUT = new URL("../public/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Deterministic sample data: 4 regions, 2 channels, some gaps and two duplicate rows
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const regions = ["West", "East", "South", "North"];
const lines = ["order_id,region,channel,order_total,units,discount,order_date"];
for (let i = 1; i <= 240; i++) {
  const total = rnd() < 0.05 ? "" : (50 + rnd() * 900).toFixed(2);
  const disc = rnd() < 0.1 ? "" : (rnd() * 0.3).toFixed(2);
  lines.push(`${1000 + i},${regions[Math.floor(rnd() * 4)]},${rnd() > 0.55 ? "Online" : "Retail"},${total},${1 + Math.floor(rnd() * 40)},${disc},2026-0${1 + (i % 9)}-${String(1 + (i % 27)).padStart(2, "0")}`);
}
lines.push(lines[5], lines[9]);
const csv = join(mkdtempSync(join(tmpdir(), "azeel-shots-")), "quarterly_sales.csv");
writeFileSync(csv, lines.join("\n"));

const browser = await puppeteer.launch({ args: [...chromium.args, "--no-sandbox"], executablePath: process.env.CHROME_PATH || (await chromium.executablePath()), headless: "shell" });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 760, deviceScaleFactor: 1 });

await page.goto(`${APP}/signup`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => !document.querySelector("button[type=submit]").disabled);
await page.type("#name", "Priya Nair");
await page.type("#email", "priya.nair@example.com");
await page.type("#password", "correct-horse-9");
await page.type("#confirm", "correct-horse-9");
await page.click("button[type=submit]");
await page.waitForFunction(() => location.pathname.startsWith("/dashboard"));

await page.goto(`${APP}/dashboard/upload`, { waitUntil: "networkidle0" });
await (await page.$("#file")).uploadFile(csv);
await page.waitForSelector("table");
await sleep(400);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Upload and analyze")).click());
await page.waitForSelector("[role=tablist]", { timeout: 30000 });
const fileUrl = page.url();

for (const theme of ["light", "dark"]) {
  await page.goto(fileUrl, { waitUntil: "networkidle0" });
  await page.evaluate((t) => { localStorage.setItem("azeel_theme", t); document.documentElement.classList.toggle("dark", t === "dark"); }, theme);
  await page.waitForSelector("[role=tablist]"); await sleep(1500); // let the upload toast fade
  await page.evaluate(() => document.querySelector('[role="status"]')?.remove());
  await page.screenshot({ path: `${OUT}/file-${theme}.webp`, type: "webp", quality: 85 });
  await page.evaluate(() => [...document.querySelectorAll("[role=tab]")].find((x) => x.textContent === "Charts").click());
  await page.waitForSelector(".recharts-wrapper"); await sleep(800);
  await page.screenshot({ path: `${OUT}/charts-${theme}.webp`, type: "webp", quality: 85 });
}
await browser.close();
console.log("Wrote", OUT);
