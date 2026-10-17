import chromium from "@sparticuz/chromium"; import puppeteer from "puppeteer-core"; import fs from "node:fs";
export const BASE = process.env.BASE_URL ?? "http://localhost:3111"; export const results = [];
export const check = (name, ok, info = "") => { results.push({ name, ok, info }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  | " + info : ""}`); return ok; };
export async function launch() { return puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? await chromium.executablePath(), args: [...chromium.args.filter((a) => a !== "--single-process"), "--no-sandbox"], headless: "shell" }); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function go(page, path) { const r = await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 30000 }); return r; }
export async function clickText(page, sel, text) { const hs = await page.$$(sel); for (const h of hs) { const t = await h.evaluate((e) => e.textContent.trim()); if (t === text || t.startsWith(text)) { await h.click(); return true; } } return false; }
export const axeSrc = fs.readFileSync(new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
fs.mkdirSync("./shots", { recursive: true });
