/* Any trade: the proposal. The same engine, pointed at the next line of work. */
import { h, put, band, sec, usd2, num, money, list } from "../ui.js";
import { G, R, S, STATES } from "../core.js";
import { tileGrid } from "./markets.js";
import { refs } from "../shared.js";

export default function next(root) {
  const L = S.live, T = (L && L.wages && L.wages.trades) || {};
  let cur = "finishing";

  const head = band({
    no: "07", label: "Any trade", title: "One engine. Any trade.",
    answer: h("span", null, "Origin's robot is built to change tools. ", h("strong", null, "This engine is built the same way."), " Four inputs change. Everything else carries over."),
    kpis: [
      { l: "Live today", v: "1", s: "Drywall finishing" },
      { l: "Trades Origin has named", v: "4", s: "Taping, installation, drilling, conduit" },
      { l: "Inputs that change", v: "4 of 8", s: "For each new trade", hot: true },
      { l: "Workers in these trades", v: (() => { const j = Object.values(T).reduce((t, x) => t + (x.jobs || 0), 0); return j ? (j / 1e6).toFixed(1) + "M" : "—"; })(), s: "BLS employment, US" }
    ]
  });

  const tabs = h("div", { class: "tradeg", role: "tablist", "aria-label": "Trades" });
  const detail = h("div", { class: "mapwrap rv", style: "margin-top:14px" });
  const tSec = sec("Pick a trade", "Each tile is a state and its median hourly wage for that trade. Orange is above the US median.", { cls: "is-dark" });
  tSec.body.append(tabs, detail);

  const classFor = st => {
    const t = T[cur]; const w = t && t.states && t.states[st];
    if (!w) return "is-none";
    const x = w / (t.national || w);
    return x < 1 ? "is-below" : x < 1.15 ? "is-a1" : x < 1.35 ? "is-a2" : "is-a3";
  };
  const grid = tileGrid(() => {}, classFor, st => { const t = T[cur]; const w = t && t.states && t.states[st]; return w ? "$" + Math.round(w) : ""; });
  const side = h("div", { class: "card is-dark" });
  detail.append(h("div", { class: "card is-dark" }, grid,
    h("div", { class: "legend" },
      h("span", null, h("i", { style: "background:#fd583a" }), "35%+ over US median"),
      h("span", null, h("i", { style: "background:#c44a31" }), "15 to 35% over"),
      h("span", null, h("i", { style: "background:#8e3a29" }), "Just over"),
      h("span", null, h("i", { style: "background:#3a3a36" }), "Below median"),
      h("span", null, h("i", { style: "background:repeating-linear-gradient(135deg,#1a1a18 0 3px,#333 3px 6px)" }), "No estimate"))), side);

  function draw() {
    put(tabs, R.trades.map(t => {
      const b = h("button", { class: "trade" + (t.id === cur ? " is-on" : ""), type: "button", role: "tab", "aria-selected": String(t.id === cur) }, h("small", null, t.status), h("h4", null, t.n));
      b.addEventListener("click", () => { cur = t.id; draw(); });
      return b;
    }));
    grid.update(null);
    const d = R.trades.find(t => t.id === cur), w = T[cur] || {};
    const top = Object.entries(w.states || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
    put(side,
      h("p", { class: "card-t" }, d.occ + " · SOC " + d.soc),
      h("div", { class: "big" }, w.national ? h("span", null, usd2(w.national), h("small", null, " an hour")) : "—"),
      h("p", { class: "fineprint", style: "color:rgba(255,255,255,.6)" }, "US median wage" + (w.jobs ? ". " + num(w.jobs) + " workers nationwide." : "")),
      h("dl", { class: "kv" },
        h("div", null, h("dt", null, "Highest paying states"), h("dd", null, top.map(x => x[0] + " " + usd2(x[1])).join(", "))),
        h("div", null, h("dt", null, "Buyer"), h("dd", null, d.buyer)),
        h("div", null, h("dt", null, "Target list"), h("dd", null, d.list)),
        h("div", null, h("dt", null, "Robot trail"), h("dd", null, d.robots)),
        h("div", null, h("dt", null, "Show"), h("dd", null, d.show))),
      h("p", { class: "fineprint", style: "color:rgba(255,255,255,.75);margin-top:12px" }, d.note));
  }

  const knobs = sec("What changes, what carries over", "Adding a trade is a config change, not a rebuild.", { cls: "is-white" });
  const swap = R.tradeKnobs.filter(k => k[2] === "swap"), keep = R.tradeKnobs.filter(k => k[2] === "keep");
  knobs.body.append(h("div", { class: "knobs rv" },
    h("div", null, h("div", { class: "knob-h" }, "Changes per trade"), swap.map(k => h("div", { class: "knob" }, h("b", null, k[0]), h("span", null, k[1])))),
    h("div", null, h("div", { class: "knob-h is-keep" }, "Carries over"), keep.map(k => h("div", { class: "knob" }, h("b", null, k[0]), h("span", null, k[1]))))),
    h("p", { class: "fineprint", style: "margin-top:14px" }, "Origin has said taping, drywall installation, drilling and conduit come next. ", refs(["s5"]), " Rows marked to research are hypotheses until the trail is run."));

  const plan = sec("The first 30 days", "If we start now.");
  plan.body.append(h("div", { class: "weeks rv" }, G.plan30.map(w => h("div", { class: "week" }, h("h4", null, w.w), h("small", null, w.d), list(w.items)))));

  const ask = h("section", { class: "sec is-dark" }, h("div", { class: "wrap" },
    h("p", { class: "sec-eye" }, "The proposal"),
    h("header", { class: "sec-head" }, h("h2", null, "Run this for every trade you enter"), h("p", { class: "sec-lede" }, "Same daily engine, same reasoning, one more line of work each time.")),
    h("div", { class: "toolbar" }, h("a", { class: "pill", href: "#/prospects" }, "Work the drywall list →"), h("a", { class: "pill is-ghost", href: "#/library" }, "Open the playbook"))));

  root.append(head, tSec, knobs, plan, ask);
  draw();
}
