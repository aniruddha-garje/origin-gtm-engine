/* Events: why every show is on the calendar, and what it costs. */
import { h, s, $$, put, band, sec, steps, collapse, field, table, store, usd, frange, fdate, fshort, daysTo, dueText, pd, MONTHS } from "../ui.js";
import { G, R, S, evCost, evState, evTotals, allDeadlines } from "../core.js";
import { refs, nextLink } from "../shared.js";

const small = d => { d.classList.add("is-sm"); return d; };
const lensOf = e => R.lenses.find(l => l.id === R.eventLens[e.id]) || R.lenses[5];

export default function events(root) {
  const L = S.live;
  const head0 = evTotals();
  const top = G.events.find(e => e.top);
  const upcoming = allDeadlines().filter(d => d.date && daysTo(d.date) >= 0);
  const kCommitted = h("dd", null, usd(head0.committed));
  const kCond = h("dd", null, usd(head0.cond));
  const head = h("section", { class: "band" }, h("div", { class: "wrap" },
    h("p", { class: "eyebrow" }, h("span", { class: "eyebrow-n" }, "05"), "Events"),
    h("h1", { tabindex: "-1" }, "Where do we show up, and why?"),
    h("p", { class: "answer" }, h("strong", null, "One booth matters. "), "Everywhere else, walk, speak or apply."),
    h("dl", { class: "kpis" },
      h("div", { class: "kpi" }, h("dt", null, "Shows reviewed"), h("dd", null, String(G.events.length)), h("span", { class: "kpi-s" }, "Nov 2026 to Sep 2027")),
      h("div", { class: "kpi" }, h("dt", null, "Committed plan"), kCommitted, h("span", { class: "kpi-s" }, head0.n + " events")),
      h("div", { class: "kpi" }, h("dt", null, "Conditional"), kCond, h("span", { class: "kpi-s" }, "Paper accepted, Saudi pilot converts")),
      h("div", { class: "kpi is-hot" }, h("dt", null, "The one booth"), h("dd", null, daysTo(top.start) + " days"), h("span", { class: "kpi-s" }, top.n.replace(" Convention & Expo", "") + ", Grapevine TX")))));

  const how = sec("How we found them", null, { cls: "is-white" });
  how.body.append(steps(R.eventPaths));

  /* timeline */
  const tip = h("div", { class: "tip", role: "status" });
  const tlBox = h("div", { class: "evtl" });
  const tlSec = sec("The year on one line", "Rows are the reason. Size is the spend.", { cls: "is-dark" });
  tlSec.body.append(h("div", { class: "card is-dark rv" }, tlBox,
    h("div", { class: "legend" },
      h("span", null, h("i", { style: "background:#fd583a;border-radius:50%" }), "Booth"),
      h("span", null, h("i", { style: "background:#fff;border-radius:50%" }), "Walk or speak"),
      h("span", null, h("i", { style: "background:transparent;border:1.5px solid rgba(255,255,255,.6);border-radius:50%" }), "Monitor or submit"),
      h("span", null, "× Skip"))));
  function drawTimeline() {
    const lanes = R.lenses;
    const start = new Date(2026, 10, 1), end = new Date(2027, 9, 1);
    const W = Math.max(860, tlBox.clientWidth), left = 190, right = 20, top0 = 30, rowH = 44;
    const H = top0 + lanes.length * rowH + 10;
    const x = d => left + (d - start) / (end - start) * (W - left - right);
    const out = s("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": "Timeline of events from November 2026 to September 2027, grouped by the reason each is on the calendar." });
    for (let m = 0; m < 11; m++) {
      const d = new Date(2026, 10 + m, 1);
      out.append(s("line", { x1: x(d), x2: x(d), y1: top0 - 8, y2: H - 8, class: "evt-row", "stroke-dasharray": "2 4" }));
      out.append(s("text", { x: x(d) + 4, y: 14, class: "evt-mon" }, MONTHS[d.getMonth()] + (d.getMonth() === 0 ? " 27" : "")));
    }
    lanes.forEach((l, i) => {
      const y = top0 + i * rowH + rowH / 2;
      out.append(s("line", { x1: left, x2: W - right, y1: y, y2: y, class: "evt-row" }));
      out.append(s("text", { x: 0, y: y + 4, class: "evt-lab" }, l.n));
    });
    const now = new Date();
    if (now > start && now < end) out.append(s("line", { x1: x(now), x2: x(now), y1: top0 - 8, y2: H - 8, stroke: "#fd583a", "stroke-width": 1.5 }));
    G.events.filter(e => e.start).forEach(e => {
      const st = evState(e), c = evCost(e);
      const i = lanes.findIndex(l => l.id === R.eventLens[e.id]);
      const y = top0 + Math.max(0, i) * rowH + rowH / 2, cx = x(pd(e.start));
      const r = c.total ? Math.min(17, 5 + Math.sqrt(c.total) / 12) : 5;
      const booth = st.mode === "exhibit_robot" || st.mode === "exhibit_light";
      const go = st.mode === "walk" || st.mode === "speak";
      let m;
      if (st.mode === "skip") m = s("text", { x: cx, y: y + 5, "text-anchor": "middle", fill: "rgba(255,255,255,.6)", "font-size": "15", class: "evt-mark" }, "×");
      else m = s("circle", { cx, cy: y, r, class: "evt-mark", fill: booth ? "#fd583a" : go ? "#fff" : "transparent", stroke: booth ? "#fd583a" : "rgba(255,255,255,.7)", "stroke-width": 1.5 });
      m.setAttribute("tabindex", "0");
      m.setAttribute("aria-label", e.n);
      const show = ev => {
        put(tip, h("b", null, e.n), h("span", null, frange(e.start, e.end)), h("span", null, G.modes[st.mode] + (c.total ? ", " + usd(c.total) : "")), h("span", null, e.why));
        tip.style.display = "block";
        const b = (ev.target).getBoundingClientRect();
        tip.style.left = Math.min(window.innerWidth - 296, Math.max(8, b.left - 120)) + "px";
        tip.style.top = (b.top > 200 ? b.top - tip.offsetHeight - 10 : b.bottom + 10) + "px";
      };
      m.addEventListener("mouseenter", show); m.addEventListener("focus", show);
      m.addEventListener("mouseleave", () => { tip.style.display = "none"; }); m.addEventListener("blur", () => { tip.style.display = "none"; });
      m.addEventListener("click", () => { const c2 = document.getElementById("ev-" + e.id); if (c2) c2.scrollIntoView({ behavior: "smooth", block: "center" }); });
      out.append(m);
      if (e.top) out.append(s("text", { x: cx + r + 6, y: y + 4, class: "evt-name" }, "BUILD27"));
    });
    put(tlBox, out);
  }

  /* ladder */
  const ladSec = sec("Buyer fit decides the spend", "The closer the buyer, the more we bring.");
  ladSec.body.append(h("div", { class: "ladder rv" }, R.fitLadder.map(l => {
    const names = G.events.filter(e => e.fit === l.fit).map(e => e.n.replace(" Convention & Expo", "").replace(" Annual Meeting", ""));
    return h("div", { class: "lad" },
      h("div", { class: "lad-f", role: "img", "aria-label": "Fit " + l.fit + " of 5" }, [1, 2, 3, 4, 5].map(i => h("i", { class: i <= l.fit ? "is-on" : "" }))),
      h("b", null, l.rule),
      h("span", null, names.length ? names.join(", ") : "None"));
  })));

  /* deadlines + spend */
  const spend = h("div", { class: "qbars" });
  const dlSec = sec("Money and clocks", null, { cls: "is-dark" });
  dlSec.body.append(h("div", { class: "grid2 rv" },
    h("div", { class: "card is-dark" }, h("p", { class: "card-t" }, "Next deadlines"),
      upcoming.slice(0, 6).map(d => h("div", { class: "dl" }, h("b", null, dueText(d.date).replace(" days", "d")), h("span", null, d.what), h("small", null, fdate(d.date))))),
    h("div", { class: "card is-dark" }, h("p", { class: "card-t" }, "Spend by quarter"), spend,
      h("p", { class: "fineprint", style: "color:rgba(255,255,255,.6);margin-top:14px" }, "Planning numbers, not quotes. Change a plan below and this updates."))));
  function drawSpend() {
    const t = evTotals();
    const qs = Object.keys(t.q).filter(k => k !== "TBD").sort((a, b) => { const x = a.split(" "), y = b.split(" "); return (+x[1] - +y[1]) || (x[0] < y[0] ? -1 : 1); });
    const max = Math.max(...qs.map(q => t.q[q].c + t.q[q].k), 1);
    put(spend, qs.map(q => h("div", { class: "qb" }, h("span", null, q),
      h("span", { class: "qb-t" }, t.q[q].c ? h("i", { style: "width:" + t.q[q].c / max * 100 + "%" }) : null, t.q[q].k ? h("i", { class: "is-c", style: "width:" + t.q[q].k / max * 100 + "%" }) : null),
      h("span", { style: "text-align:right;font-variant-numeric:tabular-nums" }, usd(t.q[q].c + t.q[q].k)))));
    kCommitted.textContent = usd(t.committed);
    kCond.textContent = usd(t.cond);
  }

  /* cards */
  const cardsSec = sec("Every show, with its reason", "Change a plan or headcount. Totals recalculate.");
  let lens = "all";
  const filter = h("div", { class: "seg", style: "margin-bottom:14px" });
  const list = h("div", { class: "evcards" });
  const resetPlan = h("button", { class: "btn", type: "button" }, "Reset plan");
  resetPlan.addEventListener("click", () => { S.ev = {}; store.del("ev"); drawCards(); drawSpend(); drawTimeline(); });
  cardsSec.body.append(h("div", { class: "toolbar spread" }, filter, resetPlan), list);
  function card(e) {
    const st = evState(e), l = lensOf(e), w = L && L.events && L.events[e.id];
    const sel = h("select", { "aria-label": "Plan for " + e.n }, Object.keys(G.modes).filter(m => m !== "apply").map(m => h("option", { value: m }, G.modes[m])));
    sel.value = st.mode;
    const ppl = h("input", { type: "number", min: "0", max: "12", step: "1", value: st.people, "aria-label": "People going to " + e.n });
    const cost = h("div", { class: "evc-cost" });
    function save() {
      const o = {};
      if (sel.value !== e.mode) o.mode = sel.value;
      const p = parseInt(ppl.value, 10);
      if (!isNaN(p) && p !== e.people) o.people = Math.max(0, p);
      if (Object.keys(o).length) S.ev[e.id] = o; else delete S.ev[e.id];
      store.set("ev", S.ev);
      drawCost(); drawSpend(); drawTimeline();
    }
    sel.addEventListener("change", save); ppl.addEventListener("input", save);
    function drawCost() {
      const c = evCost(e);
      put(cost, c.total ? usd(c.total) : "No spend", h("small", null, e.cond ? "Conditional" : c.total ? c.people + (c.people === 1 ? " person" : " people") : c.mode === "skip" ? "Skip" : "Track only"));
    }
    drawCost();
    const watch = w ? (w.changedAt ? h("span", { class: "tag is-warn" }, "Page changed " + fshort(w.changedAt)) : w.ok ? h("span", { class: "tag is-ok" }, "Page checked today") : w.blocked ? h("span", { class: "tag" }, "Page blocks readers") : null) : null;
    return h("article", { class: "evc" + (e.top ? " is-top" : "") + (st.mode === "skip" ? " is-skip" : ""), id: "ev-" + e.id },
      h("div", { class: "evc-d" }, h("b", null, frange(e.start, e.end)), h("span", null, e.city), e.start && daysTo(e.start) >= 0 ? h("span", null, "In " + daysTo(e.start) + " days") : null, e.dateNote ? h("span", null, e.dateNote) : null),
      h("div", null,
        h("h4", null, e.n, e.top ? h("span", { class: "tag is-orange" }, "Top priority") : null),
        h("p", { class: "evc-why" }, e.why),
        h("div", { class: "evc-m" },
          h("span", { class: "chip is-lead" }, l.n),
          h("span", { class: "lad-f", role: "img", "aria-label": "Buyer fit " + e.fit + " of 5", title: "Buyer fit " + e.fit + " of 5" }, [1, 2, 3, 4, 5].map(i => h("i", { class: i <= e.fit ? "is-on" : "" }))),
          watch),
        small(collapse("Audience and cost basis", h("div", { class: "fineprint" }, h("p", null, e.aud), h("p", { style: "margin-top:4px" }, e.cost, " ", refs(e.src)), (e.dl || []).map(d => h("p", { style: "margin-top:4px" }, h("strong", null, d[0] ? fdate(d[0]) : "Now"), ": " + d[1])))))),
      h("div", { class: "evc-plan" }, cost, h("div", { class: "row2", style: "margin:0;grid-template-columns:1fr 62px" }, sel, ppl)));
  }
  function drawCards() {
    put(filter, [["all", "All"], ...R.lenses.map(l => [l.id, l.n])].map(o => {
      const b = h("button", { class: "btn" + (lens === o[0] ? " is-on" : ""), type: "button" }, o[1]);
      b.addEventListener("click", () => { lens = o[0]; drawCards(); });
      return b;
    }));
    const evs = G.events.filter(e => lens === "all" || R.eventLens[e.id] === lens);
    put(list, evs.map(card));
  }

  /* awards and the rest */
  const rest = sec("Awards and later", null, { cls: "is-white" });
  const C = S.costs;
  function costInput(label, get, set) {
    const i = h("input", { type: "number", min: "0", step: "50", value: get() });
    i.addEventListener("input", () => { const v = parseFloat(i.value); if (!isNaN(v) && v >= 0) { set(v); store.set("costs", S.costs); drawCards(); drawSpend(); drawTimeline(); } });
    return field(label, i);
  }
  rest.body.append(
    collapse("Awards: cheap credibility", table([{ t: "Award" }, { t: "Deadline" }, { t: "When" }, { t: "Plan" }, { t: "Why" }, { t: "Ref" }],
      G.awards.map(a => [h("strong", { style: "font-weight:600" }, a.n), a.deadline ? fdate(a.deadline) + (a.deadlineNote ? "*" : "") : "To confirm", a.deadline ? dueText(a.deadline) : "", G.modes[a.mode], [a.why, a.deadlineNote ? h("div", { class: "fineprint" }, "* " + a.deadlineNote) : null], refs(a.src)]), { cls: "tbl-wide", caption: "Awards" }), true),
    collapse("On the radar for 2028", table([{ t: "Event" }, { t: "When and why" }, { t: "Ref" }], G.later.map(l => [h("strong", { style: "font-weight:600" }, l[0]), l[1], refs([l[2]])]), { caption: "Later events" })),
    collapse("Cost assumptions", h("div", null, h("div", { class: "grid4" },
      costInput("Travel per person, US ($)", () => C.travel.us, v => { C.travel.us = v; }),
      costInput("Travel, Europe or Asia ($)", () => C.travel.intl, v => { C.travel.intl = v; }),
      costInput("Travel, Gulf from Bengaluru ($)", () => C.travel.gulf, v => { C.travel.gulf = v; }),
      costInput("Local travel per person ($)", () => C.travel.local, v => { C.travel.local = v; }),
      costInput("Booth build, working wall ($)", () => C.build, v => { C.build = v; }),
      costInput("Show services ($)", () => C.services, v => { C.services = v; }),
      costInput("Robot freight, US ($)", () => C.freightUS, v => { C.freightUS = v; }),
      costInput("Robot freight, international ($)", () => C.freightIntl, v => { C.freightIntl = v; }),
      costInput("Drayage and handling ($)", () => C.drayage, v => { C.drayage = v; }),
      costInput("Collateral ($)", () => C.collateral, v => { C.collateral = v; }),
      costInput("Light booth build ($)", () => C.lightBuild, v => { C.lightBuild = v; }),
      costInput("Light booth services ($)", () => C.lightServices, v => { C.lightServices = v; })),
      h("p", { class: "fineprint", style: "margin-top:10px" }, "Currency conversions use about $1.10 per euro and ₹88 per dollar."))));

  root.append(head, how, tlSec, ladSec, dlSec, cardsSec, rest, nextLink("#/prospects", "work the list"), tip);
  drawCards(); drawSpend();
  requestAnimationFrame(drawTimeline);
  const onR = () => drawTimeline();
  window.addEventListener("resize", onR);
  return () => window.removeEventListener("resize", onR);
}
