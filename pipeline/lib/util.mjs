/* Shared helpers for the daily run. No dependencies: Node 20+ fetch only. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const hash = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
export const isoDay = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
export const daysAgo = n => isoDay(Date.now() - n * 86400000);

export async function get(url, opts = {}) {
  const { timeout = 25000, retries = 1, headers = {}, method = "GET", body } = opts;
  let last;
  for (let i = 0; i <= retries; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, { method, body, signal: ctl.signal, redirect: "follow", headers: { "user-agent": UA, ...headers } });
      clearTimeout(t);
      if (res.status >= 500 && i < retries) { await sleep(1500 * (i + 1)); continue; }
      return res;
    } catch (e) {
      clearTimeout(t);
      last = e;
      if (i < retries) await sleep(1500 * (i + 1));
    }
  }
  throw last;
}

export async function getJson(url, opts) {
  const res = await get(url, opts);
  if (!res.ok) throw new Error("HTTP " + res.status + " from " + new URL(url).host);
  return res.json();
}

export function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); } catch { return fallback; }
}
export function writeJson(rel, value, pretty = true) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 1 : 0) + "\n");
}

/* The research file is the artifact's data.js, unchanged. Load it the way a browser would. */
export function loadResearch() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "site/data/research.js"), "utf8"), ctx);
  return ctx.window.GTM;
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };
export const decode = s => String(s || "")
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z0-9#]+);/gi, (m, k) => (ENT[k.toLowerCase()] !== undefined ? ENT[k.toLowerCase()] : m));

export const stripHtml = s => decode(String(s || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

export const titleCase = s => String(s || "").toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(Llc|Inc|Lp|Jv|Nyc|Usa|Mep)\b/g, m => m.toUpperCase());

/* Every collector reports the same shape so the site can show honest source health. */
export function report(id, name, kind, url, cadence) {
  return { id, name, kind, url, cadence, status: "pending", items: 0, note: "", checkedAt: new Date().toISOString() };
}
