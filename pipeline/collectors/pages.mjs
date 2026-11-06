/* Page watchers. Event pages drift: dates move, prices change, registration opens.
   We hash the readable text, keep the last good hash, and flag a change for a human to read. */
import { get, report, stripHtml, hash, sleep } from "../lib/util.mjs";

const norm = html => stripHtml(html)
  .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s?(am|pm)?\b/gi, "")
  .replace(/\b(©|copyright)\s*\d{4}\b/gi, "")
  .replace(/\s+/g, " ");

async function check(url, prev, today) {
  try {
    const res = await get(url, { timeout: 18000, retries: 0, headers: { accept: "text/html,application/pdf;q=0.9,*/*;q=0.8" } });
    if (res.status === 403 || res.status === 429 || res.status === 503) return { status: "blocked", http: res.status, hash: prev?.hash || null, changedAt: prev?.changedAt || null };
    if (!res.ok) return { status: "error", http: res.status, hash: prev?.hash || null, changedAt: prev?.changedAt || null };
    const type = res.headers.get("content-type") || "";
    const body = type.includes("pdf") ? String(res.headers.get("content-length") || res.headers.get("etag") || "pdf") : norm(await res.text());
    const h = hash(body);
    const changed = !!(prev?.hash && prev.hash !== h);
    return { status: "ok", http: res.status, hash: h, changedAt: changed ? today : prev?.changedAt || null, changed };
  } catch (e) {
    return { status: "error", http: 0, hash: prev?.hash || null, changedAt: prev?.changedAt || null, note: e.name };
  }
}

export async function collectEvents(G, state, today) {
  const rep = report("events", "Event page watch", "page watch", "", "Daily");
  const pages = state.pages || {};
  const watch = [...G.events.map(e => ({ id: e.id, src: e.src })), ...G.awards.map(a => ({ id: a.id, src: a.src }))];
  const ids = [...new Set(watch.flatMap(w => w.src))];
  const results = {};
  const queue = [...ids];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const id = queue.shift();
      const url = G.sources[id]?.[1];
      if (!url) continue;
      results[id] = await check(url, pages[id], today);
      pages[id] = { hash: results[id].hash, changedAt: results[id].changedAt };
      await sleep(150);
    }
  }));
  state.pages = pages;

  const events = {};
  watch.forEach(w => {
    const r = w.src.map(s => results[s]).filter(Boolean);
    const okN = r.filter(x => x.status === "ok").length;
    const lastChange = r.map(x => x.changedAt).filter(Boolean).sort().pop() || null;
    events[w.id] = { pages: r.length, ok: okN, blocked: r.filter(x => x.status === "blocked").length, changedAt: lastChange, changedToday: r.some(x => x.changed) };
  });

  const all = Object.values(results);
  const ok = all.filter(x => x.status === "ok").length;
  const blocked = all.filter(x => x.status === "blocked").length;
  rep.items = ok;
  rep.status = ok === 0 ? "failed" : ok === all.length ? "ok" : "partial";
  rep.note = ok + " of " + all.length + " pages read" + (blocked ? ", " + blocked + " block automated readers" : "") + ", " + all.filter(x => x.changed).length + " changed today";
  return { rep, events };
}

/* The claims register is only useful if it is true today, so re-read the public figures on Origin's site.
   Only the text a visitor can read is checked. */
export async function collectOrigin(state, today) {
  const rep = report("origin", "Origin public claims", "page watch", "https://origin.tech/", "Daily");
  const claims = [
    ["Time saved 5x", /TIME SAVED[\s\S]{0,40}5X/i],
    ["Margin expansion 300%", /MARGIN EXPANSION[\s\S]{0,40}300%/i],
    ["Cost reduction 20%", /COST REDUCTION[\s\S]{0,40}20%/i],
    ["100k+ square feet", /100k\+/i],
    ["5,000 hours worked", /5,000/],
    ["Footer legal name", /Artila Robotics/i]
  ];
  try {
    const res = await get("https://origin.tech/", { timeout: 20000, retries: 1 });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = stripHtml(await res.text());
    const found = claims.map(c => ({ claim: c[0], live: c[1].test(text) }));
    const h = hash(found.map(f => f.claim + f.live).join("|"));
    const prev = state.originClaims;
    state.originClaims = { hash: h, changedAt: prev && prev.hash !== h ? today : prev?.changedAt || null };
    rep.status = "ok";
    rep.items = found.filter(f => f.live).length;
    rep.note = found.filter(f => f.live).length + " of " + found.length + " tracked claims still on the homepage";
    return { rep, claims: found, changedAt: state.originClaims.changedAt };
  } catch (e) {
    rep.status = "failed";
    rep.note = String(e.message || e).slice(0, 160);
    return { rep, claims: null, changedAt: null };
  }
}
