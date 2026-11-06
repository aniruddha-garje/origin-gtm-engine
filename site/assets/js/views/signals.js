/* Signals: what fired today, and what each signal is worth. */
import { h, put, band, sec, copyBtn, money, fshort, num } from "../ui.js";
import { G, R, S, STATES, TIER_SHORT, OUTBOUND_TIERS, score, activeSig } from "../core.js";
import { refs, nextLink, feedItem, KIND, runStamp } from "../shared.js";

export default function signals(root, params) {
  const L = S.live, C = (L && L.counts) || {};
  const head = band({
    no: "04", label: "Signals", title: "What tells us the moment is now?",
    answer: h("span", null, "Every morning we scan public records and news for a reason to call. ", h("strong", null, "Last run: " + runStamp() + ".")),
    kpis: [
      { l: "Interior work tracked", v: money(C.projectValue || 0), s: (C.projects || 0) + " jobs across 5 markets" },
      { l: "Delayed projects", v: String(C.delays || 0), s: "Reported in US markets", hot: true },
      { l: "Data center fit-outs", v: String(C.dataCenters || 0), s: "In Texas filings" },
      { l: "New contractors found", v: String(C.discovered || 0), s: "Not on our list yet" }
    ]
  });

  /* live feed */
  const kinds = [["all", "All"], ["delay", "Project lagging"], ["jobs", "Live jobs"], ["dc", "Data centers"], ["robot", "Robots"], ["labor", "Labor squeeze"]];
  let kind = params.kind && kinds.some(k => k[0] === params.kind) ? params.kind : "all";
  const tabs = h("div", { class: "seg", role: "group", "aria-label": "Filter signals" });
  const box = h("div");
  const feedSec = sec("What the scan found", "The label on the left says why each item matters. An orange dot means new since the last run.");
  feedSec.body.append(tabs, h("div", { style: "height:14px" }), box);

  const stIn = st => G.accounts.filter(a => a.st === st && OUTBOUND_TIERS.includes(a.tier)).map(a => ({ a, s: score(a).total })).sort((x, y) => y.s - x.s).slice(0, 3).map(x => x.a);
  function jobCard(p) {
    const size = p.area ? num(p.area) + " sq ft" : null;
    const near = stIn(p.st);
    return h("a", { class: "pc", href: p.url, target: "_blank", rel: "noopener noreferrer" },
      h("div", { class: "pc-top" }, h("span", { class: "tag" + (p.kind === "dc" ? " is-orange" : "") }, p.market + " · " + ({ dc: "Data center", interior: "Interior", conversion: "Conversion", new: "New build" }[p.kind] || p.kind)), h("span", { class: "pc-v" }, p.cost ? money(p.cost) : "")),
      h("h4", null, p.name || p.address),
      h("p", null, p.desc),
      h("p", { class: "fineprint" }, [p.holder, size, p.city, p.end ? "To " + fshort(p.end) : null].filter(Boolean).join(" · ")),
      near.length ? h("p", { class: "fineprint" }, "In this market: " + near.map(a => a.n).join(", ")) : null);
  }
  function delayCard(x) {
    const near = x.st ? stIn(x.st) : [];
    return h("a", { class: "pc", href: x.url, target: "_blank", rel: "noopener noreferrer" },
      h("div", { class: "pc-top" }, h("span", { class: "tag is-dark" }, (x.st || "US") + " · Lagging"), h("span", { class: "fineprint" }, fshort(x.date))),
      h("h4", null, x.title),
      h("p", { class: "fineprint" }, x.source),
      near.length ? h("p", { class: "fineprint" }, "Could help: " + near.map(a => a.n).join(", ")) : h("p", { class: "fineprint" }, "No tracked sub in this state yet"));
  }
  function draw() {
    put(tabs, kinds.map(k => {
      const b = h("button", { class: "btn" + (k[0] === kind ? " is-on" : ""), type: "button" }, k[1]);
      b.addEventListener("click", () => { kind = k[0]; draw(); });
      return b;
    }));
    if (!L) { put(box, h("p", { class: "fineprint" }, "No data from the latest run.")); return; }
    if (kind === "delay") {
      put(box, h("p", { class: "fineprint", style: "margin-bottom:12px" }, "Headlines name the project, rarely the drywall sub. So this feed shows who could help in that market, not who is at fault."),
        h("div", { class: "pcards" }, L.signals.filter(x => x.kind === "delay").map(delayCard)));
    } else if (kind === "jobs") {
      const m = {}; L.projects.forEach(p => { (m[p.market] = m[p.market] || []).push(p); });
      put(box, h("div", { class: "toolbar", style: "margin-bottom:12px" }, Object.keys(m).map(k => h("span", { class: "tag" }, k + " " + m[k].length + " · " + money(m[k].reduce((t, p) => t + p.cost, 0))))),
        h("div", { class: "pcards" }, L.projects.slice(0, 16).map(jobCard)));
    } else if (kind === "dc") {
      put(box, h("div", { class: "pcards" }, L.projects.filter(p => p.kind === "dc").map(jobCard)),
        h("div", { class: "feed on-paper", style: "margin-top:14px" }, L.signals.filter(x => x.kind === "dc").map(x => feedItem(x, L.runDay))));
    } else {
      const f = kind === "robot" ? x => x.kind === "robot" || x.kind === "layout" : kind === "labor" ? x => x.kind === "labor" : x => x.kind !== "mention";
      put(box, h("div", { class: "feed on-paper" }, L.signals.filter(f).slice(0, 30).map(x => feedItem(x, L.runDay))));
    }
  }

  /* the library of signals */
  const lib = sec("What each signal is worth", "Each signal adds points to a contractor's score, up to 50 in total.", { cls: "is-white" });
  const fired = k => G.accounts.filter(a => a.tier !== "excl" && activeSig(a).has(k)).length;
  const maxW = 25;
  lib.body.append(h("div", { class: "sigw rv" }, h("div", { class: "sigw-r is-head" }, h("span", null, "Signal"), h("span", { class: "hide-s" }, "Effect on score"), h("span", { style: "text-align:right" }, "Points"), h("span", { class: "hide-s", style: "text-align:right" }, "Contractors"), h("span", { class: "hide-s" }, "We check")), G.signals.map(x => h("div", { class: "sigw-r" },
    h("div", null, x.n, h("small", null, x.why, " ", refs(x.src))),
    h("div", { class: "sigbar", "aria-hidden": "true" }, h("i", { class: x.w < 0 ? "is-neg" : "", style: "width:" + Math.abs(x.w) / maxW * (x.w < 0 ? 40 : 60) + "%" })),
    h("strong", { style: "font-weight:600;text-align:right" }, (x.w > 0 ? "+" : "−") + Math.abs(x.w)),
    h("span", { class: "hide-s fineprint", style: "text-align:right", title: "Accounts where this signal fires" }, String(fired(x.k))),
    h("span", { class: "hide-s" }, h("span", { class: "tag" }, x.freq))))));

  /* sources */
  const srcSec = sec("Where the data comes from", "Green means the source updated on the last run. A source that fails keeps its last good data.", { cls: "is-dark" });
  srcSec.body.append(h("div", { class: "srcs rv" }, (L ? L.sources : []).map(x => h(x.url ? "a" : "div", { class: "src", href: x.url || null, target: x.url ? "_blank" : null, rel: x.url ? "noopener noreferrer" : null },
    h("h4", null, h("i", { class: "dot is-" + x.status, title: x.status }), x.name), h("p", null, x.note)))));

  /* sweeps */
  const sw = sec("What runs itself, and what needs a person", "Orange tags run automatically. The rest are recipes for the team.");
  sw.body.append(h("div", { class: "sweeps rv" }, G.sweeps.map(x => {
    const auto = R.sweepStatus[x.n] === "auto";
    return h("div", { class: "card sweep" },
      h("h4", null, x.n, h("span", { class: "tag " + (auto ? "is-orange" : "") }, auto ? "Automated" : x.freq)),
      h("p", null, x.what, " ", refs(x.src)),
      x.links && x.links.length ? h("div", { class: "links" }, x.links.map(l => h("a", { href: l[1], target: "_blank", rel: "noopener noreferrer" }, l[0]))) : null,
      x.example ? h("p", null, h("strong", { style: "font-weight:600" }, "Example. "), x.example[0], " ", refs(x.example.slice(1))) : null,
      x.recipe ? h("div", null, h("pre", null, x.recipe), copyBtn(x.recipe, "Copy recipe")) : null);
  })), h("p", { class: "fineprint", style: "margin-top:12px" }, G.sweepNote));

  root.append(head, feedSec, lib, srcSec, sw, nextLink("#/events", "where to show up", "Every call can open with something that happened this month, not a cold pitch."));
  draw();
}
