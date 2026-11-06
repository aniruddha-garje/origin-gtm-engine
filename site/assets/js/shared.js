/* Pieces reused across views. */
import { h, fshort, money } from "./ui.js";
import { G, R, S } from "./core.js";

/* Source chips show the publisher, not a code, so a reader can see where a fact came from. */
const shortSrc = t => {
  const x = t.split(":")[0].replace(/\s*\(.*$/, "").replace(/^W&C$/, "Walls & Ceilings").trim();
  return x.length > 26 ? x.slice(0, 24).trim() + "…" : x;
};
export function refs(ids, max) {
  if (!ids || !ids.length) return null;
  const ok = ids.filter(id => G.sources[id]);
  if (!ok.length) return null;
  const lim = max || 2;
  return h("span", { class: "refs" }, ok.slice(0, lim).map(id => {
    const x = G.sources[id];
    return h("a", { class: "ref", href: x[1], target: "_blank", rel: "noopener noreferrer", title: x[0], "aria-label": "Source: " + x[0] }, shortSrc(x[0]) + " ↗");
  }), ok.length > lim ? h("a", { class: "ref", href: "#/library/sources", title: ok.slice(lim).map(id => G.sources[id][0]).join(" · ") }, "+" + (ok.length - lim)) : null);
}

export function howto(text) {
  return h("p", { class: "howto" }, h("b", null, "How to read this"), h("span", null, text));
}

export function reasonChip(r, lead) {
  const cls = "chip" + (lead ? " is-lead" : r.live ? " is-live" : "");
  return h("span", { class: cls, title: r.detail || "" }, h("i", { "aria-hidden": "true" }, r.icon), r.label);
}

export const KIND = {
  delay: "Project lagging", dc: "Data center", robot: "Robot news", layout: "Robot news", labor: "Labor squeeze",
  growth: "Growth", innov: "Innovation", mention: "Mention"
};

export function feedItem(x, runDay) {
  const fresh = runDay && x.firstSeen === runDay && S.live && !S.live.firstRun;
  return h("a", { class: "feed-i", href: x.url, target: "_blank", rel: "noopener noreferrer" },
    h("span", { class: "feed-k" }, KIND[x.kind] || x.kind),
    h("span", { class: "feed-t" }, x.title, h("small", null, [x.source, x.st].filter(Boolean).join(" · "))),
    h("span", { class: "feed-d" }, fresh ? h("span", { class: "live-dot", title: "New today" }) : null, " ", x.date ? fshort(x.date) : ""));
}

export function runStamp() {
  const L = S.live;
  if (!L) return "Snapshot";
  const d = new Date(L.generatedAt);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) + ", " + d.toISOString().slice(11, 16) + " UTC";
}

export function nextLink(href, label, take) {
  return h("section", { class: "sowhat" }, h("div", { class: "wrap" },
    take ? h("div", null, h("p", { class: "sowhat-k" }, "What this means for Origin"), h("p", { class: "sowhat-t" }, take)) : null,
    h("a", { class: "pill is-ink", href }, "Next: " + label, h("span", { "aria-hidden": "true" }, " →"))));
}

export { money };
