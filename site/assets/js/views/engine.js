/* Home: the engine at a glance. */
import { h, s, $$, put, money, usd2 } from "../ui.js";
import { G, S, OUTBOUND_TIERS, TIER_SHORT, WAGE, reasonsFor, roiNow, evTotals, score } from "../core.js";
import { feedItem, runStamp } from "../shared.js";

/* Every bright dot is one real contractor. Grey dots are the wider market that the filters drop. */
function heroCanvas(cv, accts) {
  const ctx = cv.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LANE = { t1: -1.5, vet: -0.5, t2: 0.5, t3: 1.5 };
  const NEAR = 0.86, FAR = 13, GATE = 4.4;
  let W = 0, H = 0, D = 1, cx = 0, hz = 0, c = 0, k = 0, raf = 0, last = 0, on = true;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const nodes = accts.map(a => ({ lane: LANE[a.tier], tier: a.tier, x0: rnd(-4.2, 4.2), z: rnd(NEAR, FAR), sp: rnd(0.34, 0.46), r: 0.8 + Math.min(1.3, Math.sqrt(a.rev || 30) / 18) }));
  const noise = Array.from({ length: 130 }, () => ({ x0: rnd(-5.5, 5.5), z: rnd(GATE, FAR + 4), sp: rnd(0.3, 0.5) }));

  function sprite(rgb) {
    const c2 = document.createElement("canvas"); c2.width = c2.height = 64;
    const g = c2.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(0.18, `rgba(${rgb},.9)`); r.addColorStop(0.42, `rgba(${rgb},.22)`); r.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return c2;
  }
  const hot = sprite("253,88,58"), cold = sprite("236,232,226");
  const sm = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const X = (x, z) => cx + x * k / z;
  const Y = z => hz + c / z;

  function size() {
    const r = cv.getBoundingClientRect();
    D = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * D); cv.height = Math.round(H * D);
    ctx.setTransform(D, 0, 0, D, 0, 0);
    const narrow = W < 760;
    cx = narrow ? W * 0.5 : W * 0.71;
    hz = H * (narrow ? 0.2 : 0.3);
    c = (H - hz) * NEAR * 1.02;
    k = W * (narrow ? 0.3 : 0.152);
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.1, -H * 0.08, 0, W * 0.1, -H * 0.08, Math.max(W, H) * 0.86);
    g.addColorStop(0, "rgba(253,88,58,.42)"); g.addColorStop(0.45, "rgba(150,48,28,.16)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    /* ground grid, drawn like Origin's simulation floor */
    ctx.lineWidth = 1;
    const shift = (t / 1000 * 0.42) % 0.7;
    for (let z = NEAR + 0.7 - shift; z < FAR; z += 0.7) {
      ctx.strokeStyle = `rgba(255,190,170,${clamp(0.16 - z * 0.011, 0.015, 0.16)})`;
      ctx.beginPath(); ctx.moveTo(0, Y(z)); ctx.lineTo(W, Y(z)); ctx.stroke();
    }
    for (let x = -9; x <= 9; x += 0.5) {
      ctx.strokeStyle = "rgba(255,190,170,.06)";
      ctx.beginPath(); ctx.moveTo(X(x, FAR), Y(FAR)); ctx.lineTo(X(x, 0.42), Y(0.42)); ctx.stroke();
    }

    /* lanes after the gate */
    Object.values(LANE).forEach(l => {
      const lg = ctx.createLinearGradient(0, Y(GATE), 0, H);
      lg.addColorStop(0, "rgba(253,88,58,.04)"); lg.addColorStop(1, "rgba(253,88,58,.3)");
      ctx.strokeStyle = lg; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(X(l, GATE), Y(GATE)); ctx.lineTo(X(l, 0.6), Y(0.6)); ctx.stroke();
    });

    /* the gate */
    const gy = Y(GATE), gx0 = X(-2.6, GATE), gx1 = X(2.6, GATE);
    const gg = ctx.createLinearGradient(gx0, 0, gx1, 0);
    gg.addColorStop(0, "rgba(253,88,58,0)"); gg.addColorStop(0.5, "rgba(253,88,58,.95)"); gg.addColorStop(1, "rgba(253,88,58,0)");
    ctx.strokeStyle = gg; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();
    ctx.font = "500 10.5px 'Kode Mono', monospace"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.fillText("SCORE", X(0, GATE), gy - 9);

    /* wider market: fades out at the gate */
    noise.forEach(n => {
      if (!reduce) { n.z -= n.sp * dt * Math.max(0.6, n.z * 0.42); if (n.z < GATE - 0.4) { n.z = FAR + rnd(0, 4); n.x0 = rnd(-5.5, 5.5); } }
      const a = clamp((n.z - GATE) / 1.1, 0, 1) * clamp((FAR + 2 - n.z) / 3, 0, 1);
      if (a <= 0) return;
      const r = 6 / n.z + 1.4;
      ctx.globalAlpha = a * 0.34;
      ctx.drawImage(cold, X(n.x0, n.z) - r, Y(n.z) - r, r * 2, r * 2);
    });

    /* real accounts */
    nodes.forEach(n => {
      if (!reduce) { n.z -= n.sp * dt * Math.max(0.55, n.z * 0.42); if (n.z < NEAR * 0.86) { n.z = FAR; n.x0 = rnd(-4.2, 4.2); } }
      const m = sm(clamp((GATE + 1.3 - n.z) / 2.4, 0, 1));
      const x = n.x0 + (n.lane - n.x0) * m;
      const a = clamp((FAR - n.z) / 2, 0, 1);
      const r = (13 / n.z + 2) * n.r;
      ctx.globalAlpha = a * (0.55 + 0.45 * m);
      ctx.drawImage(m > 0.35 ? hot : cold, X(x, n.z) - r, Y(n.z) - r, r * 2, r * 2);
    });
    ctx.globalAlpha = 1;

    /* lane labels */
    if (W >= 760) {
      const counts = {}; accts.forEach(a => { counts[a.tier] = (counts[a.tier] || 0) + 1; });
      ctx.textAlign = "center"; ctx.font = "500 11px 'Kode Mono', monospace";
      Object.keys(LANE).forEach(id => {
        const x = X(LANE[id], 1.24), y = Y(1.24);
        ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillText(TIER_SHORT[id].toUpperCase(), x, y);
        ctx.fillStyle = "rgba(253,88,58,1)"; ctx.fillText(String(counts[id] || 0), x, y + 15);
      });
    }

    const fade = ctx.createLinearGradient(0, H * 0.55, 0, H);
    fade.addColorStop(0, "rgba(5,5,5,0)"); fade.addColorStop(1, "rgba(5,5,5,.68)");
    ctx.fillStyle = fade; ctx.fillRect(0, 0, W * 0.6, H);
    if (on && !reduce) raf = requestAnimationFrame(frame);
  }

  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (reduce) frame(0); });
  const io = new IntersectionObserver(es => {
    const vis = es[0].isIntersecting;
    if (vis && !on) { on = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    if (!vis) { on = false; cancelAnimationFrame(raf); }
  });
  io.observe(cv);
  const onR = () => { size(); if (reduce) frame(0); };
  window.addEventListener("resize", onR);
  raf = requestAnimationFrame(frame);
  return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", onR); };
}

/* Connectors are measured from the cards, so the drawing survives any screen size. */
function connectors(model, svg) {
  const left = $$(".m-in", model), core = model.querySelector(".mcore"), right = $$(".m-out", model);
  function draw() {
    if (getComputedStyle(svg).display === "none") return;
    const b = model.getBoundingClientRect();
    const rel = e => { const r = e.getBoundingClientRect(); return { l: r.left - b.left, r: r.right - b.left, t: r.top - b.top, m: r.top - b.top + r.height / 2, b: r.bottom - b.top }; };
    const c = rel(core);
    const paths = [];
    left.forEach((e, i) => {
      const a = rel(e), y = c.t + 30 + i * ((c.b - c.t - 60) / Math.max(1, left.length - 1)), mx = (a.r + c.l) / 2;
      paths.push(`M${a.r} ${a.m}C${mx} ${a.m} ${mx} ${y} ${c.l} ${y}`);
    });
    right.forEach((e, i) => {
      const a = rel(e), y = c.t + 40 + i * ((c.b - c.t - 80) / Math.max(1, right.length - 1)), mx = (c.r + a.l) / 2;
      paths.push(`M${c.r} ${y}C${mx} ${y} ${mx} ${a.m} ${a.l} ${a.m}`);
    });
    put(svg, paths.map(d => s("path", { d, fill: "none", stroke: "#bcb9ae", "stroke-width": 1.2 })),
      paths.map((d, i) => s("path", { d, fill: "none", stroke: "#fd583a", "stroke-width": 2.2, "stroke-linecap": "round", class: "flow", style: "animation-delay:-" + (i * 0.47).toFixed(2) + "s" })));
  }
  draw();
  const ro = new ResizeObserver(draw);
  ro.observe(model);
  return () => ro.disconnect();
}

export default function engine(root) {
  const L = S.live, C = (L && L.counts) || {};
  const accts = G.accounts.filter(a => OUTBOUND_TIERS.includes(a.tier));
  const cv = h("canvas", { "aria-hidden": "true" });
  const r = roiNow(), ev = evTotals();
  const statesAbove = G.wages.filter(w => w[2] >= r.beWage).length;

  const hero = h("section", { class: "hero" }, cv,
    h("div", { class: "wrap hero-in" },
      h("h1", null, "A go-to-market engine for the built world"),
      h("p", { class: "hero-sub" }, "Right market. Right reason. Right day."),
      h("div", { class: "hero-row" },
        h("a", { class: "pill", href: "#/markets" }, "Walk the reasoning →"),
        h("p", { class: "hero-note" }, "Every bright dot is a real contractor. Sorted daily."))));

  const status = h("div", { class: "status", role: "status" }, h("div", { class: "status-in" },
    h("span", null, h("i", { class: "live-dot" }), " Last run ", h("b", null, runStamp())),
    h("span", null, h("b", null, (C.sourcesOk || 0) + "/" + (C.sources || 0)), " sources healthy"),
    h("span", null, h("b", null, money(C.projectValue || 0)), " interior work tracked"),
    h("span", null, h("b", null, C.delays || 0), " projects lagging"),
    h("span", null, h("b", null, C.discovered || 0), " new names found")));

  /* the model */
  const fedHits = L && L.federal ? Object.keys(L.federal.matches || {}).length : 0;
  const inputs = [
    ["#/markets", "Wage survey", "BLS, every state", (L && L.wages ? Object.keys(L.wages.states).length : G.wages.length) + " states"],
    ["#/signals", "Permits and filings", "NYC, Chicago, Seattle, Austin, Texas", (C.projects || 0) + " jobs"],
    ["#/signals", "Federal subcontracts", "USAspending", (fedHits + (C.discovered || 0)) + " names"],
    ["#/signals", "News scan", "Delays, robots, data centers", (C.signals || 0) + " items"],
    ["#/events", "Event pages", "Dates, prices, deadlines", G.events.length + " shows"]
  ];
  const counts = {}; accts.forEach(a => { counts[a.tier] = (counts[a.tier] || 0) + 1; });
  const outputs = [["t1", "Tier 1", "Northeast beachhead"], ["vet", "Veterans", "Already ran robots"], ["t2", "Tier 2", "High wage"], ["t3", "Tier 3", "Sun Belt volume"]];
  const svg = s("svg", { class: "model-svg", "aria-hidden": "true" });
  const model = h("div", { class: "model rv" }, svg,
    h("div", { class: "model-grid" },
      h("div", { class: "model-col" }, h("h3", null, "Daily inputs"),
        h("div", { class: "mcards" }, inputs.map(i => h("a", { class: "mcard m-in", href: i[0] }, h("span", null, h("b", null, i[1]), h("small", null, i[2])), h("em", null, i[3]))))),
      h("div", { class: "model-col" }, h("h3", null, "Go-to-market model"),
        h("div", { class: "mcore" },
          h("a", { class: "mstage", href: "#/markets" }, h("div", null, h("h4", null, "Where"), h("p", null, "Choose the market")),
            h("ul", null, h("li", null, "Wage against break-even"), h("li", null, statesAbove + " of " + G.wages.length + " states sell on cost"))),
          h("a", { class: "mstage", href: "#/segments" }, h("div", null, h("h4", null, "Who"), h("p", null, "Choose the buyer")),
            h("ul", null, h("li", null, "Sub, not GC"), h("li", null, "Ops leader is the champion"), h("li", null, "Super holds the veto"))),
          h("a", { class: "mstage", href: "#/signals" }, h("div", null, h("h4", null, "When"), h("p", null, "Choose the moment")),
            h("ul", null, h("li", null, "Robot history"), h("li", null, "Project pressure"), h("li", null, "Events and deadlines"))),
          h("a", { class: "mstage", href: "#/segments" }, h("div", null, h("h4", null, "Score"), h("p", null, "Rank within a tier")),
            h("div", null,
              h("div", { class: "mbars", "aria-hidden": "true" }, [["15", 0], ["15", 0], ["10", 0], ["10", 0], ["50", 1]].map(b => h("span", { class: b[1] ? "is-o" : "", style: "flex:" + b[0] }))),
              h("div", { class: "mlegend" }, h("span", null, "Size 15"), h("span", null, "Labor 15"), h("span", null, "Reach 10"), h("span", null, "Scope 10"), h("span", null, "Signals 50")))))),
      h("div", { class: "model-col" }, h("h3", null, "Four tiers"),
        h("div", { class: "mcards" }, outputs.map(o => h("a", { class: "mcard m-out", href: "#/prospects?tier=" + o[0] }, h("span", null, h("b", null, o[1]), h("small", null, o[2])), h("em", null, counts[o[0]] || 0))),
          h("a", { class: "mcard", href: "#/prospects", style: "background:#101010;color:#fff;border-color:#101010" }, h("span", null, h("b", null, "Personalised outbound"), h("small", { style: "color:rgba(255,255,255,.65)" }, "One reason per name")), h("em", { style: "color:#fd583a" }, "→"))))),
    h("div", { class: "mloop" }, h("h3", null, "Learning loop"),
      h("div", { class: "mloop-track" },
        h("div", null, h("b", null, "Replies"), "Which reason opened the door"),
        h("div", null, h("b", null, "Site walks"), "Which tier converts"),
        h("div", null, h("b", null, "Pilots"), "Real shift logs replace assumptions"),
        h("div", null, h("b", null, "Reweight"), "Scores and plays update"))));

  const sec1 = h("section", { class: "sec" }, h("div", { class: "wrap" },
    h("p", { class: "sec-eye" }, "GTM action model"),
    h("header", { class: "sec-head" }, h("h2", null, "One model, run every day"), h("p", { class: "sec-lede" }, "From public data to a named reason to call. Click any box.")),
    model));

  /* why is a name here */
  const scored = accts.map(a => ({ a, rs: reasonsFor(a, score(a)) }));
  const has = k => scored.filter(x => x.rs.some(r => r.k === k)).length;
  const whys = [
    { k: has("robot"), t: "Tried robots", b: "Know the operating model. Skip the education.", href: "#/veterans", s: "Open the trail" },
    { k: has("wage"), t: "Wage is high", b: "Finisher hours above the US median of " + usd2(G.wageNational) + ".", href: "#/markets", s: "See the map" },
    { k: C.delays || 0, t: "Project lagging", b: "Reported delays in live markets. Recovery needs capacity.", href: "#/signals?kind=delay", s: "See the jobs" },
    { k: C.dataCenters || 0, t: "Data center fit-outs", b: "Long continuous walls on tight schedules, filed this month.", href: "#/signals?kind=dc", s: "See the filings" }
  ];
  const sec2 = h("section", { class: "sec is-white" }, h("div", { class: "wrap" },
    h("p", { class: "sec-eye" }, "The reason test"),
    h("header", { class: "sec-head" }, h("h2", null, "No name without a reason"), h("p", { class: "sec-lede" }, "Every contractor and every event on this site carries the reason it is here.")),
    h("div", { class: "whys rv" }, whys.map(w => h("a", { class: "why", href: w.href },
      h("span", { class: "why-k" }, w.k),
      h("span", null, h("span", { class: "why-t" }, w.t), h("p", { class: "why-b" }, w.b), h("small", null, w.s + " →")))))));

  /* latest */
  const items = L ? L.signals.filter(x => ["delay", "dc", "robot", "layout", "labor"].includes(x.kind)).slice(0, 7) : [];
  const sec3 = h("section", { class: "sec is-dark" }, h("div", { class: "wrap" },
    h("p", { class: "sec-eye" }, "Latest run"),
    h("header", { class: "sec-head" }, h("h2", null, "What the engine saw"), h("p", { class: "sec-lede" }, "Pulled from public sources this morning, sorted by what it means for a finishing contractor.")),
    h("div", { class: "feed rv" }, items.map(x => feedItem(x, L.runDay))),
    h("p", { style: "margin-top:22px" }, h("a", { class: "pill", href: "#/signals" }, "All signals →"))));

  /* the walk */
  const path = [["markets", "Where", "Wages against break-even"], ["segments", "Who", "The buyer and the score"], ["veterans", "Who has tried", "The robot trail"], ["signals", "When", "Live signals"], ["events", "Where to meet", "Every show, with a reason"], ["prospects", "Act", "Four tiers, personalised"], ["next", "Then", "Any trade"]];
  const sec4 = h("section", { class: "sec" }, h("div", { class: "wrap" },
    h("header", { class: "sec-head" }, h("h2", null, "Follow the thinking"), h("p", { class: "sec-lede" }, "Seven stops. " + money(ev.committed) + " event plan. " + accts.length + " prospects ready to work.")),
    h("ol", { class: "method rv", style: "grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px 20px" }, path.map((p, i) => h("li", null,
      h("span", { class: "method-n" }, String(i + 1).padStart(2, "0")),
      h("h3", null, h("a", { href: "#/" + p[0], style: "text-decoration:none" }, p[1] + " →")),
      h("p", null, p[2]))))));

  root.append(hero, status, sec1, sec2, sec3, sec4);
  const stop = heroCanvas(cv, accts);
  const stop2 = connectors(model, svg);
  return () => { stop(); stop2(); };
}
