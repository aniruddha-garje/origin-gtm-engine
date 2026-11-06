/* Prospects: four tiers, a reason on every name, select and personalise. */
import { h, s, $, put, band, sec, field, store, usd2, money, revFmt, enc, copyText, fshort } from "../ui.js";
import { G, R, S, STATES, SIG, TIER, TIER_SHORT, OUTBOUND_TIERS, PLAY, STATUS, SEG, score, reasonsFor, whySentence, playFor, laborNote, proxNote, marketJobs, marketDelays, liveAcct, firstTouch, unresolved, openerLine } from "../core.js";
import { refs, reasonChip, nextLink } from "../shared.js";

const SIDE = ["paint", "nurture", "excl"];
const TIERTXT = {
  t1: ["Tier 1", "Northeast beachhead. Site walk."],
  vet: ["Robot veterans", "Already ran a robot. Compare notes."],
  t2: ["Tier 2", "High wage. ROI model."],
  t3: ["Tier 3", "Sun Belt volume. Capacity."]
};

function ring(v) {
  const r = 19, c = 2 * Math.PI * r;
  return h("div", { class: "ring", role: "img", "aria-label": "Score " + v + " of 100" },
    s("svg", { width: 46, height: 46, viewBox: "0 0 46 46", "aria-hidden": "true" },
      s("circle", { cx: 23, cy: 23, r, fill: "none", stroke: "#ececE6", "stroke-width": 3.5 }),
      s("circle", { cx: 23, cy: 23, r, fill: "none", stroke: "#fd583a", "stroke-width": 3.5, "stroke-linecap": "round", "stroke-dasharray": (v / 100 * c) + " " + c })),
    h("b", null, String(v)));
}

export default function prospects(root, params) {
  const L = S.live;
  const all = G.accounts.map(a => { const sc = score(a); return { a, sc, rs: reasonsFor(a, sc) }; });
  let tier = TIERTXT[params.tier] || SIDE.includes(params.tier) ? params.tier : "t1";
  let reason = params.reason || "all";
  let q = "";
  let open = null;

  const head = band({
    no: "06", label: "Prospects", title: "Four tiers. Pick. Personalise. Send.",
    answer: h("span", null, "Every name carries the reason it is here. ", h("strong", null, "Select who to reach and the engine writes the first touch.")),
    kpis: OUTBOUND_TIERS.map(t => ({ l: TIERTXT[t][0], v: String(all.filter(x => x.a.tier === t).length), s: (PLAY[TIER[t].play] || {}).n, hot: t === "t1" }))
  });

  const tabsBox = h("div", { class: "ptabs", role: "tablist", "aria-label": "Prospect tiers" });
  const filters = h("div", { class: "rfil", role: "group", "aria-label": "Filter by reason" });
  const search = h("input", { type: "search", placeholder: "Search name, city, state", "aria-label": "Search prospects" });
  search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); drawList(); });
  const selAll = h("button", { class: "btn", type: "button" }, "Select all");
  const listBox = h("div", { class: "plist" });
  const sideBox = h("div", { class: "side-lanes" });
  const note = h("p", { class: "fineprint", style: "margin-top:12px" }, "Built from public sources, so Origin's own pilot contractors are not identified here. Remove them before anything is sent.");

  const main = sec(null, null);
  main.body.append(tabsBox, h("div", { class: "pbar" }, filters, h("div", { class: "toolbar" }, search, selAll)), listBox, sideBox, note);

  /* action bar */
  const barText = h("span", null, "");
  const act = h("button", { class: "pill", type: "button" }, "Personalise →");
  const clear = h("button", { class: "btn", type: "button", style: "color:#fff;border-color:rgba(255,255,255,.3)" }, "Clear");
  const bar = h("div", { class: "actbar", role: "region", "aria-label": "Selection" }, barText, clear, act);
  act.addEventListener("click", () => openComposer([...S.selected]));
  clear.addEventListener("click", () => { S.selected.clear(); drawAll(); });

  const matches = x => (reason === "all" || x.rs.some(r => r.k === reason) || (reason === "lag" && marketDelays(x.a.st).length > 0)) &&
    (!q || (x.a.n + " " + x.a.c + " " + x.a.st + " " + (STATES[x.a.st] || "")).toLowerCase().includes(q));

  function drawTabs() {
    put(tabsBox, OUTBOUND_TIERS.map(t => {
      const n = all.filter(x => x.a.tier === t && matches(x)).length;
      const b = h("button", { class: "ptab" + (tier === t ? " is-on" : ""), type: "button", role: "tab", "aria-selected": String(tier === t) },
        h("h3", null, TIERTXT[t][0], h("b", null, n)), h("p", null, TIERTXT[t][1]));
      b.addEventListener("click", () => { tier = t; open = null; drawAll(); });
      return b;
    }));
    const keys = ["all", "robot", "wage", "lag", "fed", "dc", "near", "crew", "union", "lean", "tech"];
    const inTier = all.filter(x => OUTBOUND_TIERS.includes(x.a.tier));
    const chips = keys.filter(k => k === "all" || inTier.some(x => x.rs.some(r => r.k === k) || (k === "lag" && marketDelays(x.a.st).length > 0))).map(k => {
      const d = k === "all" ? { label: "All reasons", icon: "" } : R.reasons[k];
      const b = h("button", { class: "chip" + (reason === k ? " is-on" : ""), type: "button", "aria-pressed": String(reason === k) }, d.icon ? h("i", { "aria-hidden": "true" }, d.icon) : null, d.label);
      b.addEventListener("click", () => {
        reason = k; open = null;
        if (!all.some(x => x.a.tier === tier && matches(x))) { const t = OUTBOUND_TIERS.find(t2 => all.some(x => x.a.tier === t2 && matches(x))); if (t) tier = t; }
        drawAll();
      });
      return b;
    });
    put(filters, chips);
  }

  function softChips(a) {
    const out = [];
    const j = marketJobs(a.st);
    if (j) out.push(h("span", { class: "chip is-soft", title: "Market level: large interior jobs permitted nearby" }, j.n + " live jobs in " + j.where));
    const d = marketDelays(a.st);
    if (d.length) out.push(h("span", { class: "chip is-soft", title: d.map(x => x.title).join(" · ") }, h("i", { "aria-hidden": "true" }, "!"), d.length + (d.length === 1 ? " project lagging in " : " projects lagging in ") + a.st));
    return out;
  }

  function row(x) {
    const a = x.a, sel = S.selected.has(a.id), isOpen = open === a.id, canSend = OUTBOUND_TIERS.includes(a.tier) || a.tier === "paint";
    const cb = h("input", { type: "checkbox", checked: sel, disabled: !canSend, "aria-label": "Select " + a.n });
    cb.addEventListener("click", e => e.stopPropagation());
    cb.addEventListener("change", () => { if (cb.checked) S.selected.add(a.id); else S.selected.delete(a.id); drawAll(); });
    const headRow = h("div", { class: "prow-h" },
      cb, ring(x.sc.total),
      h("div", null,
        h("div", { class: "pname" }, a.n),
        h("div", { class: "ploc" }, [a.c && a.c !== "City to verify" ? a.c + ", " + a.st : a.st, a.rev ? revFmt(a.rev) : null, a.list === "wc50" ? "Top 50 #" + a.rk : null].filter(Boolean).join(" · "))),
      h("div", { class: "prow-r" },
        h("div", { class: "chips" }, x.rs.slice(0, 4).map((r, i) => reasonChip(r, i === 0)), softChips(a)),
        h("p", { class: "pwhy" }, whySentence(a))),
      h("span", { class: "pchev", "aria-hidden": "true" }));
    headRow.addEventListener("click", () => { open = isOpen ? null : a.id; drawList(); });
    return h("div", { class: "prow" + (sel ? " is-sel" : "") + (isOpen ? " is-open" : "") }, headRow, isOpen ? detail(x) : null);
  }

  function detail(x) {
    const a = x.a, sc = x.sc, c = sc.c, W = S.weights;
    const ev = a.ev.slice();
    if (a.list === "wc50") ev.unshift(["ranked", "W&C 2026 Top 50: #" + a.rk + ", " + revFmt(a.rev) + " working revenue", "s27"]);
    if (a.list === "slwc") ev.unshift(["ranked", "Siteline wall and ceiling list: " + revFmt(a.rev), "s47"]);
    if (a.list === "slp") ev.unshift(["ranked", "Siteline commercial painting list: " + revFmt(a.rev), "s56"]);
    const live = liveAcct(a.id);
    const nm = '"' + a.n + '"', city = a.c && a.c !== "City to verify" ? a.c : "";
    const bdRows = [
      ["Size", c.size, 15, a.rev ? revFmt(a.rev) + " revenue" : "Revenue not published"],
      ["Labor", c.labor, 15, laborNote(a)],
      ["Proximity", c.prox, 10, proxNote(a, sc.sig)],
      ["Scope", c.scope, 10, SEG[a.seg]],
      ["Signals", c.sig + c.neg, 50, c.neg ? "Includes −25 for a competing fleet" : "From the ticked signals"]
    ];
    const status = h("select", { "aria-label": "Status for " + a.n }, STATUS.map(v => h("option", { value: v }, v)));
    status.value = S.status[a.id] || "Not started";
    status.addEventListener("change", () => { S.status[a.id] = status.value; store.set("status", S.status); });
    const checks = h("div", { class: "sigchk" }, G.signals.map(g => {
      const i = h("input", { type: "checkbox", checked: sc.sig.has(g.k) });
      i.addEventListener("change", () => {
        S.sigOv[a.id] = S.sigOv[a.id] || {};
        const base = a.sig.includes(g.k) || liveAcct(a.id).some(l => l.k === g.k);
        if (i.checked === base) delete S.sigOv[a.id][g.k]; else S.sigOv[a.id][g.k] = i.checked;
        if (!Object.keys(S.sigOv[a.id]).length) delete S.sigOv[a.id];
        store.set("sigov", S.sigOv);
        x.sc = score(a); x.rs = reasonsFor(a, x.sc);
        drawList();
      });
      return h("label", null, i, g.n, h("span", { class: "fineprint" }, (g.w > 0 ? " +" : " −") + Math.abs(g.w)));
    }));
    const write = h("button", { class: "pill", type: "button" }, playFor(a) ? "Write with " + PLAY[playFor(a)].n : "Write outreach");
    write.addEventListener("click", e => { e.stopPropagation(); openComposer([a.id]); });
    return h("div", { class: "pdet" },
      h("div", null,
        h("h4", null, "Why this name"),
        h("div", { class: "chips", style: "margin-bottom:10px" }, x.rs.map((r, i) => reasonChip(r, i === 0))),
        h("ul", { class: "ev-l" },
          live.map(e => h("li", null, h("span", { class: "tag is-orange" }, e.k === "fed" ? "Federal" : "Live"), h("span", null, e.title, " ", h("a", { href: e.url, target: "_blank", rel: "noopener noreferrer", class: "ref" }, fshort(e.date))))),
          ev.map(e => h("li", null, e[0] && SIG[e[0]] ? h("span", { class: "tag" }, SIG[e[0]].n) : h("span", { class: "tag" }, "Note"), h("span", null, e[1], " ", refs(e.slice(2)))))),
        !ev.length && !live.length ? h("p", { class: "fineprint" }, "No public evidence beyond the ranking yet. Start with the research links.") : null,
        h("h4", null, "Research"),
        h("p", { class: "links" },
          h("a", { href: "https://www.linkedin.com/search/results/people/?keywords=" + enc(nm + " operations"), target: "_blank", rel: "noopener noreferrer" }, "Operations leaders"),
          h("a", { href: "https://www.linkedin.com/search/results/people/?keywords=" + enc(nm + " superintendent"), target: "_blank", rel: "noopener noreferrer" }, "Superintendents"),
          h("a", { href: "https://www.indeed.com/jobs?q=" + enc(nm), target: "_blank", rel: "noopener noreferrer" }, "Open jobs"),
          h("a", { href: "https://news.google.com/search?q=" + enc(nm), target: "_blank", rel: "noopener noreferrer" }, "News"),
          h("a", { href: "https://www.google.com/search?q=" + enc(nm + " " + city + " " + a.st), target: "_blank", rel: "noopener noreferrer" }, "Web")),
        h("div", { class: "toolbar", style: "margin-top:16px" }, write, h("div", { style: "width:170px" }, status))),
      h("div", null,
        h("h4", null, "Score: " + sc.total + " of 100"),
        h("div", { class: "bd" }, bdRows.map(r => [
          h("div", { class: "bd-r" + (r[0] === "Signals" ? " is-sig" : "") }, h("span", null, r[0]), h("span", { class: "bd-t" }, h("i", { style: "width:" + Math.max(0, r[1]) / r[2] * 100 + "%" })), h("span", { style: "text-align:right;font-variant-numeric:tabular-nums" }, r[1] + "/" + r[2])),
          h("div", { class: "bd-r" }, h("span"), h("span", { class: "bd-n" }, r[3]))])),
        h("h4", null, "Signals. Tick what you verify."), checks));
  }

  function drawList() {
    const rows = all.filter(x => x.a.tier === tier && matches(x)).sort((x, y) => y.sc.total - x.sc.total);
    put(listBox, rows.length ? rows.map(row) : h("p", { class: "fineprint", style: "padding:20px 0" }, "No names match. Clear the search or choose another reason."));
    const allSel = rows.length && rows.every(x => S.selected.has(x.a.id));
    selAll.textContent = allSel ? "Clear tier" : "Select all " + rows.length;
    selAll.onclick = () => { rows.forEach(x => { if (allSel) S.selected.delete(x.a.id); else S.selected.add(x.a.id); }); drawAll(); };
    barText.textContent = S.selected.size + (S.selected.size === 1 ? " prospect selected" : " prospects selected");
    bar.classList.toggle("is-on", S.selected.size > 0);
  }
  function drawSide() {
    put(sideBox, h("span", { class: "fineprint", style: "align-self:center" }, "Also tracked:"),
      SIDE.map(t => {
        const n = all.filter(x => x.a.tier === t).length;
        const b = h("button", { class: "btn" + (tier === t ? " is-on" : ""), type: "button" }, TIER_SHORT[t] + " " + n);
        b.addEventListener("click", () => { tier = t; reason = "all"; open = null; drawAll(); });
        return b;
      }));
  }
  function drawAll() { drawTabs(); drawList(); drawSide(); }

  /* discovered */
  const disc = L && L.federal ? L.federal.discovered || [] : [];
  const dSec = disc.length ? sec("Names the engine found on its own", "Finishing subs on federal jobs that are not on our list. Unscored until someone researches them.", { cls: "is-white" }) : null;
  if (dSec) dSec.body.append(h("div", { class: "disc rv" }, disc.slice(0, 12).map(d => h("a", { href: d.url, target: "_blank", rel: "noopener noreferrer" },
    h("h4", null, d.name), h("p", null, h("b", null, money(d.total)), " federal subawards, under " + d.prime), h("p", null, d.desc.charAt(0) + d.desc.slice(1).toLowerCase())))));

  /* GC pull-through */
  root.append(head, main);
  if (dSec) root.append(dSec);
  root.append(nextLink("#/next", "the same engine, any trade"), bar);
  drawAll();
  return () => { closeComposer(); };
}

/* ---------- composer ---------- */
function closeComposer() { const o = $("#overlay"); if (o) o.replaceChildren(); document.body.style.overflow = ""; }

function openComposer(ids) {
  const accts = ids.map(id => G.accounts.find(a => a.id === id)).filter(Boolean);
  if (!accts.length) return;
  let idx = 0, step = 0;
  const edits = {};
  const key = (a, st) => a.id + ":" + st;
  const contact = a => S.contacts[a.id] || { first: "", email: "" };
  const sender = h("input", { type: "text", placeholder: "Your name", value: S.merge.sender || "", autocomplete: "off" });

  const list = h("div", { class: "dr-list" });
  const mainBox = h("div", { class: "dr-main" });
  const scrim = h("div", { class: "scrim" });
  scrim.addEventListener("click", closeComposer);
  const drawer = h("aside", { class: "drawer", role: "dialog", "aria-modal": "true", "aria-label": "Personalise outbound" }, list, mainBox);
  const onKey = e => { if (e.key === "Escape") { closeComposer(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);
  sender.addEventListener("input", () => { S.merge.sender = sender.value; store.set("merge", S.merge); Object.keys(edits).forEach(k => delete edits[k]); drawPreview(); });

  function current() {
    const a = accts[idx], c = contact(a);
    const t = firstTouch(a, c.first, S.merge.sender, step);
    const e = edits[key(a, step)];
    return { a, c, t, subject: e ? e.subject : t.subject, body: e ? e.body : t.body };
  }
  function drawList() {
    put(list, h("h3", null, accts.length + (accts.length === 1 ? " prospect" : " prospects")),
      h("p", null, "Each gets the play for its tier and an opener from its own signal."),
      accts.map((a, i) => {
        const pid = playFor(a) || "p1";
        const b = h("button", { class: "dr-i" + (i === idx ? " is-on" : ""), type: "button" }, h("b", null, a.n), h("small", null, TIER_SHORT[a.tier] + " · " + PLAY[pid].n));
        b.addEventListener("click", () => { idx = i; step = 0; drawList(); drawMain(); });
        return b;
      }));
  }
  const preview = h("div", { style: "display:grid;gap:12px" });
  function drawMain() {
    const { a, c, t } = current();
    const sc = score(a), rs = reasonsFor(a, sc);
    const persona = G.icp.committee[1];
    const first = h("input", { type: "text", placeholder: "First name", value: c.first, autocomplete: "off" });
    const email = h("input", { type: "email", placeholder: "name@company.com", value: c.email, autocomplete: "off" });
    const save = () => { S.contacts[a.id] = { first: first.value, email: email.value }; store.set("contacts", S.contacts); };
    first.addEventListener("input", () => { save(); delete edits[key(a, step)]; drawPreview(); });
    email.addEventListener("input", () => { save(); drawPreview(); });
    const x = h("button", { class: "dr-x", type: "button", "aria-label": "Close" }, "×");
    x.addEventListener("click", closeComposer);
    const touches = h("div", { class: "touches", role: "tablist", "aria-label": "Touches in this sequence" }, t.play.steps.map((st, i) => {
      const b = h("button", { class: "touch" + (i === step ? " is-on" : ""), type: "button" }, (st.d < 0 ? Math.abs(st.d) + "d before" : "Day " + st.d) + " · " + st.ch);
      b.addEventListener("click", () => { step = i; drawMain(); });
      return b;
    }));
    put(mainBox,
      h("div", { class: "dr-top" }, h("div", null, h("h2", null, a.n), h("div", { class: "chips", style: "margin-top:8px" }, rs.slice(0, 3).map((r, i) => reasonChip(r, i === 0)))), x),
      h("div", { class: "dr-why" }, h("small", null, "Why this message"), whySentence(a)),
      h("div", { class: "row3" }, field("Contact first name", first), field("Email", email), field("Sender", sender)),
      h("p", { class: "fineprint", style: "color:rgba(255,255,255,.6)" }, "Find: " + persona.titles + ". ",
        h("a", { href: "https://www.linkedin.com/search/results/people/?keywords=" + enc('"' + a.n + '" operations'), target: "_blank", rel: "noopener noreferrer", style: "color:#fd583a" }, "Search LinkedIn")),
      touches, preview);
    drawPreview();
  }
  function drawPreview() {
    const cur = current();
    const { a, c, t } = cur;
    const isEmail = t.step.ch === "Email";
    const subj = h("input", { type: "text", value: cur.subject, "aria-label": "Subject" });
    const body = h("textarea", { "aria-label": "Message body" });
    body.value = cur.body;
    const sync = () => { edits[key(a, step)] = { subject: subj.value, body: body.value }; warn(); };
    subj.addEventListener("input", sync); body.addEventListener("input", sync);
    const warnBox = h("div");
    const mail = h("a", { class: "pill", href: "#" }, "Open in email");
    function warn() {
      const left = [...new Set(unresolved(subj.value + " " + body.value))];
      put(warnBox, left.length ? h("div", { class: "warnbox" }, "Fill before sending: " + left.join(", ")) : null);
      const e = edits[key(a, step)] || { subject: subj.value, body: body.value };
      mail.href = "mailto:" + encodeURIComponent(contact(a).email || "") + "?subject=" + enc(e.subject) + "&body=" + enc(e.body);
      mail.toggleAttribute("aria-disabled", left.length > 0);
      mail.style.opacity = left.length ? ".45" : "1";
      mail.style.pointerEvents = left.length ? "none" : "auto";
    }
    const copy = h("button", { class: "btn", type: "button" }, "Copy");
    copy.addEventListener("click", () => copyText((isEmail ? "Subject: " + subj.value + "\n\n" : "") + body.value, copy));
    const nextB = h("button", { class: "btn", type: "button", disabled: idx >= accts.length - 1 }, "Next prospect →");
    nextB.addEventListener("click", () => { idx++; step = 0; drawList(); drawMain(); });
    const csv = h("button", { class: "btn", type: "button" }, "Export all as CSV");
    csv.addEventListener("click", () => exportCsv(accts, edits));
    put(preview,
      isEmail ? field("Subject", subj) : null,
      field(t.step.ch === "Call" ? "Call script" : t.step.ch, body),
      warnBox,
      h("div", { class: "dr-bar" }, h("div", { class: "toolbar" }, isEmail ? mail : null, copy, nextB), csv),
      h("div", { class: "fineprint", style: "color:rgba(255,255,255,.6)" }, h("strong", { style: "color:#fff;font-weight:500" }, "Before sending. "), t.play.confirm.filter(c => !/Replace \$\{wage\}/.test(c)).join(" ")),
      h("p", { class: "fineprint", style: "color:rgba(255,255,255,.45)" }, "Nothing sends from this page. Open in email uses your own mail client. Names stay in this browser."));
    warn();
  }
  drawList(); drawMain();
  document.body.style.overflow = "hidden";
  put($("#overlay"), scrim, drawer);
}

function exportCsv(accts, edits) {
  const esc = v => { const t = String(v === null || v === undefined ? "" : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const lines = [["Company", "City", "State", "Tier", "Play", "Score", "Lead reason", "First name", "Email", "Subject", "Body"].join(",")];
  accts.forEach(a => {
    const c = S.contacts[a.id] || { first: "", email: "" };
    const t = firstTouch(a, c.first, S.merge.sender, 0);
    const e = edits[a.id + ":0"];
    const sc = score(a), rs = reasonsFor(a, sc);
    lines.push([a.n, a.c, a.st, TIER_SHORT[a.tier], t.play.n, sc.total, rs[0] ? rs[0].label : "", c.first, c.email, e ? e.subject : t.subject, e ? e.body : t.body].map(esc).join(","));
  });
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const link = h("a", { href: url, download: "origin-outbound.csv" });
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
