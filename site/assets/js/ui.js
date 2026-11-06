/* Small rendering helpers. Vanilla, no dependencies. */
export const $ = (s, r) => (r || document).querySelector(s);
export const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

export function h(tag, props) {
  const el = document.createElement(tag);
  const kids = Array.prototype.slice.call(arguments, 2);
  if (props) {
    let value;
    Object.keys(props).forEach(key => {
      const v = props[key];
      if (v === null || v === undefined || v === false) return;
      if (key === "class") el.className = v;
      else if (key === "text") el.textContent = v;
      else if (key === "html") el.innerHTML = v;
      else if (key === "value") value = v;
      else if (key === "checked" || key === "selected" || key === "disabled") el[key] = !!v;
      else if (key.slice(0, 2) === "on" && typeof v === "function") el.addEventListener(key.slice(2), v);
      else el.setAttribute(key, v === true ? "" : v);
    });
    kids.flat(Infinity).forEach(k => { if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k))); });
    if (value !== undefined) el.value = value;
    return el;
  }
  kids.flat(Infinity).forEach(k => { if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k))); });
  return el;
}

const NS = "http://www.w3.org/2000/svg";
export function s(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  Object.keys(attrs || {}).forEach(k => { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]); });
  Array.prototype.slice.call(arguments, 2).flat(Infinity).forEach(k => { if (k !== null && k !== undefined && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k))); });
  return el;
}

export function put(el) {
  el.replaceChildren(...Array.prototype.slice.call(arguments, 1).flat(Infinity).filter(k => k !== null && k !== undefined && k !== false));
  return el;
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem("ogtm2:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ogtm2:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem("ogtm2:" + k); } catch (e) { /* ignore */ } }
};

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usd = n => (n < 0 ? "−$" : "$") + nf0.format(Math.abs(Math.round(n)));
export const usd2 = n => "$" + nf2.format(n);
export const num = n => nf0.format(Math.round(n));
export const money = n => {
  if (!n) return "$0";
  if (n >= 1e9) return "$" + nf1.format(n / 1e9) + "B";
  if (n >= 1e6) return "$" + nf1.format(n / 1e6) + "M";
  if (n >= 1e3) return "$" + nf0.format(n / 1e3) + "K";
  return "$" + nf0.format(n);
};
export const revFmt = r => "$" + (r >= 1000 ? nf0.format(r) : nf1.format(r)) + "M";
export const nf2fmt = n => nf2.format(n);
export const enc = encodeURIComponent;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS = MON;
export function pd(iso) { const p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
export function fdate(iso) { const d = pd(iso); return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(); }
export function fshort(iso) { const d = pd(iso); return d.getDate() + " " + MON[d.getMonth()]; }
export function frange(a, b) {
  if (!a) return "Dates TBD";
  const x = pd(a), y = pd(b || a);
  if (+x === +y) return fdate(a);
  if (x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()) return x.getDate() + " to " + y.getDate() + " " + MON[x.getMonth()] + " " + x.getFullYear();
  if (x.getFullYear() === y.getFullYear()) return x.getDate() + " " + MON[x.getMonth()] + " to " + y.getDate() + " " + MON[y.getMonth()] + " " + x.getFullYear();
  return fdate(a) + " to " + fdate(b);
}
export function today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
export function daysTo(iso) { return Math.round((pd(iso) - today()) / 86400000); }
export function dueText(iso) {
  if (!iso) return "Now";
  const d = daysTo(iso);
  if (d < 0) return "Passed";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return d + " days";
}

export function copyText(text, btn) {
  const done = () => {
    if (!btn) return;
    const old = btn.dataset.label || btn.textContent;
    btn.dataset.label = old;
    btn.textContent = "Copied";
    btn.classList.add("is-done");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("is-done"); }, 1600);
  };
  const fallback = () => {
    const ta = h("textarea", { class: "sr-only", "aria-hidden": "true" });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
    done();
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  } catch (e) { fallback(); }
}
export function copyBtn(getText, label, cls) {
  const b = h("button", { class: cls || "btn", type: "button" }, label || "Copy");
  b.addEventListener("click", () => copyText(typeof getText === "function" ? getText() : getText, b));
  return b;
}

export function table(cols, rows, opts) {
  opts = opts || {};
  const t = h("table", { class: "tbl" + (opts.cls ? " " + opts.cls : "") });
  if (opts.caption) t.append(h("caption", { class: "sr-only" }, opts.caption));
  t.append(h("thead", null, h("tr", null, cols.map(c => h("th", { scope: "col", class: c.cls || null }, c.t)))));
  const tb = h("tbody");
  rows.forEach(r => tb.append(h("tr", null, r.map((cell, i) => h("td", { class: cols[i].cls || null, "data-label": cols[i].t }, cell)))));
  t.append(tb);
  return h("div", { class: "tbl-scroll" }, t);
}
export function list(items, cls) { return h("ul", { class: cls || "list" }, items.map(i => h("li", null, i))); }
export function field(label, control, hint) {
  const id = control.id || ("f" + Math.random().toString(36).slice(2, 8));
  control.id = id;
  return h("div", { class: "field" }, h("label", { for: id }, label), control, hint ? h("span", { class: "hint" }, hint) : null);
}

/* Page furniture */
export function band(o) {
  return h("section", { class: "band" + (o.tall ? " is-tall" : "") },
    h("div", { class: "wrap" },
      h("p", { class: "eyebrow" }, o.no ? h("span", { class: "eyebrow-n" }, o.no) : null, o.label),
      h("h1", { tabindex: "-1" }, o.title),
      o.answer ? h("p", { class: "answer" }, o.answer) : null,
      o.kpis ? h("dl", { class: "kpis" }, o.kpis.map(k => h("div", { class: "kpi" + (k.hot ? " is-hot" : "") }, h("dt", null, k.l), h("dd", null, k.v), k.s ? h("span", { class: "kpi-s" }, k.s) : null))) : null));
}
export function sec(title, lede, opts) {
  opts = opts || {};
  const head = h("header", { class: "sec-head" }, h("h2", null, title), lede ? h("p", { class: "sec-lede" }, lede) : null);
  const box = h("div", { class: "wrap" }, opts.eyebrow ? h("p", { class: "sec-eye" }, opts.eyebrow) : null, title || lede ? head : null);
  const outer = h("section", { class: "sec" + (opts.cls ? " " + opts.cls : "") }, box);
  outer.body = box;
  return outer;
}
export function steps(items) {
  return h("ol", { class: "method" }, items.map((m, i) => h("li", null, h("span", { class: "method-n" }, String(i + 1).padStart(2, "0")), h("h3", null, m[0]), h("p", null, m[1]))));
}
export function collapse(label, body, open) {
  const d = h("details", { class: "fold" }, h("summary", null, h("span", null, label), h("span", { class: "fold-x", "aria-hidden": "true" })), h("div", { class: "fold-body" }, body));
  if (open) d.open = true;
  return d;
}

export function revealAll(root) {
  const els = $$(".rv", root);
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px" });
  els.forEach(e => io.observe(e));
}
