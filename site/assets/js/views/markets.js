/* Markets: where the robot pays for itself. One page for wages. */
import { h, put, band, sec, steps, collapse, field, table, copyBtn, store, usd, usd2, num, money } from "../ui.js";
import { G, S, STATES, WAGE, roiCalc, roiNow, applyPreset, marketJobs } from "../core.js";
import { refs, nextLink } from "../shared.js";

const TILES = [
  ["AK", 0, 0], ["ME", 0, 10],
  ["VT", 1, 9], ["NH", 1, 10],
  ["WA", 2, 0], ["ID", 2, 1], ["MT", 2, 2], ["ND", 2, 3], ["MN", 2, 4], ["IL", 2, 5], ["WI", 2, 6], ["MI", 2, 7], ["NY", 2, 8], ["RI", 2, 9], ["MA", 2, 10],
  ["OR", 3, 0], ["NV", 3, 1], ["WY", 3, 2], ["SD", 3, 3], ["IA", 3, 4], ["IN", 3, 5], ["OH", 3, 6], ["PA", 3, 7], ["NJ", 3, 8], ["CT", 3, 9],
  ["CA", 4, 0], ["UT", 4, 1], ["CO", 4, 2], ["NE", 4, 3], ["MO", 4, 4], ["KY", 4, 5], ["WV", 4, 6], ["VA", 4, 7], ["MD", 4, 8], ["DE", 4, 9],
  ["AZ", 5, 1], ["NM", 5, 2], ["KS", 5, 3], ["AR", 5, 4], ["TN", 5, 5], ["NC", 5, 6], ["SC", 5, 7], ["DC", 5, 8],
  ["OK", 6, 3], ["LA", 6, 4], ["MS", 6, 5], ["AL", 6, 6], ["GA", 6, 7],
  ["HI", 7, 0], ["TX", 7, 3], ["FL", 7, 8]
];

export function tileGrid(onPick, classFor, labelFor) {
  const grid = h("div", { class: "tilemap", role: "group", "aria-label": "Map of US states" });
  const at = {}; TILES.forEach(t => { at[t[1] + "-" + t[2]] = t[0]; });
  const cells = {};
  for (let r = 0; r < 8; r++) for (let c = 0; c < 11; c++) {
    const st = at[r + "-" + c];
    if (!st) { grid.append(h("div", { class: "tile is-gap", "aria-hidden": "true" })); continue; }
    const b = h("button", { class: "tile", type: "button", "aria-label": STATES[st] }, h("b", null, st), h("span", null, ""));
    b.addEventListener("click", () => onPick(st));
    cells[st] = b; grid.append(b);
  }
  grid.update = sel => Object.keys(cells).forEach(st => {
    cells[st].className = "tile " + classFor(st) + (st === sel ? " is-sel" : "");
    cells[st].lastChild.textContent = labelFor(st);
  });
  return grid;
}

export default function markets(root) {
  const L = S.live;
  let sel = "IL";
  const r0 = roiNow();
  const above = () => { const be = roiNow().beWage; return G.wages.filter(w => w[2] >= be).length; };
  const top = G.wages.slice().sort((a, b) => b[2] - a[2])[0];

  const answer = h("p", { class: "answer" });
  const kBE = h("dd", null, "");
  const head = h("section", { class: "band" }, h("div", { class: "wrap" },
    h("p", { class: "eyebrow" }, h("span", { class: "eyebrow-n" }, "01"), "Markets"),
    h("h1", { tabindex: "-1" }, "Where does the robot pay for itself?"), answer,
    h("dl", { class: "kpis" },
      h("div", { class: "kpi" }, h("dt", null, "US median taper"), h("dd", null, usd2(G.wageNational)), h("span", { class: "kpi-s" }, "BLS, May " + ((L && L.wages && L.wages.year) || 2025))),
      h("div", { class: "kpi" }, h("dt", null, "Highest state"), h("dd", null, usd2(top[2])), h("span", { class: "kpi-s" }, top[1])),
      h("div", { class: "kpi" }, h("dt", null, "NYC federal rate"), h("dd", null, "$84.38"), h("span", { class: "kpi-s" }, "$48.47 base plus $35.91 fringe")),
      h("div", { class: "kpi is-hot" }, h("dt", null, "Break-even wage"), kBE, h("span", { class: "kpi-s" }, "Median wage at 35% burden")))));

  /* map */
  const side = h("div", { class: "card is-dark" });
  const classFor = st => {
    const w = WAGE[st]; if (w === undefined) return "is-none";
    const be = roiNow().beWage, x = w / be;
    if (!isFinite(be) || x < 1) return "is-below";
    return x < 1.2 ? "is-a1" : x < 1.5 ? "is-a2" : "is-a3";
  };
  const grid = tileGrid(st => { sel = st; draw(); }, classFor, st => (WAGE[st] === undefined ? "" : "$" + Math.round(WAGE[st])));

  const sliders = h("div", { class: "sliders" });
  const SL = [["price", "Robot, $ a month", 4000, 24000, 500, v => "$" + num(v)], ["speed", "Speed vs a finisher", 1, 6, 0.5, v => v + "x"], ["ratio", "Robots per operator", 1, 5, 1, v => v + ":1"], ["share", "Share robot takes", 30, 100, 5, v => v + "%"]];
  SL.forEach(d => {
    const out = h("output", null, d[5](S.roi[d[0]]));
    const i = h("input", { type: "range", min: d[2], max: d[3], step: d[4], value: S.roi[d[0]], "aria-label": d[1] });
    i.addEventListener("input", () => { S.roi[d[0]] = parseFloat(i.value); out.textContent = d[5](S.roi[d[0]]); store.set("roi", S.roi); draw(); });
    sliders.append(h("div", { class: "slider" }, h("label", null, d[1], out), i));
  });
  const legend = h("div", { class: "legend" },
    h("span", null, h("i", { style: "background:#fd583a" }), "50%+ over break-even"),
    h("span", null, h("i", { style: "background:#c44a31" }), "20 to 50% over"),
    h("span", null, h("i", { style: "background:#8e3a29" }), "Just over"),
    h("span", null, h("i", { style: "background:#3a3a36" }), "Below: sell capacity"),
    h("span", null, h("i", { style: "background:repeating-linear-gradient(135deg,#1a1a18 0 3px,#333 3px 6px)" }), "No BLS estimate"));

  const mapSec = sec("Move the price. Watch the map.", "Robot pricing is a placeholder. Origin has not published one.", { cls: "is-dark" });
  mapSec.body.append(h("div", { class: "mapwrap rv" }, h("div", { class: "card is-dark" }, grid, legend, sliders), side));

  /* ranked */
  const barsBox = h("div", { class: "bars bars-pad" });
  const tblBox = h("div", { hidden: true });
  const toggle = h("button", { class: "btn", type: "button", "aria-pressed": "false" }, "Show table");
  toggle.addEventListener("click", () => {
    const t = tblBox.hidden; tblBox.hidden = !t; barsBox.hidden = t;
    toggle.textContent = t ? "Show chart" : "Show table"; toggle.setAttribute("aria-pressed", String(t));
  });
  const rankSec = sec("Every state, one benchmark", "Median hourly wage for drywall tapers. Orange clears break-even at a 35% burden.", { cls: "is-white" });
  rankSec.body.append(h("div", { class: "toolbar spread", style: "margin-bottom:8px" }, h("span", { class: "fineprint" }, "* Small BLS sample"), toggle), barsBox, tblBox);

  /* metros */
  const metros = L && L.wages && L.wages.metros ? Object.entries(L.wages.metros).sort((a, b) => b[1] - a[1]) : [];
  const mMax = 90;
  const metroSec = sec("State averages hide the metro", "BLS medians understate union markets. Federal prevailing rates show the real ceiling.");
  metroSec.body.append(h("div", { class: "card rv" }, h("div", { class: "bars" },
    h("div", { class: "bar-r" }, h("span", { class: "bl" }, "NYC federal job"), h("span", { class: "bar-t" }, h("span", { class: "bar-f is-above", style: "width:" + (84.38 / mMax * 100) + "%" })), h("span", { class: "bar-v" }, "$84.38")),
    metros.map(m => h("div", { class: "bar-r" }, h("span", { class: "bl" }, m[0]), h("span", { class: "bar-t" }, h("span", { class: "bar-f", style: "width:" + (m[1] / mMax * 100) + "%" })), h("span", { class: "bar-v" }, usd2(m[1]))))),
    h("p", { class: "fineprint", style: "margin-top:12px" }, "Metro medians from BLS. The NYC figure is the Davis-Bacon rate including fringe. ", refs(["s24"]))));

  /* method */
  const methodSec = sec("How we benchmarked", null, { cls: "is-white" });
  methodSec.body.append(steps([
    ["Go to the primary source", "BLS OEWS, drywall tapers, occupation 47-2082, every state."],
    ["Load the hour", "Add a 35% burden. Use prevailing rates on federal work."],
    ["Find break-even", "Robot and operator cost equal the finisher hours they replace."],
    ["Pick the pitch", "Above the line, sell cost. Below it, sell schedule and capacity."]
  ]),
  h("div", { style: "margin-top:34px" },
    h("p", { class: "card-t" }, "Wage becomes score: labor cost points, out of 15"),
    h("div", { class: "stepband" }, [["4", "Under $24"], ["6", "$24+"], ["8", "$28+"], ["10", "$33+"], ["12", "$37+"], ["14", "$45+"], ["15", "NYC metro"]].map(b => h("div", null, h("b", null, b[0]), b[1])))));

  if (L && L.wages && L.wages.changed && L.wages.changed.length) {
    methodSec.body.append(h("p", { class: "fineprint", style: "margin-top:16px" }, h("span", { class: "tag is-orange" }, "Live check"), " The daily run re-read BLS and corrected: ",
      L.wages.changed.map(c => c.name + " " + usd2(c.research) + " → " + usd2(c.live)).join(", "), "."));
  }

  /* the squeeze + roi */
  const facts = sec("Why finishing hours are the constraint", null);
  facts.body.append(h("div", { class: "grid4 rv" }, G.marketFacts.slice(0, 4).map(f => h("div", { class: "card" }, h("div", { class: "big", style: "font-size:clamp(30px,3vw,44px)" }, f.v), h("p", { class: "fineprint", style: "margin-top:8px" }, f.t, " ", refs(f.src))))),
    h("div", { class: "grid3", style: "margin-top:16px" }, G.marketFacts.slice(4).map(f => h("div", { class: "card" }, h("div", { class: "big", style: "font-size:clamp(26px,2.4vw,36px)" }, f.v), h("p", { class: "fineprint", style: "margin-top:8px" }, f.t, " ", refs(f.src))))));

  const roiSec = sec("The full ROI model", "Every input is editable. Replace the placeholder price and the speed multiple with Origin's own numbers.", { cls: "is-white" });
  roiSec.body.append(renderRoi(() => draw()),
    h("div", { style: "margin-top:20px" }, collapse("Assumptions behind the model", h("ul", { class: "list fineprint" }, G.roi.notes.map(n => h("li", null, n[0], " ", refs(n.slice(1))))))));

  function draw() {
    const r = roiNow();
    const be = isFinite(r.beWage);
    const n = above();
    put(answer, h("strong", null, n + " of " + G.wages.length + " states"), " clear break-even at today's inputs. ", top[1] + " leads at " + usd2(top[2]) + ".");
    kBE.textContent = be ? usd2(r.beWage) : "None";
    grid.update(sel);

    /* side panel */
    const w = WAGE[sel], name = STATES[sel];
    const inState = G.accounts.filter(a => a.st === sel && a.tier !== "excl");
    const jobs = marketJobs(sel);
    const body = [h("p", { class: "card-t" }, "Selected market"), h("h3", { class: "side-h" }, name)];
    if (w === undefined) {
      body.push(h("p", { class: "fineprint", style: "color:rgba(255,255,255,.6);margin-top:10px" }, "BLS publishes no taper estimate here. Accounts in this state score the average 6 labor points."));
    } else {
      const sr = roiCalc(Object.assign({}, S.roi, { wage: w, burden: 35 }));
      const cost = be && w >= r.beWage;
      body.push(h("div", { class: "big", style: "margin-top:10px" }, usd2(w)),
        h("div", { class: "verdict" + (cost ? " is-cost" : "") }, h("span", null, h("strong", null, cost ? "Lead with cost. " : "Lead with capacity. "), cost ? "The robot beats the finisher hours it covers." : "The case is schedule and crew, not price.")),
        h("dl", { class: "kv" },
          h("div", null, h("dt", null, "Loaded at 35%"), h("dd", null, usd2(w * 1.35))),
          h("div", null, h("dt", null, "Net per month, 60k sq ft"), h("dd", null, (sr.net >= 0 ? "Saves " : "Costs ") + usd(Math.abs(sr.net)))),
          h("div", null, h("dt", null, "Finisher days freed"), h("dd", null, num(sr.freed))),
          (L && L.wages && L.wages.states[sel] && L.wages.states[sel].jobs) ? h("div", null, h("dt", null, "Tapers employed"), h("dd", null, num(L.wages.states[sel].jobs))) : null));
    }
    if (jobs) body.push(h("p", { class: "fineprint", style: "color:rgba(255,255,255,.75);margin-top:12px" }, h("span", { class: "live-dot", style: "margin-right:7px" }), jobs.n + " large interior jobs live, " + money(jobs.value)));
    if (inState.length) body.push(h("p", { class: "card-t", style: "margin:16px 0 8px" }, inState.length + (inState.length === 1 ? " prospect" : " prospects")),
      h("div", { class: "chips" }, inState.slice(0, 7).map(a => h("a", { class: "chip", style: "background:#1d1d1b;border-color:#2c2c29;color:#fff;text-decoration:none", href: "#/prospects?tier=" + (["t1", "vet", "t2", "t3"].includes(a.tier) ? a.tier : "t1") }, a.n))));
    put(side, body);

    /* ranked bars */
    const data = G.wages.slice().sort((a, b) => b[2] - a[2]);
    const xMax = 60, pct = v => Math.min(100, v / xMax * 100);
    const refLine = (v, label, solid) => h("span", { class: "bar-ref" + (solid ? " is-solid" : ""), style: "left:" + pct(v) + "%" }, h("span", null, label));
    put(barsBox,
      h("div", { class: "bars-ref", "aria-hidden": "true" }, refLine(G.wageNational, "US " + usd2(G.wageNational)), be ? refLine(Math.min(r.beWage, xMax), "Break-even " + usd2(r.beWage), true) : null),
      data.map(d => h("div", { class: "bar-r", title: d[1] + " " + usd2(d[2]) + (d[3] ? ", small sample" : "") },
        h("span", { class: "bl" }, h("span", { class: "bl-full" }, d[1] + (d[3] ? "*" : "")), h("span", { class: "bl-abbr" }, d[0])),
        h("span", { class: "bar-t" }, h("span", { class: "bar-f" + (be && d[2] >= r.beWage ? " is-above" : ""), style: "width:" + pct(d[2]) + "%" })),
        h("span", { class: "bar-v" }, usd2(d[2])))));
    put(tblBox, table([{ t: "State" }, { t: "Median hourly wage", cls: "num" }, { t: "Loaded at 35%", cls: "num" }, { t: "BLS sample" }], data.map(w2 => [w2[1], usd2(w2[2]), usd2(w2[2] * 1.35), w2[3] ? "Small" : "Standard"]), { caption: "Taper wages by state" }));
  }

  root.append(head, mapSec, rankSec, metroSec, methodSec, facts, roiSec, nextLink("#/segments", "who buys"));
  draw();
}

function renderRoi(onChange) {
  const wrap = h("div", { class: "roi on-light" });
  const form = h("div");
  const out = h("div", { "aria-live": "polite" });
  const inputs = {};
  function numInput(key, label, step, hint, min) {
    const i = h("input", { type: "number", inputmode: "decimal", step: step || "1", min: min === undefined ? "0" : min, value: S.roi[key] });
    i.addEventListener("input", () => {
      const v = parseFloat(i.value);
      if (!isNaN(v) && v >= 0) { S.roi[key] = v; if (key === "wage" || key === "burden") { S.roi.preset = "custom"; presetSel.value = "custom"; } store.set("roi", S.roi); draw(); onChange(); }
    });
    inputs[key] = i;
    return field(label, i, hint);
  }
  const presetSel = h("select", null, G.roi.presets.map(p => h("option", { value: p.id }, p.label + " (" + usd2(p.wage) + ")")), h("option", { value: "custom" }, "Custom"));
  presetSel.value = S.roi.preset;
  presetSel.addEventListener("change", () => {
    if (presetSel.value === "custom") return;
    applyPreset(presetSel.value);
    inputs.wage.value = S.roi.wage; inputs.burden.value = S.roi.burden;
    draw(); onChange();
  });
  form.append(
    h("fieldset", null, h("legend", null, "Labor market"), h("div", { style: "margin-bottom:10px" }, field("Preset", presetSel)),
      h("div", { class: "row2" }, numInput("wage", "Hourly wage ($)", "0.01"), numInput("burden", "Burden (%)", "1", "Taxes, insurance, benefits"))),
    h("fieldset", null, h("legend", null, "Work"),
      h("div", { class: "row2" }, numInput("area", "Wall area per month (sq ft)", "1000"), numInput("share", "Share the robot takes (%)", "5")),
      h("div", { class: "row2" }, numInput("prod", "Manual Level 4 (sq ft per finisher day)", "5"), numInput("days", "Working days per month", "1"))),
    h("fieldset", null, h("legend", null, "Robot"),
      h("div", { class: "row2" }, numInput("speed", "Speed multiple (x a finisher)", "0.1"), numInput("ratio", "Robots per operator", "1", null, "1")),
      numInput("price", "Price per robot month ($), placeholder", "500")));
  const reset = h("button", { class: "btn", type: "button" }, "Reset inputs");
  reset.addEventListener("click", () => {
    Object.assign(S.roi, G.roi.defaults);
    applyPreset(S.roi.preset);
    Object.keys(inputs).forEach(k => { inputs[k].value = S.roi[k]; });
    presetSel.value = S.roi.preset;
    draw(); onChange();
  });
  form.append(h("div", { class: "toolbar" }, reset, copyBtn(roiSummaryText, "Copy summary")));

  function kv(k, v, sub) { return h("div", null, h("dt", null, k), h("dd", null, h("strong", { style: "font-weight:500" }, v), sub ? h("div", { class: "fineprint" }, sub) : null)); }
  function draw() {
    const r = roiNow(), cost = r.net >= 0;
    put(out,
      h("div", { class: "big", style: "font-size:clamp(34px,3.6vw,52px)" }, (cost ? "Saves " : "Costs ") + usd(Math.abs(r.net))),
      h("p", { class: "fineprint" }, "Net per month at these inputs"),
      h("div", { class: "verdict" + (cost ? " is-cost" : "") }, h("span", null, h("strong", null, cost ? "Lead with cost. " : "Lead with schedule and capacity. "), cost ? "The robot is cheaper than the finisher hours it covers, and it frees crew for other work." : "The robot costs more than the hours it covers. The case is the finisher days it frees and the schedule it protects.")),
      h("dl", { class: "kv" },
        kv("Finisher hours on the robot's share", num(r.manualHours) + " hours", num(r.manualDays) + " finisher days"),
        kv("Cost of those hours today", usd(r.manualCost), "at " + usd2(r.loaded) + " loaded"),
        kv("Robots needed", r.robots + (r.robots === 1 ? " robot" : " robots"), Math.round(r.util * 100) + "% utilized"),
        kv("Operators", r.operators + " for " + num(r.opHours) + " hours"),
        kv("Robot program cost", usd(r.robotCost), usd(r.rental) + " rental plus " + usd(r.opHours * r.loaded) + " operator time"),
        kv("Finisher days freed", num(r.freed) + " a month"),
        kv("Break-even loaded rate", isFinite(r.be) ? usd2(r.be) + " an hour" : "None at these inputs", isFinite(r.be) ? "a " + usd2(r.beWage) + " median wage at 35% burden" : null)));
  }
  wrap.append(form, out);
  draw();
  return wrap;
}
function roiSummaryText() {
  const r = roiNow(), i = S.roi;
  const preset = G.roi.presets.find(p => p.id === i.preset);
  return [
    "Origin robot ROI, monthly (" + (preset ? preset.label : "custom labor rate") + ")",
    "Inputs: " + num(i.area) + " sq ft a month, robot takes " + i.share + "%, " + i.prod + " sq ft per finisher day, " + i.speed + "x speed, " + usd(i.price) + " per robot month (placeholder), " + i.ratio + " robots per operator, wage " + usd2(i.wage) + " plus " + i.burden + "% burden.",
    "Finisher hours covered: " + num(r.manualHours) + " (" + usd(r.manualCost) + ").",
    "Robots: " + r.robots + ", operators: " + r.operators + ", program cost " + usd(r.robotCost) + ".",
    "Net per month: " + (r.net >= 0 ? "saves " : "costs ") + usd(Math.abs(r.net)) + ". Finisher days freed: " + num(r.freed) + ".",
    "Break-even loaded rate: " + (isFinite(r.be) ? usd2(r.be) + " an hour." : "none at these inputs.")
  ].join("\n");
}
