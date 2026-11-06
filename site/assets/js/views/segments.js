/* Segments: who buys, how the list narrows, and exactly how a score is built. */
import { h, $$, put, band, sec, collapse, store, usd2, revFmt } from "../ui.js";
import { G, R, S, STATES, WAGE, SEG, SIG, TIER_SHORT, OUTBOUND_TIERS, PRESETS, score, proxNote } from "../core.js";
import { refs, nextLink, howto } from "../shared.js";

const n = (v, u) => h("span", null, v, h("small", null, " " + u));

/* The score always adds up in plain sight: five sets of points, out of 100. */
function explain(a) {
  const sc = score(a, PRESETS.balanced.w), c = sc.c;
  const sigs = [...sc.sig].map(k => SIG[k]).filter(Boolean).sort((x, y) => y.w - x.w);
  const list = sigs.slice(0, 3).map(x => x.n + " " + (x.w > 0 ? "+" : "−") + Math.abs(x.w)).join(", ") + (sigs.length > 3 ? ", and " + (sigs.length - 3) + " more" : "");
  return {
    total: sc.total,
    parts: [
      ["Size", c.size, 15, a.rev ? revFmt(a.rev) + " revenue" : "Revenue not public"],
      ["Labor cost", c.labor, 15, a.nyc ? "NYC union market" : WAGE[a.st] !== undefined ? STATES[a.st] + ", " + usd2(WAGE[a.st]) + " an hour" : "No wage data, scored as average"],
      ["Distance", c.prox, 10, proxNote(a, sc.sig).replace("Multi-region footprint", "Works across several regions")],
      ["Scope fit", c.scope, 10, SEG[a.seg]],
      ["Signals", c.sig + c.neg, 50, list || "None yet"]
    ]
  };
}

export default function segments(root) {
  const count = t => G.accounts.filter(a => a.tier === t).length;
  const outbound = G.accounts.filter(a => OUTBOUND_TIERS.includes(a.tier));
  const inScope = G.accounts.length - count("excl");

  const head = band({
    no: "02", label: "Segments", title: "Who buys, and who do we call first?",
    answer: h("span", null, "The ", h("strong", null, "wall and ceiling subcontractor"), " signs the purchase order. A score out of 100 decides who we call first."),
    kpis: [
      { l: "Contractors researched", v: String(G.accounts.length), s: "From rankings and trade press" },
      { l: "Ready for outbound", v: String(outbound.length), s: "Sorted into four tiers" },
      { l: "People in each decision", v: String(G.icp.committee.length), s: "Roles that can say yes or no" },
      { l: "Drywall labor that is finishing", v: "60 to 70%", s: "The hours the robot goes after", hot: true }
    ]
  });

  /* why the sub */
  const chain = sec("Why we sell to the subcontractor", "Four parties touch a drywall job. Only one carries the finishing cost.");
  chain.body.append(h("div", { class: "chain rv" },
    h("div", { class: "link" }, h("h4", null, "Owner"), h("p", null, "Wants the opening date.")),
    h("div", { class: "link" }, h("h4", null, "General contractor"), h("p", null, "Influences the choice. A few self-perform drywall. ", refs(["s42"]))),
    h("div", { class: "link is-buyer" }, h("span", { class: "tag is-orange" }, "Our buyer"), h("h4", null, "Wall and ceiling sub"), h("p", null, "Finishing sits in their crew and their price, so the purchase order comes from here. ", refs(["s26"]))),
    h("div", { class: "link" }, h("h4", null, "Finishing super"), h("p", null, "Judges the walls. Can veto on the first site walk."))));

  /* funnel */
  const nar = sec("From 220,000 businesses to " + outbound.length + " contractors", "Each step removes anyone who cannot buy from Origin yet.", { cls: "is-dark" });
  const parked = count("paint") + count("nurture");
  const funnel = h("div", { class: "funnel" }, [
    ["220,000", "businesses", "All US painting and wall covering contractors", 100],
    [String(G.accounts.length), "contractors", "Big enough to keep a robot busy: W&C Top 50, Siteline rankings, trade press", 82],
    [String(inScope), "contractors", count("excl") + " removed: outside the US launch market", 66],
    [String(outbound.length), "contractors", parked + " set aside: " + count("paint") + " painters get their own lane, " + count("nurture") + " runs a rival robot fleet", 52]
  ].map(f => h("div", { class: "fun", style: "width:" + f[3] + "%" }, h("span", null, f[2]), h("b", null, n(f[0], f[1])))));
  nar.body.append(h("div", { class: "rv" }, funnel, h("p", { class: "fineprint", style: "margin-top:12px;color:rgba(255,255,255,.6)" }, "Bars are not to scale. ", refs(["s25", "s27", "s47"]))));

  /* tiers */
  const tierSec = sec("The four tiers", "A tier sets the order we call and the pitch we use.", { cls: "is-white" });
  const q = [
    ["Outside the US launch market?", "Excluded", "excl", "out"],
    ["Running a rival finishing robot fleet?", "Nurture", "nurture", "out"],
    ["A painting contractor?", "Painting lane", "paint", "out"],
    ["Already ran a robot on a job?", "Robot veterans", "vet", "tier"],
    ["In the NYC metro or the Boston to DC corridor?", "Tier 1", "t1", "tier"],
    ["On the West Coast, in the Midwest or Hawaii?", "Tier 2", "t2", "tier"],
    ["Everyone else: Texas, Southeast, Arizona, Colorado", "Tier 3", "t3", "tier"]
  ];
  tierSec.body.append(
    h("div", { class: "grid4 rv" }, OUTBOUND_TIERS.map(t => {
      const p = R.tierPlain[t];
      return h("a", { class: "tcard", href: "#/prospects?tier=" + t },
        h("span", { class: "tcard-n" }, n(count(t), "contractors")),
        h("h3", null, p.name), h("small", null, p.tag),
        h("p", null, p.why),
        h("p", { class: "tcard-a" }, "→ " + p.action));
    })),
    h("h3", { class: "sub-h" }, "How a contractor lands in a tier"),
    howto("Ask these questions in order. A contractor stops at the first yes."),
    h("div", { class: "tree rv" },
      h("div", { class: "tree-r is-head" }, h("i"), h("span", null, "Question"), h("span", null, "If yes, goes to"), h("span", { style: "text-align:right" }, "Contractors")),
      q.map((r, i) => h("div", { class: "tree-r is-" + r[3] }, h("i", null, String(i + 1)), h("b", null, r[0]), h("em", null, r[1]), h("strong", null, count(r[2]))))),
    h("div", { style: "margin-top:22px" }, collapse("Who we say no to, early", h("ul", { class: "list" }, G.icp.disq.map(d => h("li", null, d))))));

  /* the score */
  const labSec = sec("How a contractor earns a score out of 100", "We ask five questions and add up the points. Higher score, sooner the call.");
  const sigRows = G.signals.filter(x => x.w > 0).sort((a, b) => b.w - a.w).slice(0, 5).map(x => [x.n, "+" + x.w]);
  const lock = G.signals.find(x => x.k === "lock");
  labSec.body.append(h("div", { class: "factors rv" }, R.factors.map(f => {
    const rows = f.k === "sig" ? [...sigRows, ["…and " + (G.signals.length - 6) + " more", ""], [lock.n, "−" + Math.abs(lock.w)]] : f.rows;
    return h("div", { class: "fac" + (f.k === "sig" ? " is-sig" : "") },
      h("div", { class: "fac-top" }, h("h3", null, f.n), h("span", { class: "fac-max" }, f.max, h("small", null, " pts max"))),
      h("p", { class: "fac-q" }, f.q),
      h("ul", null, rows.map(r => h("li", null, h("span", null, r[0]), h("b", null, r[1])))));
  })));

  /* worked example */
  const ex = h("div", { class: "sum rv", "aria-live": "polite" });
  const exTitle = h("h3", { class: "sub-h" }, "");
  let picked = null;
  function drawExample(a) {
    picked = a;
    const e = explain(a);
    exTitle.textContent = "Example: how " + a.n + " scored " + e.total;
    put(ex, e.parts.map((p, i) => [
      h("div", { class: "sum-p" + (p[0] === "Signals" ? " is-sig" : "") }, h("span", { class: "sum-v" }, p[1], h("small", null, " of " + p[2])), h("b", null, p[0]), h("p", null, p[3])),
      h("span", { class: "sum-op", "aria-hidden": "true" }, i < 4 ? "+" : "=")
    ]), h("div", { class: "sum-t" }, h("span", { class: "sum-v" }, e.total), h("b", null, "out of 100")));
  }

  /* leaderboard */
  const ROW = 46, TOP = 10;
  const rows = {};
  const body = h("div", { class: "lb-body", style: "height:" + ROW * TOP + "px" });
  outbound.forEach(a => {
    const rk = h("span", { class: "lb-rk" }, "");
    const cells = ["size", "labor", "prox", "scope", "sig"].map(() => h("span", { class: "lb-n" }, ""));
    const sc = h("b", { class: "lb-sc" }, "");
    const fill = h("i");
    const row = h("button", { class: "lb-r", type: "button", style: "height:" + ROW + "px" },
      rk, h("span", { class: "lb-name" }, a.n, h("small", null, TIER_SHORT[a.tier])), cells,
      h("span", { class: "lb-total" }, sc, h("span", { class: "lb-bar" }, fill)));
    row.addEventListener("click", () => { drawExample(a); syncRows(); exTitle.scrollIntoView({ behavior: "smooth", block: "center" }); });
    rows[a.id] = { a, row, rk, cells, sc, fill };
    body.append(row);
  });

  const prioBtns = {};
  const prioNote = h("p", { class: "fineprint", style: "margin-top:10px" });
  const prio = h("div", { class: "prio" }, R.priorities.map(p => {
    const b = h("button", { class: "prio-b", type: "button" }, h("b", null, p.n), h("span", null, p.d));
    b.addEventListener("click", () => { S.weights = Object.assign({}, PRESETS[p.k].w); store.set("weights", S.weights); sync(); });
    prioBtns[p.k] = b;
    return b;
  }));
  const sliders = {};
  const LABELS = [["size", "Size"], ["labor", "Labor cost"], ["prox", "Distance"], ["scope", "Scope fit"], ["sig", "Signals"]];
  const sl = h("div", { class: "row5 on-light" }, LABELS.map(d => {
    const out = h("output", null, "");
    const i = h("input", { type: "range", min: "0", max: "3", step: "0.5", value: S.weights[d[0]], "aria-label": d[1] + " weight" });
    i.addEventListener("input", () => { S.weights[d[0]] = parseFloat(i.value); store.set("weights", S.weights); sync(); });
    sliders[d[0]] = [i, out];
    return h("div", { class: "slider" }, h("label", null, d[1], out), i);
  }));

  function syncRows() { Object.values(rows).forEach(r => r.row.classList.toggle("is-pick", picked && r.a.id === picked.id)); }
  function sync() {
    Object.keys(sliders).forEach(k => { sliders[k][0].value = S.weights[k]; sliders[k][1].textContent = S.weights[k] + " times"; });
    let active = null;
    Object.keys(prioBtns).forEach(k => {
      const on = Object.keys(PRESETS[k].w).every(x => PRESETS[k].w[x] === S.weights[x]);
      prioBtns[k].classList.toggle("is-on", on);
      if (on) active = k;
    });
    prioNote.textContent = active === "balanced" ? "Points in each row add up to the score." : "Points show the base score. The total applies the priority you picked.";
    const ranked = outbound.map(a => ({ a, s: score(a) })).sort((x, y) => y.s.total - x.s.total || (y.a.rev || 0) - (x.a.rev || 0));
    ranked.forEach((r, i) => {
      const e = rows[r.a.id], c = r.s.c;
      e.row.style.transform = "translateY(" + Math.min(i, TOP) * ROW + "px)";
      e.row.style.opacity = i < TOP ? 1 : 0;
      e.row.tabIndex = i < TOP ? 0 : -1;
      e.rk.textContent = i + 1;
      [c.size, c.labor, c.prox, c.scope, c.sig + c.neg].forEach((v, j) => { e.cells[j].textContent = v; });
      e.sc.textContent = r.s.total;
      e.fill.style.width = r.s.total + "%";
    });
    if (!picked) drawExample(ranked[0].a);
    syncRows();
  }

  labSec.body.append(exTitle, ex,
    h("h3", { class: "sub-h" }, "The top " + TOP + " today"),
    howto("Each row is one contractor. Click a row to see its score worked out above."),
    h("div", { class: "lb card rv" },
      h("div", { class: "lb-h" }, h("span", null, "Rank"), h("span", null, "Contractor"), ["Size", "Labor", "Distance", "Scope", "Signals"].map((t, i) => h("span", { class: "lb-n" }, t, h("small", null, "out of " + [15, 15, 10, 10, 50][i]))), h("span", null, "Score", h("small", null, "out of 100"))),
      body),
    h("h3", { class: "sub-h" }, "What if Origin's priority changes?"),
    howto("Pick a priority and the ranking above re-sorts itself."),
    prio, prioNote,
    h("div", { style: "margin-top:12px" }, collapse("Fine-tune the weights yourself", sl)));

  /* committee */
  const cm = sec("Who is in the room", "Nine people touch the decision. Two matter most: ops champions it, the finishing super can veto it.", { cls: "is-white" });
  cm.body.append(h("div", { class: "roles rv" }, G.icp.committee.map(c => h("div", { class: "role" + (c.tag ? " is-key" : "") },
    h("h4", null, c.r, c.tag ? h("span", { class: "tag is-orange" }, c.tag) : null),
    h("p", null, h("b", null, "Cares about: "), c.care),
    h("p", null, h("b", null, "Worries about: "), c.fear),
    h("p", null, h("b", null, "How to win them: "), c.win)))));

  root.append(head, chain, nar, tierSec, labSec, cm,
    nextLink("#/veterans", "who already tried robots", "Sell to the wall and ceiling sub. Win the ops leader and the finishing super. Work the list from the highest score down."));
  sync();
}
