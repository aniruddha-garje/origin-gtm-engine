/* The daily run. Every collector is isolated: one source failing never stops the others,
   and a failed source keeps its last good data with an honest status on the site. */
import { loadResearch, readJson, writeJson, isoDay } from "./lib/util.mjs";
import { collectWages } from "./collectors/wages.mjs";
import { collectPermits } from "./collectors/permits.mjs";
import { collectNews } from "./collectors/news.mjs";
import { collectEvents, collectOrigin } from "./collectors/pages.mjs";
import { collectFederal } from "./collectors/federal.mjs";

const STATE = "data/state.json";
const LIVE = "site/data/live.json";
const SIGNAL_KINDS = new Set(["robot", "layout", "dc", "growth", "innov", "delay"]);

const G = loadResearch();
const today = isoDay();
const state = readJson(STATE, { seen: {}, pages: {}, history: [] });
const prev = readJson(LIVE, null);
const started = Date.now();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

log("run start", today);
const [wagesR, permitsR, newsR, eventsR, originR, fedR] = await Promise.all([
  collectWages(G).then(r => (log("wages:", r.rep.status, r.rep.note), r)),
  collectPermits().then(r => (r.reps.forEach(x => log(x.id + ":", x.status, x.note)), r)),
  collectNews(G).then(r => (log("news:", r.rep.status, r.rep.note), r)),
  collectEvents(G, state, today).then(r => (log("events:", r.rep.status, r.rep.note), r)),
  collectOrigin(state, today).then(r => (log("origin:", r.rep.status, r.rep.note), r)),
  collectFederal(G).then(r => (log("federal:", r.rep.status, r.rep.note), r))
]);

/* First-seen dates are what make "new today" honest across runs. */
function stamp(id) {
  if (!state.seen[id]) state.seen[id] = today;
  return state.seen[id];
}
const firstRun = !prev;
const newsFailed = newsR.rep.status === "failed";
const permitsAllFailed = permitsR.reps.every(r => r.status === "failed");

const signals = (newsFailed ? prev?.signals || [] : newsR.items.map(i => ({ ...i, firstSeen: stamp("n:" + i.id) }))).slice(0, 260);
const projects = permitsAllFailed ? prev?.projects || [] : permitsR.projects.map(p => ({ ...p, firstSeen: stamp("p:" + p.id) }));

/* Only a headline that names the company becomes an account signal. */
const accountSignals = {};
signals.forEach(s => {
  if (!SIGNAL_KINDS.has(s.kind)) return;
  s.entities.filter(e => !e.startsWith("gc")).forEach(id => {
    (accountSignals[id] = accountSignals[id] || []).push({ k: s.kind, title: s.title, url: s.url, source: s.source, date: s.date, firstSeen: s.firstSeen });
  });
});
/* A named federal subaward is a structured record, so it counts as a signal directly. */
const money = n => "$" + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M" : Math.round(n / 1e3) + "K");
const fedMatches = fedR.rep.status === "failed" ? prev?.federal?.matches || {} : fedR.matches;
const discovered = (fedR.rep.status === "failed" ? prev?.federal?.discovered || [] : fedR.discovered).map(d => ({ ...d, firstSeen: stamp("d:" + d.name) }));
Object.entries(fedMatches).forEach(([id, hits]) => hits.forEach(h => {
  (accountSignals[id] = accountSignals[id] || []).push({
    k: "fed", title: money(h.amount) + " federal subaward from " + h.prime + (h.desc ? ": " + h.desc.toLowerCase() : ""),
    url: h.url, source: "USAspending.gov", date: h.date, firstSeen: stamp("f:" + id + h.date + h.amount), agency: h.agency, amount: h.amount
  });
}));
Object.values(accountSignals).forEach(list => list.sort((a, b) => b.date.localeCompare(a.date)));

const isNew = x => x.firstSeen === today && !firstRun;
const sources = [wagesR.rep, ...permitsR.reps, fedR.rep, newsR.rep, eventsR.rep, originR.rep];

const counts = {
  sources: sources.length,
  sourcesOk: sources.filter(s => s.status === "ok" || s.status === "partial").length,
  signals: signals.length,
  newSignals: signals.filter(isNew).length,
  projects: projects.length,
  newProjects: projects.filter(isNew).length,
  projectValue: projects.reduce((s, p) => s + (p.cost || 0), 0),
  delays: signals.filter(s => s.kind === "delay").length,
  dataCenters: projects.filter(p => p.kind === "dc").length,
  accountsWithLive: Object.keys(accountSignals).length,
  discovered: discovered.length,
  newDiscovered: discovered.filter(isNew).length
};

state.history = [...(state.history || []).filter(h => h.date !== today), { date: today, ...counts }].slice(-120);

const live = {
  generatedAt: new Date().toISOString(),
  runDay: today,
  durationSec: Math.round((Date.now() - started) / 1000),
  firstRun,
  counts,
  sources,
  wages: wagesR.wages,
  signals,
  accountSignals,
  projects,
  federal: { matches: fedMatches, discovered },
  events: eventsR.events,
  claims: originR.claims,
  claimsChangedAt: originR.changedAt,
  history: state.history
};

writeJson(LIVE, live, false);
writeJson(STATE, state);
log("run done in", live.durationSec + "s", JSON.stringify(counts));

const ok = sources.filter(s => s.status === "failed").length;
if (ok === sources.length) { console.error("every source failed"); process.exit(1); }
