/* Shell: nav, footer, hash routing and the daily data load. */
import { $, $$, h, put, revealAll } from "./ui.js";
import { S, applyLive } from "./core.js";
import { runStamp } from "./shared.js";
import engine from "./views/engine.js";
import markets from "./views/markets.js";
import segments from "./views/segments.js";
import veterans from "./views/veterans.js";
import signals from "./views/signals.js";
import events from "./views/events.js";
import prospects from "./views/prospects.js";
import library from "./views/library.js";
import next from "./views/next.js";

const ROUTES = { "": engine, markets, segments, veterans, signals, events, prospects, library, next };
const NAV = [["markets", "Markets"], ["segments", "Segments"], ["veterans", "Veterans"], ["signals", "Signals"], ["events", "Events"], ["prospects", "Prospects"], ["library", "Library"]];
const TITLES = { "": "GTM Engine, prepared for Origin", markets: "Markets", segments: "Segments", veterans: "Robot veterans", signals: "Signals", events: "Events", prospects: "Prospects", library: "Library", next: "Any trade" };

let cleanup = null;

function renderNav() {
  const links = h("nav", { class: "nav-links", id: "navlinks", "aria-label": "Engine sections" },
    NAV.map(n => h("a", { href: "#/" + n[0] }, n[1])),
    h("a", { class: "pill", href: "#/next" }, "Any trade"));
  const toggle = h("button", { class: "nav-toggle", type: "button", "aria-expanded": "false", "aria-controls": "navlinks" }, "Menu");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close" : "Menu";
  });
  links.addEventListener("click", e => { if (e.target.closest("a")) { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); toggle.textContent = "Menu"; } });
  put($("#nav"), h("div", { class: "nav-in" },
    h("a", { class: "brand", href: "#/", "aria-label": "GTM Engine home" }, h("span", { class: "brand-word" }, "ORIGIN"), h("span", { class: "brand-tag" }, "GTM Engine · Proposal")),
    links, toggle));
}

function renderFoot() {
  put($("#foot"), h("div", { class: "wrap" },
    h("p", { class: "foot-big", "aria-hidden": "true" }, "GTM ", h("em", null, "Engine")),
    h("div", { class: "foot-row" },
      h("span", null, "Prepared by Aniruddha for Origin's founders. Independent work sample, not affiliated with or endorsed by Origin. Built from public sources."),
      h("span", null, "Last run ", runStamp(), " · ", h("a", { href: "#/library/sources" }, "All sources")))));
}

function parse() {
  const raw = (location.hash || "#/").replace(/^#\/?/, "");
  const [path, query] = raw.split("?");
  const seg = path.split("/");
  const params = {};
  new URLSearchParams(query || "").forEach((v, k) => { params[k] = v; });
  return { id: ROUTES[seg[0]] !== undefined ? seg[0] : "", sub: seg[1] || "", params };
}

function route() {
  const { id, sub, params } = parse();
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  const main = $("#main");
  main.replaceChildren();
  $("#overlay").replaceChildren();
  document.title = id ? TITLES[id] + ", GTM Engine" : TITLES[""];
  $$("#navlinks a").forEach(a => {
    if (a.getAttribute("href") === "#/" + id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  try {
    cleanup = ROUTES[id](main, Object.assign({ sub }, params)) || null;
  } catch (err) {
    console.error(err);
    main.append(h("div", { class: "wrap", style: "padding:140px 5vw" }, h("p", null, "This page failed to render: " + err.message)));
  }
  revealAll(main);
  const head = $("h1", main);
  if (head && id) head.focus({ preventScroll: true });
}

const FEED = "https://aniruddha-garje.github.io/origin-gtm-engine/data/live.json";
async function loadLive() {
  for (const [url, from] of [[FEED, "feed"], ["data/live.json", "snapshot"]]) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(url, { cache: "no-cache", signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const j = await r.json();
      if (j && j.generatedAt) { S.liveFrom = from; return j; }
    } catch (e) { clearTimeout(t); /* try the next source */ }
  }
  return null;
}

async function boot() {
  renderNav();
  const live = await loadLive();
  if (live) applyLive(live);
  renderFoot();
  const onScroll = () => $("#nav").classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  window.addEventListener("hashchange", route);
  route();
}
boot();
