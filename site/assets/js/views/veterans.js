/* Veterans: how we found the contractors that have already put a robot on a job. */
import { h, s, $$, put, band, sec, steps, collapse, table } from "../ui.js";
import { G, R, S } from "../core.js";
import { refs, nextLink, feedItem } from "../shared.js";

export default function veterans(root) {
  const L = S.live;
  const seen = new Map();
  R.vetLinks.forEach(l => { const k = l.n; if (!seen.has(k)) seen.set(k, { n: l.n, acct: l.acct, gc: l.gc, links: [] }); seen.get(k).links.push(l); });
  const people = [...seen.values()];
  const subs = people.filter(p => !p.gc), gcs = people.filter(p => p.gc);

  const head = band({
    no: "03", label: "Robot veterans", title: "Who has already put a robot on a job?",
    answer: h("span", null, "We started from the vendors, not the contractors. Then asked one question: ", h("strong", null, "are they free to run another?")),
    kpis: [
      { l: "Robot programs traced", v: String(R.vendors.length) },
      { l: "Subs with robot history", v: String(subs.length), s: "Each one sourced" },
      { l: "GCs with robot history", v: String(gcs.length), s: "They pull work through" },
      { l: "Between programs", v: String(R.vetLinks.filter(l => l.v === "canvas" && !l.gc).length), s: "Canvas partners since the JLG deal", hot: true }
    ]
  });

  const how = sec("How we found them", null, { cls: "is-white" });
  how.body.append(steps(R.vetPaths));

  /* graph */
  const svg = s("svg", { class: "graph-svg", "aria-hidden": "true" });
  const vEls = {}, pEls = {};
  const vend = h("div", { class: "gvend" }, R.vendors.map(v => {
    const b = h("button", { class: "gv", type: "button" }, h("h4", null, v.n), h("p", null, v.kind + ". " + v.state + "."), h("p", { class: "gv-r" }, v.read));
    b.addEventListener("mouseenter", () => focus(v.id));
    b.addEventListener("focus", () => focus(v.id));
    b.addEventListener("mouseleave", () => focus(null));
    b.addEventListener("blur", () => focus(null));
    vEls[v.id] = b;
    return b;
  }));
  const row = p => {
    const e = h(p.acct ? "a" : "div", { class: "gc", href: p.acct ? "#/prospects?tier=" + (G.accounts.find(a => a.id === p.acct) || {}).tier : null },
      h("span", null, p.n, h("small", null, p.links.map(l => l.role).join(". "))), refs([...new Set(p.links.flatMap(l => l.src))].slice(0, 2)));
    pEls[p.n] = e;
    return e;
  };
  const right = h("div", { class: "gcol" },
    h("p", { class: "card-t", style: "margin:0 0 4px" }, "Subcontractors"), subs.map(row),
    h("p", { class: "card-t", style: "margin:12px 0 4px" }, "General contractors"), gcs.map(row));
  const graph = h("div", { class: "graph rv" }, svg, h("div", { class: "graph-grid" }, vend, right));
  const gSec = sec("The trail", "Hover a program to see who ran it.", { cls: "is-dark" });
  gSec.body.append(graph);

  let lines = [];
  function draw() {
    if (getComputedStyle(svg).display === "none") return;
    const b = graph.getBoundingClientRect();
    const rel = e => { const r = e.getBoundingClientRect(); return { l: r.left - b.left, r: r.right - b.left, m: r.top - b.top + r.height / 2 }; };
    lines = R.vetLinks.map(l => {
      const a = rel(vEls[l.v]), c = rel(pEls[l.n]), mx = (a.r + c.l) / 2;
      return { l, el: s("path", { class: "gline", d: `M${a.r} ${a.m}C${mx} ${a.m} ${mx} ${c.m} ${c.l} ${c.m}` }) };
    });
    put(svg, lines.map(x => x.el));
  }
  function focus(id) {
    lines.forEach(x => { x.el.classList.toggle("is-on", x.l.v === id); x.el.classList.toggle("is-dim", !!id && x.l.v !== id); });
    Object.keys(vEls).forEach(k => { vEls[k].classList.toggle("is-on", k === id); vEls[k].classList.toggle("is-dim", !!id && k !== id); });
    people.forEach(p => { pEls[p.n].classList.toggle("is-dim", !!id && !p.links.some(l => l.v === id)); });
  }

  /* timeline */
  const tl = sec("Why the timing is now", "Two moves in 2026 reset the field.");
  tl.body.append(h("ol", { class: "tl rv" }, R.timeline.map(t => h("li", { class: t.origin ? "is-origin" : t.key ? "is-key" : "" }, h("b", null, t.y), h("span", null, t.t, " ", refs([t.src]))))));

  /* lessons */
  const ls = sec("What the last wave taught", "Buyers carry these into every conversation.", { cls: "is-white" });
  ls.body.append(h("div", { class: "grid4 rv" }, G.failures.map(f => h("div", { class: "card lesson" }, h("h3", null, f.h), h("p", null, f.t, " ", refs(f.src))))),
    h("div", { style: "margin-top:26px" }, collapse("Compare every robot on the field",
      table([{ t: "Company" }, { t: "Approach" }, { t: "Tasks" }, { t: "Reach" }, { t: "Go-to-market" }, { t: "Status" }, { t: "Ref" }],
        G.competitors.map(c => [h("strong", { style: "font-weight:600" }, c.n), [c.how, h("div", { class: "fineprint" }, c.hq)], c.tasks, c.reach, c.gtm, c.status, refs(c.src)]), { cls: "tbl-wide", caption: "Competitors" })),
    collapse("GCs that pull work through", table([{ t: "GC" }, { t: "Robot history" }, { t: "Why they matter" }, { t: "Angle" }, { t: "Ref" }],
      G.gcs.map(g => [[h("strong", { style: "font-weight:600" }, g.n), h("div", { class: "fineprint" }, g.c)], g.hist, g.why, g.ang, refs(g.src)]), { cls: "tbl-wide", caption: "GC influencers" }))));

  /* live */
  const robotNews = L ? L.signals.filter(x => x.kind === "robot" || x.kind === "layout").slice(0, 5) : [];
  const liveSec = robotNews.length ? sec("Watching the trail daily", "Every case study names a contractor that now understands robots.") : null;
  if (liveSec) liveSec.body.append(h("div", { class: "feed on-paper rv" }, robotNews.map(x => feedItem(x, L.runDay))));

  root.append(head, how, gSec, tl, ls);
  if (liveSec) root.append(liveSec);
  root.append(nextLink("#/signals", "what fires today"));
  requestAnimationFrame(draw);
  const ro = new ResizeObserver(draw);
  ro.observe(graph);
  return () => ro.disconnect();
}
