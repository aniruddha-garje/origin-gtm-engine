/* Library: the full playbook, one tab away from the story. Nothing from the original work is dropped. */
import { h, put, band, sec, table, list, field, copyBtn, usd, frange, enc, fdate } from "../ui.js";
import { G, S, PLAY, evCost } from "../core.js";
import { refs } from "../shared.js";

const b = t => h("strong", { style: "font-weight:600" }, t);
function block(title, lede, ...kids) { return h("div", { class: "lblock" }, h("h3", null, title), lede ? h("p", null, lede) : null, kids); }
function rich(text) {
  const frag = document.createDocumentFragment();
  const re = /(\{[a-z_]+\}|\[[^\]]+\])/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) frag.append(text.slice(last, m.index));
    frag.append(h("span", { class: "ph" }, m[0]));
    last = re.lastIndex;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

function plays() {
  let cur = "p1";
  const tabs = h("div", { class: "seg", style: "margin-bottom:14px" });
  const box = h("div");
  function draw() {
    put(tabs, G.plays.map(p => { const x = h("button", { class: "btn" + (p.id === cur ? " is-on" : ""), type: "button" }, p.n); x.addEventListener("click", () => { cur = p.id; draw(); }); return x; }));
    const p = PLAY[cur];
    put(box,
      h("div", { class: "grid3", style: "margin-bottom:14px" },
        h("div", { class: "card" }, h("p", { class: "card-t" }, "Who"), p.who),
        h("div", { class: "card" }, h("p", { class: "card-t" }, "Trigger"), p.trig),
        h("div", { class: "card" }, h("p", { class: "card-t" }, "Owner"), p.owner)),
      h("div", { class: "play-steps" }, p.steps.map(s => {
        const body = s.b.join("\n\n");
        return h("div", { class: "pstep" },
          h("div", { class: "pstep-h" }, h("span", { class: "tag is-dark" }, s.d < 0 ? Math.abs(s.d) + " days before" : (p.id === "p7" && s.d > 0 ? s.d + " days after" : "Day " + s.d)), h("span", { class: "tag" }, s.ch), s.s ? h("span", { style: "font-weight:500" }, rich(s.s)) : null),
          h("div", { class: "pstep-b" }, rich(body)),
          h("div", { style: "margin-top:8px" }, copyBtn((s.s ? "Subject: " + s.s + "\n\n" : "") + body, "Copy")));
      })),
      h("div", { class: "card", style: "margin-top:14px" }, h("p", { class: "card-t" }, "Before sending"), list(p.confirm)));
  }
  draw();
  return [block("Seven plays", "Five touches over about three weeks, then stop.", tabs, box), block("Sequence rules", null, list(G.sequenceRules))];
}

function objections() {
  return [block("Objection library", "The answers to what every finishing contractor raises. Rows marked confirm need Origin's own data.",
    table([{ t: "Objection" }, { t: "Answer" }, { t: "Proof to show" }, { t: "Status" }, { t: "Ref" }],
      G.objections.map(o => [b("“" + o.q + "”"), o.a, o.proof, h("span", { class: "tag " + (o.conf ? "is-warn" : "is-ok") }, o.conf ? "Confirm" : "Ready"), refs(o.src)]), { cls: "tbl-wide", caption: "Objections" }))];
}

function pilot() {
  return [block("Pilot charter", "The offer behind every play: short, measured, with exit criteria agreed before day one.",
    table([{ t: "Term" }, { t: "Proposal" }], G.pilot.map(p => [b(p[0]), p[1]]), { caption: "Pilot charter" }),
    h("div", { class: "toolbar", style: "margin-top:10px" }, copyBtn(() => "Origin pilot charter (proposal)\n\n" + G.pilot.map(p => p[0] + ": " + p[1]).join("\n"), "Copy charter"))),
  block("Proof assets to build", "In priority order. Every play uses the shift log.", table([{ t: "Asset" }, { t: "What it is" }], G.proofAssets.map(p => [b(p[0]), p[1]]), { caption: "Proof assets" }))];
}

function renderUtm() {
  const U = G.utm;
  const combo = (label, opts, val) => {
    const id = "u" + Math.random().toString(36).slice(2, 7);
    const i = h("input", { type: "text", list: id, value: val, autocomplete: "off", spellcheck: "false" });
    return [field(label, i), h("datalist", { id }, opts.map(o => h("option", { value: o }))), i];
  };
  const base = h("input", { type: "url", value: U.base, spellcheck: "false" });
  const src = combo("Source", U.sources, "email"), med = combo("Medium", U.mediums, "email");
  const camp = h("input", { type: "text", value: "2026_q4_sitewalk_nyc", spellcheck: "false" });
  const con = combo("Content", U.contents, "shiftlog_video"), term = combo("Term (persona)", U.terms, "ops_vp");
  const out = h("output", { class: "utm-out" });
  const clean = v => v.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_.]/g, "");
  const build = () => {
    const u = base.value.trim() || U.base;
    const p = [["utm_source", src[2].value], ["utm_medium", med[2].value], ["utm_campaign", camp.value], ["utm_content", con[2].value], ["utm_term", term[2].value]].map(x => [x[0], clean(x[1])]).filter(x => x[1]);
    out.textContent = u + (p.length ? (u.indexOf("?") === -1 ? "?" : "&") + p.map(x => x[0] + "=" + enc(x[1])).join("&") : "");
  };
  [base, src[2], med[2], camp, con[2], term[2]].forEach(i => i.addEventListener("input", build));
  build();
  return h("div", null, h("div", { class: "grid3" }, field("Landing page", base), src[0], src[1], med[0], med[1], field("Campaign", camp, "e.g. 2027_q1_build27_preshow"), con[0], con[1], term[0], term[1]), out, copyBtn(() => out.textContent, "Copy link"));
}

function renderScorer() {
  const evSel = h("select", null, G.events.filter(e => e.start).map(e => h("option", { value: e.id }, e.n + " (" + frange(e.start, e.end) + ")")));
  evSel.value = "build27";
  const cost = h("input", { type: "number", min: "0", step: "100" });
  const qcs = h("input", { type: "number", min: "0", step: "1", value: "24" });
  const pipe = h("input", { type: "number", min: "0", step: "1000", value: "250000" });
  const pilots = h("input", { type: "number", min: "0", step: "1", value: "1" });
  const out = h("div", { "aria-live": "polite", style: "margin-top:14px" });
  const syncCost = () => { cost.value = Math.round(evCost(G.events.find(x => x.id === evSel.value)).total); };
  function draw() {
    const c = parseFloat(cost.value) || 0, q = parseFloat(qcs.value) || 0, p = parseFloat(pipe.value) || 0, n = parseFloat(pilots.value) || 0;
    const cpq = q ? c / q : Infinity, ratio = c ? p / c : Infinity;
    const t1 = cpq <= 750 ? "good" : cpq <= 2000 ? "warn" : "bad";
    const t2 = ratio >= 10 ? "good" : ratio >= 3 ? "warn" : "bad";
    const t3 = n >= 1 ? "good" : "bad";
    const greens = [t1, t2, t3].filter(x => x === "good").length;
    const verdict = greens >= 2 ? ["Repeat", "Book it again at the same format."] : greens === 1 ? ["Change the format", "Keep the event, change how you show up."] : ["Drop", "Spend the money elsewhere next year."];
    const st = t => h("span", { class: "tag " + (t === "good" ? "is-ok" : t === "warn" ? "is-warn" : "is-orange") }, t === "good" ? "On target" : t === "warn" ? "Borderline" : "Off target");
    put(out, table([{ t: "Measure" }, { t: "Result", cls: "num" }, { t: "Target" }, { t: "Status" }], [
      ["Cost per qualified conversation", isFinite(cpq) ? usd(cpq) : "No conversations", "$750 or less; up to $2,000 is borderline", st(t1)],
      ["Pipeline per dollar spent", isFinite(ratio) ? ratio.toFixed(1) + "x" : "No cost", "10x or more; 3x is borderline", st(t2)],
      ["Pilots opened within 60 days", String(n), "At least 1", st(t3)]
    ], { caption: "Event score" }), h("p", { style: "margin-top:10px" }, b(verdict[0] + ". "), verdict[1]));
  }
  evSel.addEventListener("change", () => { syncCost(); draw(); });
  [cost, qcs, pipe, pilots].forEach(i => i.addEventListener("input", draw));
  syncCost(); draw();
  return h("div", null, h("div", { class: "grid3" }, field("Event", evSel), field("Total cost ($)", cost, "From the event plan"), field("Qualified conversations", qcs, "Example values"), field("Pipeline ($)", pipe), field("Pilots opened in 60 days", pilots)), out);
}

function measure() {
  return [
    block("Lead routing", "Every inbound lead has an owner and a clock.", table([{ t: "Lead" }, { t: "Owner" }, { t: "Respond within" }, { t: "First step" }], G.routing, { cls: "tbl-wide", caption: "Lead routing" })),
    block("A qualified conversation", null, h("blockquote", null, G.qc)),
    block("CRM fields", "Add these before the first send so every report can be cut by tier, play and signal.", table([{ t: "Object" }, { t: "Fields" }], G.crm.map(c => [b(c[0]), c[1]]), { caption: "CRM fields" })),
    block("UTM builder", "Lowercase, underscores, campaign as year_quarter_play_market.", renderUtm()),
    block("Score an event within 30 days", "Three numbers decide whether an event comes back next year.", renderScorer()),
    block("Monthly report", "One page to the founders on the first Monday of the month.", table([{ t: "Section" }, { t: "What goes in it" }], G.report.map(r => [b(r[0]), r[1]]), { caption: "Monthly report" }))
  ];
}

function brand() {
  const L = S.live;
  const liveNote = L && L.claims ? h("p", { class: "fineprint", style: "margin-bottom:10px" }, h("span", { class: "tag is-ok" }, "Checked today"), " " + L.claims.filter(c => c.live).length + " of " + L.claims.length + " tracked public claims are still on origin.tech.") : null;
  return [
    block("Claims register", "Fix these before outbound starts. Contractors and trade editors do the arithmetic.", liveNote,
      table([{ t: "Claim" }, { t: "What is public now" }, { t: "Recommended fix" }, { t: "Ref" }], G.claims.map(c => [b(c.c), c.found, c.fix, refs(c.src)]), { cls: "tbl-wide", caption: "Claims register" })),
    block("Boilerplate, draft", "One paragraph for every release and media kit. Founders to confirm.", h("blockquote", null, G.boilerplate), h("div", { style: "margin-top:10px" }, copyBtn(G.boilerplate, "Copy boilerplate"))),
    block("Media map", "Launch coverage reached investors. These outlets reach the people who sign pilots.", table([{ t: "Outlet" }, { t: "Reaches" }, { t: "Angle" }, { t: "Timing" }], G.media.map(m => [b(m.o), m.a, m.ang, m.t]), { cls: "tbl-wide", caption: "Media map" })),
    block("Answer pages", "Questions buyers ask search and AI assistants. One page each.", table([{ t: "Question" }, { t: "Page type" }, { t: "Schema" }], G.aeo, { caption: "Answer pages" })),
    block("Founder post outlines", "Three lanes, outlines only. Each founder writes in their own voice.", h("div", { class: "grid3" }, G.founders.map(f => h("div", { class: "card" }, h("p", { class: "card-t" }, f.lane), h("h4", { style: "font:500 18px/1.2 var(--sans);margin-bottom:10px" }, f.who), list(f.posts), h("div", { style: "margin-top:8px" }, refs(f.src)))))),
    block("Company post template", "After every notable shift. Fill every bracket from the shift log.", h("div", { class: "pstep" }, h("div", { class: "pstep-b" }, rich(G.postTemplate))), h("div", { style: "margin-top:8px" }, copyBtn(G.postTemplate, "Copy template")))
  ];
}

function icp() {
  return [
    block("ICP statement", null, h("blockquote", null, G.icp.statement)),
    block("Firmographic filters", null, table([{ t: "Filter" }, { t: "What qualifies" }], G.icp.firmo.map(f => [b(f[0]), f[1]]), { caption: "Filters" })),
    block("Buying committee, titles to search", null, table([{ t: "Role" }, { t: "Titles" }], G.icp.committee.map(c => [b(c.r), c.titles]), { caption: "Titles" })),
    block("Origin today", "What is public about the product, deployments and plan.", table([{ t: "Topic" }, { t: "What is public" }, { t: "Ref" }], G.origin.map(o => [b(o[0]), o[1], refs(o.slice(2))]), { caption: "Origin facts" }))
  ];
}

function findings() {
  const r = String;
  return [block("Six findings the engine is built on", null, h("div", { class: "grid2" }, G.notes.map(n => h("div", { class: "card" }, h("h4", { style: "font:500 19px/1.25 var(--sans);letter-spacing:-.015em;margin-bottom:6px" }, n.h), h("p", { class: "fineprint", style: "font-size:14.5px" }, n.t.replace("{breakeven}", "the break-even rate on the Markets page"), " ", refs(n.src))))))];
}

function sources() {
  const comp = ["s29", "s30", "s31", "s32", "s33", "s34", "s35", "s36", "s37", "s38", "s39", "s40", "s41", "s42", "s43", "s44", "s62", "s64", "s65", "s66", "s67", "s68", "s69", "s70", "s72"];
  const groups = [
    ["Origin", id => /^s([1-9]|1[0-8])$/.test(id)],
    ["Labor market and wages", id => /^s2[0-6]$/.test(id)],
    ["Competitors and robot programs", id => comp.includes(id)],
    ["Rankings, accounts and projects", id => /^s/.test(id) && !/^s([1-9]|1[0-8]|2[0-6])$/.test(id) && !comp.includes(id)],
    ["Events and awards", id => /^e/.test(id)]
  ];
  const ids = Object.keys(G.sources);
  return [h("p", { class: "fineprint", style: "margin-bottom:20px;max-width:64ch" }, "Accessed November 2026. Reference numbers match the small links throughout. Where a number is only a company's claim, the page says so."),
    ...groups.map(g => block(g[0], null, h("ul", { style: "display:grid;gap:5px" }, ids.filter(g[1]).map(id => h("li", { style: "font-size:14.5px" }, h("span", { class: "ref", style: "margin-right:8px" }, id), h("a", { href: G.sources[id][1], target: "_blank", rel: "noopener noreferrer" }, G.sources[id][0]))))))];
}

const TABS = [["plays", "Plays", plays], ["objections", "Objections", objections], ["pilot", "Pilot charter", pilot], ["measure", "Measurement", measure], ["brand", "Brand and PR", brand], ["icp", "ICP", icp], ["findings", "Findings", findings], ["sources", "Sources", sources]];

export default function library(root, params) {
  let cur = TABS.some(t => t[0] === params.sub) ? params.sub : "plays";
  const head = band({ label: "Library", title: "The full playbook", answer: "Everything behind the engine: every sequence, objection, tool and source." });
  const tabs = h("div", { class: "ltabs", role: "tablist", "aria-label": "Library sections" });
  const box = h("div");
  const body = sec(null, null);
  body.body.append(tabs, box);
  function draw() {
    put(tabs, TABS.map(t => { const x = h("button", { class: "btn" + (t[0] === cur ? " is-on" : ""), type: "button", role: "tab", "aria-selected": String(t[0] === cur) }, t[1]); x.addEventListener("click", () => { cur = t[0]; history.replaceState(null, "", "#/library/" + cur); draw(); }); return x; }));
    put(box, TABS.find(t => t[0] === cur)[2]());
  }
  root.append(head, body);
  draw();
}
