/* Segments: who buys, how the list narrows, and how the score works. */
import { h, $$, band, sec, steps, collapse, store } from "../ui.js";
import { G, S, TIER_SHORT, OUTBOUND_TIERS, PRESETS, score } from "../core.js";
import { refs, nextLink } from "../shared.js";

export default function segments(root) {
  const count = t => G.accounts.filter(a => a.tier === t).length;
  const outbound = G.accounts.filter(a => OUTBOUND_TIERS.includes(a.tier));

  const head = band({
    no: "02", label: "Segments", title: "Who buys, and who do we call first?",
    answer: h("span", null, "The ", h("strong", null, "wall and ceiling sub"), " holds the purchase order. Geography and robot history decide the order of attack."),
    kpis: [
      { l: "Researched", v: String(G.accounts.length), s: "W&C Top 50, Siteline, trade press" },
      { l: "In the four tiers", v: String(outbound.length), s: "Ready for outbound" },
      { l: "Buying committee", v: String(G.icp.committee.length), s: "Roles that touch the decision" },
      { l: "Finishing share", v: "60 to 70%", s: "Of drywall labor", hot: true }
    ]
  });

  /* why the sub */
  const chain = sec("Why the sub, not the GC", "Follow the money to who feels the finisher shortage.");
  chain.body.append(h("div", { class: "chain rv" },
    h("div", { class: "link" }, h("h4", null, "Owner"), h("p", null, "Wants the opening date.")),
    h("div", { class: "link" }, h("h4", null, "General contractor"), h("p", null, "Shapes the decision. A few self-perform drywall. ", refs(["s42"]))),
    h("div", { class: "link is-buyer" }, h("h4", null, "Wall and ceiling sub"), h("p", null, "Carries finishing in its own crew and price. The purchase order comes from here. ", refs(["s26"]))),
    h("div", { class: "link" }, h("h4", null, "Finishing super"), h("p", null, "Judges the walls. Can veto on the first walk."))),
    h("blockquote", { class: "rv", style: "margin-top:30px;max-width:64ch" }, G.icp.statement));

  /* funnel + tree */
  const nar = sec("How 60 became four tiers", "The list narrows on evidence, then sorts on geography.", { cls: "is-dark" });
  const funnel = h("div", { class: "funnel" }, [
    ["~220,000", "US painting and wall covering businesses", 100],
    [String(G.accounts.length), "Researched: rankings and trade press", 80],
    [String(G.accounts.length - count("excl")), "Pass the disqualifiers", 64],
    [String(outbound.length), "In the four outbound tiers", 50]
  ].map(f => h("div", { class: "fun", style: "width:" + f[2] + "%;min-width:min(100%,300px)" }, h("span", null, f[1]), h("b", null, f[0]))));
  nar.body.append(h("div", { class: "rv" }, funnel, h("p", { class: "fineprint", style: "margin-top:12px;color:rgba(255,255,255,.6)" }, "Bars show the order of filtering, not proportion. ", refs(["s25", "s27", "s47", "s56"]))));

  const treeSec = sec("The sort, in order", "Each contractor stops at the first question it answers yes to.", { cls: "is-white" });
  const q = [
    ["Outside the US launch market?", "Excluded", "excl", "out"],
    ["Running a competing finishing fleet?", "Nurture", "nurture", "out"],
    ["A painting contractor?", "Painting lane, priming play", "paint", "out"],
    ["Already ran a jobsite robot?", "Robot veterans", "vet", "tier"],
    ["NYC metro or Boston to Washington corridor?", "Tier 1, Northeast beachhead", "t1", "tier"],
    ["West Coast, Midwest or Hawaii?", "Tier 2, high wage markets", "t2", "tier"],
    ["Everyone else: Texas, Southeast, Arizona, Colorado", "Tier 3, Sun Belt volume", "t3", "tier"]
  ];
  treeSec.body.append(h("div", { class: "tree rv" }, q.map((r, i) => h("div", { class: "tree-r is-" + r[3] }, h("i", null, String(i + 1).padStart(2, "0")), h("b", null, r[0]), h("em", { style: "font-style:normal;color:var(--muted);font-size:14px" }, "→ " + r[1]), h("strong", null, count(r[2]))))),
    h("div", { style: "margin-top:22px" }, collapse("Disqualifiers: say no early", h("ul", { class: "list" }, G.icp.disq.map(d => h("li", null, d))))));

  /* score lab */
  const labSec = sec("How we scored", "Five factors, 100 points. Change the weights and watch the list re-rank.");
  const LABELS = [["size", "Size", 15], ["labor", "Labor cost", 15], ["prox", "Proximity to NYC", 10], ["scope", "Scope fit", 10], ["sig", "Signals", 50]];
  const RULES = {
    size: "$1B+ 15, $300M+ 13, $150M+ 11, $100M+ 10, $50M+ 8, $30M+ 6, unknown 5",
    labor: "NYC metro 15. State wage: $45+ 14, $37+ 12, $33+ 10, $28+ 8, $24+ 6, below 4. No estimate 6",
    prox: "NYC metro 10, corridor 7, multi-region 5, elsewhere 3",
    scope: "Wall and ceiling 10, painting 8",
    sig: "Sum of signal points, capped at 50. A competing fleet subtracts 25"
  };
  const ROW = 39, TOP = 12;
  const rows = {};
  const rank = h("div", { class: "rank", style: "height:" + (ROW * TOP) + "px;overflow:hidden" });
  outbound.forEach(a => {
    const n = h("i", null, "");
    const sc = h("b", null, "");
    const st = h("div", { class: "stack", "aria-hidden": "true" }, ["size", "labor", "prox", "scope", "sig"].map(k => h("span", { class: "s-" + k })));
    const row = h("a", { class: "rank-r", href: "#/prospects?tier=" + a.tier, style: "position:absolute;left:0;right:0;height:" + ROW + "px;text-decoration:none;color:inherit" }, n, h("span", null, a.n), sc, st);
    rows[a.id] = { row, n, sc, st };
    rank.append(row);
  });
  const presetBtns = {};
  const presetBox = h("div", { class: "seg" }, Object.keys(PRESETS).map(k => {
    const b = h("button", { class: "btn", type: "button" }, PRESETS[k].n);
    b.addEventListener("click", () => { S.weights = Object.assign({}, PRESETS[k].w); store.set("weights", S.weights); syncAll(); });
    presetBtns[k] = b;
    return b;
  }));
  const sliders = {};
  const sl = h("div", { style: "display:grid;gap:12px;margin-top:18px" }, LABELS.map(d => {
    const out = h("output", null, "");
    const i = h("input", { type: "range", min: "0", max: "3", step: "0.5", value: S.weights[d[0]], "aria-label": d[1] + " weight" });
    i.addEventListener("input", () => { S.weights[d[0]] = parseFloat(i.value); store.set("weights", S.weights); syncAll(); });
    sliders[d[0]] = [i, out];
    return h("div", { class: "slider" }, h("label", { title: RULES[d[0]] }, d[1] + " · " + d[2] + " pts", out), i, h("p", { class: "fineprint", style: "margin-top:2px" }, RULES[d[0]]));
  }));
  function syncAll() {
    Object.keys(sliders).forEach(k => { sliders[k][0].value = S.weights[k]; sliders[k][1].textContent = S.weights[k] + "x"; });
    Object.keys(presetBtns).forEach(k => {
      const on = Object.keys(PRESETS[k].w).every(x => PRESETS[k].w[x] === S.weights[x]);
      presetBtns[k].classList.toggle("is-on", on);
    });
    const ranked = outbound.map(a => ({ a, s: score(a) })).sort((x, y) => y.s.total - x.s.total || (y.a.rev || 0) - (x.a.rev || 0));
    ranked.forEach((r, i) => {
      const e = rows[r.a.id], c = r.s.c, W = S.weights;
      e.row.style.transform = "translateY(" + Math.min(i, TOP) * ROW + "px)";
      e.row.style.opacity = i < TOP ? 1 : 0;
      e.row.setAttribute("tabindex", i < TOP ? "0" : "-1");
      e.n.textContent = i + 1;
      e.sc.textContent = r.s.total;
      const parts = [c.size * W.size, c.labor * W.labor, c.prox * W.prox, c.scope * W.scope, Math.max(0, c.sig + c.neg) * W.sig];
      $$("span", e.st).forEach((p, j) => { p.style.flexGrow = parts[j] || 0.001; });
    });
  }
  labSec.body.append(h("div", { class: "lab rv" },
    h("div", { class: "card on-light" }, h("p", { class: "card-t" }, "Weights"), presetBox, sl),
    h("div", { class: "card" }, h("p", { class: "card-t" }, "Top " + TOP + " across the four tiers"), rank,
      h("div", { class: "stack-l" }, [["size", "Size"], ["labor", "Labor"], ["prox", "Proximity"], ["scope", "Scope"], ["sig", "Signals"]].map(l => h("span", null, h("i", { class: "s-" + l[0] }), l[1]))))));

  /* committee */
  const cm = sec("The buying committee", "The champion is operations. The finishing super can veto it on the first walk.", { cls: "is-white" });
  cm.body.append(h("div", { class: "roles rv" }, G.icp.committee.map(c => h("div", { class: "role" + (c.tag ? " is-key" : "") },
    h("h4", null, c.r, c.tag ? h("span", { class: "tag is-orange" }, c.tag) : null),
    h("p", null, h("b", null, "Cares: "), c.care),
    h("p", null, h("b", null, "Fears: "), c.fear),
    h("p", null, h("b", null, "Win them: "), c.win)))));

  root.append(head, chain, nar, treeSec, labSec, cm, nextLink("#/veterans", "who already tried robots"));
  syncAll();
}
