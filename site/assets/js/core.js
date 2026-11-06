/* The engine's logic. Scoring, the ROI model and the event cost model are carried over from the
   original work unchanged; only the data they read can now be refreshed by the daily run. */
import { store, usd2, pd, nf2fmt, money } from "./ui.js";

export const G = window.GTM;
export const R = window.REASON;

/* Two detected signals join the original twelve. The lock signal stays last in the list. */
const lockAt = G.signals.findIndex(x => x.k === "lock");
G.signals.splice(lockAt, 0, ...R.addSignals);

export const STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", ON: "Ontario" };
export const WAGE = {};
export const SIG = {};
G.signals.forEach(x => { SIG[x.k] = x; });
export const PLAY = {};
G.plays.forEach(p => { PLAY[p.id] = p; });
export const TIER = {};
G.icp.tiers.forEach(t => { TIER[t.id] = t; });
export const TIER_SHORT = { t1: "Tier 1", vet: "Veterans", t2: "Tier 2", t3: "Tier 3", paint: "Painting", nurture: "Nurture", excl: "Excluded" };
export const OUTBOUND_TIERS = ["t1", "vet", "t2", "t3"];
export const TIER_ORDER = ["t1", "vet", "t2", "t3", "paint", "nurture", "excl"];
export const SEG = { wc: "Wall and ceiling", paint: "Painting", gc: "General contractor" };
export const CORRIDOR = new Set(["MA", "NH", "RI", "CT", "NJ", "PA", "DE", "MD", "DC", "VA", "ME", "VT"]);
export const STATUS = ["Not started", "Researching", "Contacted", "Meeting set", "Site walk done", "Pilot", "Nurture", "Disqualified"];
export const PRESETS = {
  balanced: { n: "Balanced", w: { size: 1, labor: 1, prox: 1, scope: 1, sig: 1 } },
  beachhead: { n: "NYC beachhead", w: { size: 1, labor: 1, prox: 3, scope: 1, sig: 1 } },
  robot: { n: "Robot ready", w: { size: 1, labor: 0.5, prox: 0.5, scope: 1, sig: 2 } },
  labor: { n: "Labor cost", w: { size: 1, labor: 2.5, prox: 0.5, scope: 1, sig: 1 } }
};

/* ---------- state ---------- */
function mergeCosts(saved) {
  const base = JSON.parse(JSON.stringify(G.costs));
  if (saved) Object.keys(saved).forEach(k => {
    if (k === "travel") Object.assign(base.travel, saved.travel);
    else if (typeof saved[k] === "number") base[k] = saved[k];
  });
  return base;
}
export const S = {
  weights: store.get("weights", PRESETS.balanced.w),
  sigOv: store.get("sigov", {}),
  status: store.get("status", {}),
  roi: Object.assign({}, G.roi.defaults, store.get("roi", {})),
  costs: mergeCosts(store.get("costs", null)),
  ev: store.get("ev", {}),
  merge: Object.assign({ first: "", sender: "" }, store.get("merge", {})),
  contacts: store.get("contacts", {}),
  selected: new Set(),
  live: null,
  liveFrom: "none"
};
export function applyPreset(id, silent) {
  const p = G.roi.presets.find(x => x.id === id) || G.roi.presets[1];
  S.roi.preset = p.id; S.roi.wage = p.wage; S.roi.burden = p.burden;
  if (!silent) store.set("roi", S.roi);
}
if (S.roi.wage === undefined) applyPreset(S.roi.preset, true);

/* ---------- live data ---------- */
function indexWages() {
  G.wages.forEach(w => { WAGE[w[0]] = w[2]; });
}
indexWages();

export function applyLive(L) {
  S.live = L;
  if (L && L.wages && L.wages.states) {
    G.wages.forEach(w => { const x = L.wages.states[w[0]]; if (x) w[2] = x.wage; });
    if (L.wages.national) G.wageNational = L.wages.national;
    indexWages();
  }
}
export const liveAcct = id => (S.live && S.live.accountSignals && S.live.accountSignals[id]) || [];
const LIVE_KEY = { robot: "robot", layout: "layout", dc: "dc", growth: "growth", innov: "innov", delay: "delay", fed: "fed" };

/* ---------- scoring (original logic) ---------- */
export function activeSig(a) {
  const set = new Set(a.sig);
  liveAcct(a.id).forEach(x => { if (LIVE_KEY[x.k]) set.add(LIVE_KEY[x.k]); });
  const ov = S.sigOv[a.id];
  if (ov) Object.keys(ov).forEach(k => { if (ov[k]) set.add(k); else set.delete(k); });
  return set;
}
export function sizePts(a) {
  const r = a.rev;
  if (r === null || r === undefined) return 5;
  if (r >= 1000) return 15; if (r >= 300) return 13; if (r >= 150) return 11; if (r >= 100) return 10; if (r >= 50) return 8; if (r >= 30) return 6; return 5;
}
export function laborPts(a) {
  if (a.nyc) return 15;
  const w = WAGE[a.st];
  if (w === undefined) return 6;
  if (w >= 45) return 14; if (w >= 37) return 12; if (w >= 33) return 10; if (w >= 28) return 8; if (w >= 24) return 6; return 4;
}
export function laborNote(a) {
  if (a.nyc) return "NYC metro union market; NYC federal taper rate is $84.38 with fringe";
  const w = WAGE[a.st];
  return w === undefined ? "No BLS state estimate; scored as average" : STATES[a.st] + " median taper wage " + usd2(w);
}
export function proxPts(a, sig) { if (a.nyc) return 10; if (CORRIDOR.has(a.st)) return 7; if (sig.has("national")) return 5; return 3; }
export function proxNote(a, sig) { if (a.nyc) return "NYC metro, inside the deployment team's daily reach"; if (CORRIDOR.has(a.st)) return "Boston to Washington corridor"; if (sig.has("national")) return "Multi-region footprint"; return "Outside the Northeast"; }
export function scopePts(a) { return a.seg === "wc" ? 10 : 8; }
export function score(a, weights) {
  const sig = activeSig(a);
  let pos = 0, neg = 0;
  sig.forEach(k => { const x = SIG[k]; if (!x) return; if (x.w > 0) pos += x.w; else neg += x.w; });
  const c = { size: sizePts(a), labor: laborPts(a), prox: proxPts(a, sig), scope: scopePts(a), sig: Math.min(50, pos), neg: neg };
  const W = weights || S.weights;
  const max = 15 * W.size + 15 * W.labor + 10 * W.prox + 10 * W.scope + 50 * W.sig;
  const raw = c.size * W.size + c.labor * W.labor + c.prox * W.prox + c.scope * W.scope + (c.sig + c.neg) * W.sig;
  return { total: max > 0 ? Math.max(0, Math.round(100 * raw / max)) : 0, c: c, sig: sig };
}
export function playFor(a) { const t = TIER[a.tier]; return t && t.play ? t.play : null; }

/* ---------- ROI model (original logic) ---------- */
export function roiCalc(r) {
  const robotArea = r.area * r.share / 100;
  const manualDays = robotArea / r.prod;
  const manualHours = manualDays * 8;
  const loaded = r.wage * (1 + r.burden / 100);
  const manualCost = manualHours * loaded;
  const perRobot = r.prod * r.speed * r.days;
  const robots = perRobot > 0 ? Math.max(1, Math.ceil(robotArea / perRobot)) : 0;
  const operators = Math.max(1, Math.ceil(robots / Math.max(1, r.ratio)));
  const opHours = operators * r.days * 8;
  const rental = robots * r.price;
  const robotCost = rental + opHours * loaded;
  const denom = manualHours - opHours;
  const be = denom > 0 ? rental / denom : Infinity;
  return {
    robotArea, manualDays, manualHours, loaded, manualCost, robots, operators, opHours, rental, robotCost,
    net: manualCost - robotCost, freed: manualDays - operators * r.days,
    util: robots ? robotArea / (robots * perRobot) : 0, be: be, beWage: be / 1.35
  };
}
export const roiNow = () => roiCalc(S.roi);

/* ---------- events model (original logic) ---------- */
export function evState(e) {
  const o = S.ev[e.id] || {};
  return { mode: o.mode || e.mode, people: o.people !== undefined ? o.people : e.people };
}
export function evCost(e) {
  const st = evState(e), C = S.costs, p = Math.max(0, st.people || 0);
  const travel = (C.travel[e.travel] || 0) * p;
  let lines = [];
  let note = null;
  if (st.mode === "exhibit_robot") {
    lines = [["Booth", e.booth || 0], ["Booth build", C.build], ["Show services", C.services], ["Robot freight", e.reg === "us" ? C.freightUS : C.freightIntl], ["Drayage and handling", C.drayage], ["Collateral", C.collateral], ["Travel, " + p + (p === 1 ? " person" : " people"), travel]];
    if (!e.booth) note = "No booth rate found; booth not included";
  } else if (st.mode === "exhibit_light") {
    lines = [["Booth", e.booth || 0], ["Light booth build", C.lightBuild], ["Show services", C.lightServices], ["Collateral", C.collateral], ["Travel, " + p + (p === 1 ? " person" : " people"), travel]];
    if (!e.booth) note = "No booth rate found; booth not included";
  } else if (st.mode === "walk" || st.mode === "speak" || st.mode === "paper") {
    lines = [["Passes", (e.pass || 0) * p], ["Travel, " + p + (p === 1 ? " person" : " people"), travel]];
    if (!e.pass && st.mode === "walk" && !/free/i.test(e.cost)) note = "Pass price not found; not included";
  }
  const total = lines.reduce((t, l) => t + l[1], 0);
  return { lines, total, note, mode: st.mode, people: p };
}
export function quarter(iso) { const d = pd(iso); return "Q" + (Math.floor(d.getMonth() / 3) + 1) + " " + d.getFullYear(); }
export function evTotals() {
  const out = { committed: 0, cond: 0, q: {}, n: 0 };
  G.events.forEach(e => {
    const c = evCost(e);
    if (!c.total) return;
    const q = e.start ? quarter(e.start) : "TBD";
    out.q[q] = out.q[q] || { c: 0, k: 0 };
    if (e.cond) { out.cond += c.total; out.q[q].k += c.total; } else { out.committed += c.total; out.q[q].c += c.total; out.n++; }
  });
  return out;
}
export function allDeadlines() {
  const out = [];
  G.events.forEach(e => (e.dl || []).forEach(d => out.push({ date: d[0], what: d[1], link: "events" })));
  G.awards.forEach(a => { if (a.deadline && a.mode !== "skip") out.push({ date: a.deadline, what: a.n + (a.deadlineNote ? " (" + a.deadlineNote.toLowerCase() + ")" : " closes"), link: "events" }); });
  out.sort((a, b) => (a.date ? pd(a.date) : 0) - (b.date ? pd(b.date) : 0));
  return out;
}

/* ---------- reasons: why is this name on the list? ---------- */
const metroOf = st => ({ NY: "New York", IL: "Chicago", WA: "Seattle", TX: "Texas" }[st] || null);

export function marketJobs(st) {
  const L = S.live;
  if (!L || !L.projects) return null;
  const jobs = L.projects.filter(p => p.st === st);
  if (!jobs.length) return null;
  return { n: jobs.length, value: jobs.reduce((t, p) => t + (p.cost || 0), 0), where: metroOf(st) || STATES[st], top: jobs[0] };
}
export function marketDelays(st) {
  const L = S.live;
  if (!L || !L.signals) return [];
  return L.signals.filter(x => x.kind === "delay" && x.st === st);
}

export function reasonsFor(a, sc) {
  sc = sc || score(a);
  const sig = sc.sig, out = [];
  const ev = k => { const e = a.ev.find(x => x[0] === k); return e ? e[1] : null; };
  const live = liveAcct(a.id);
  const add = (k, detail, extra) => out.push(Object.assign({ k, label: R.reasons[k].label, icon: R.reasons[k].icon, detail }, extra || {}));

  const direct = live.find(x => x.k === "delay");
  if (direct) add("lag", direct.title, { live: true, url: direct.url });
  if (sig.has("robot") || sig.has("layout") || sig.has("lock")) add("robot", ev("robot") || ev("layout") || "Has run a jobsite robot");
  const fed = live.find(x => x.k === "fed");
  if (fed) add("fed", fed.title, { live: true, url: fed.url });
  if (sig.has("dc")) add("dc", ev("dc") || "Data center scope on record");

  const w = WAGE[a.st];
  if (a.nyc) add("wage", "NYC federal taper rate is $84.38 with fringe");
  else if (w !== undefined && w >= G.wageNational) add("wage", STATES[a.st] + " tapers earn " + usd2(w) + ", " + Math.round((w / G.wageNational - 1) * 100) + "% above the US median");

  if (a.nyc) add("near", "Inside the deployment team's daily reach");
  else if (CORRIDOR.has(a.st)) add("near", "Boston to Washington corridor", { label: "NE corridor" });

  if (sig.has("crew")) add("crew", ev("crew") || "Large in-house finishing crews");
  if (sig.has("growth")) add("grow", ev("growth") || "Fast growth or a new region");
  if (sig.has("union")) add("union", ev("union") || "Union signatory");
  if (sig.has("prefab")) add("lean", ev("prefab") || "Prefab or lean program");
  if (sig.has("innov")) add("tech", ev("innov") || "Innovation or VDC function");
  if (!out.length || (out.length === 1 && out[0].k === "near")) {
    if (a.list === "wc50") add("scale", "W&C Top 50 #" + a.rk + ", " + "$" + a.rev + "M working revenue");
    else if (a.list) add("scale", "Ranked on Siteline, $" + a.rev + "M");
  }

  /* The tier's own reason leads. */
  const lead = { t1: ["fed", "lag", "near", "wage"], vet: ["robot"], t2: ["fed", "lag", "wage"], t3: ["fed", "lag", "dc", "crew", "scale"], paint: ["dc", "wage"], nurture: ["robot"], excl: [] }[a.tier] || [];
  out.sort((x, y) => {
    const i = lead.indexOf(x.k), j = lead.indexOf(y.k);
    return (i === -1 ? 99 : i) - (j === -1 ? 99 : j);
  });
  return out;
}

export function whySentence(a) {
  if (a.ang) return a.ang;
  const w = WAGE[a.st], st = STATES[a.st] || a.st;
  if (a.tier === "t1") return a.nyc ? "Inside the NYC team's daily reach, in the most expensive finishing market in the country." : "On the Boston to Washington corridor, inside the support radius of the NYC team.";
  if (a.tier === "t2") return w !== undefined ? st + " tapers earn " + usd2(w) + ". Lead with a state ROI model and a 10-day pilot." : G.tierAngles.t2;
  if (a.tier === "t3") return (w !== undefined ? st + " tapers earn " + usd2(w) + ", so cost is a weak lead. " : "") + "Sell capacity and schedule on large scopes.";
  return G.tierAngles[a.tier];
}

/* ---------- outbound ---------- */
export function mergeVals(a, first, sender) {
  const v = { first_name: (first || "").trim(), sender: (sender || "").trim(), company: "", city: "", state: "", wage: "" };
  if (a) {
    v.company = a.n;
    v.company_s = /s$/i.test(a.n) ? a.n + "'" : a.n + "'s";
    v.city = a.c && a.c !== "City to verify" ? a.c : "";
    v.state = STATES[a.st] || a.st;
    v.wage = WAGE[a.st] ? nf2fmt(WAGE[a.st]) : "";
  }
  return v;
}
export const fillTpl = (text, v) => text.replace(/\{([a-z_]+)\}/g, (m, k) => (v[k] ? v[k] : m));

/* The sequence rule says: open with the signal that put the account on the list. */
export function openerLine(a, sc) {
  sc = sc || score(a);
  const sig = sc.sig, live = liveAcct(a.id);
  const fed = live.find(x => x.k === "fed");
  if (a.tier === "vet") return null;   /* play P3 already opens on their robot history */
  if (fed) return "I saw {company} on federal work, where prevailing wages make every finisher hour count.";
  if (sig.has("dc")) return "{company_s} data center work is the kind of long, continuous wall where a finishing robot earns its keep.";
  if (sig.has("crew")) return "With crews the size of {company_s}, the staffing gap lands on your supers first.";
  if (sig.has("growth")) return "With {company} growing this fast, finishing capacity is usually the first thing to run out.";
  if (sig.has("union")) return "Since {company} runs union crews, the operator model matters as much as the robot.";
  if (sig.has("prefab")) return "{company} already measures productivity and changes process, which is why I am writing to you.";
  const j = marketJobs(a.st);
  if (j && j.n >= 5) return "There are " + j.n + " large interior jobs permitted in " + j.where + " this month, worth " + money(j.value) + ". Finishers will be the constraint.";
  return null;
}
export function firstTouch(a, first, sender, stepIndex) {
  const pid = playFor(a) || "p1";
  const p = PLAY[pid];
  const step = p.steps[stepIndex || 0];
  const v = mergeVals(a, first, sender);
  const lines = step.b.slice();
  if (!stepIndex) {
    const line = openerLine(a);
    if (line && step.ch === "Email") lines.splice(1, 0, line);
  }
  return { play: p, step, subject: step.s ? fillTpl(step.s, v) : "", body: fillTpl(lines.join("\n\n"), v), vals: v };
}
export const unresolved = text => (text.match(/\{[a-z_]+\}|\[[^\]]+\]/g) || []);
