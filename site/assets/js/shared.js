/* Pieces reused across views. */
import { h, fshort, money } from "./ui.js";
import { G, R, S } from "./core.js";

export function refs(ids) {
  if (!ids || !ids.length) return null;
  return h("span", { class: "refs" }, ids.map(id => {
    const x = G.sources[id];
    if (!x) return null;
    return h("a", { class: "ref", href: x[1], target: "_blank", rel: "noopener noreferrer", title: x[0], "aria-label": "Source: " + x[0] }, id);
  }));
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

export function nextLink(href, label) {
  return h("section", { class: "sec is-tight" }, h("div", { class: "wrap" },
    h("a", { class: "pill", href }, "Next: " + label, h("span", { "aria-hidden": "true" }, " →"))));
}

export { money };
