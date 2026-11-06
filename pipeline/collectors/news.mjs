/* News scan over Google News RSS. Headlines only, classified by rule.
   A contractor is only tied to a headline when its name is in the headline. Anything looser stays a market item,
   so nobody is labelled as running late because of a keyword match. */
import { get, report, decode, sleep, hash, isoDay } from "../lib/util.mjs";

const RSS = q => "https://news.google.com/rss/search?" + new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" });

const MARKET_QUERIES = [
  { q: '"drywall robot" OR "drywall finishing robot" OR "drywall finishing" robot', lens: "robot" },
  { q: 'Okibo robot', lens: "robot" },
  { q: 'JLG Canvas drywall robot', lens: "robot" },
  { q: '"Dusty Robotics"', lens: "robot" },
  { q: 'construction robots jobsite contractor adoption', lens: "robot" },
  { q: 'painting robot construction interior contractor', lens: "robot" },
  { q: 'construction "behind schedule" hospital OR tower OR hotel OR arena when:60d', lens: "lag" },
  { q: 'opening delayed construction hospital OR school OR hotel OR terminal when:60d', lens: "lag" },
  { q: '"data center" construction delayed OR "behind schedule" when:60d', lens: "lag" },
  { q: 'project delayed "labor shortage" construction when:60d', lens: "lag" },
  ...["New York", "Chicago", "Seattle", "Boston", "Dallas", "Phoenix", "Atlanta", "Philadelphia", "San Francisco"].map(c => ({ q: c + ' construction project delayed tower OR hospital OR hotel when:60d', lens: "lag" })),
  { q: '"data center" campus groundbreaking general contractor when:45d', lens: "dc" },
  { q: '"data center" construction contractor awarded when:45d', lens: "dc" },
  { q: 'construction worker shortage drywall finishers when:60d', lens: "labor" },
  { q: 'AGC OR ABC construction workforce shortage survey when:45d', lens: "labor" }
];

const LAG = /\b(delay(ed|s)?|behind schedule|pushed back|postpon\w+|setback|stalled|won'?t open|missed (its )?deadline|construction timeline)\b/i;
const NOT_PROJECT = /\b(traffic|flights?|lane closures?|commut\w+|trains?|road ?work|bridge|highway|pipeline|rail|sewer|tunnel|water main|stocks?|earnings|shipment|court|trial|lawsuit|IPOs?|bans?|Wall Street|bond|tax|election|vote[sd]?|zoning|rezoning|council|fiber|power outage|strikes?|nurses?|students?|runway|travel|aid|appeals?|patients?)\b/i;
const FINANCE = /\b(stocks?|shares?|nasdaq|ipo|earnings|forecast|investors?|midterms?|democrats?|republicans?|voters?|downgrade|rally|price target|bans?|moratorium|opposition|pushback)\b/i;
const BUILD_WORDS = /\b(construct\w*|contractor|campus|groundbreak\w*|breaks? ground|builder|awarded|fit[\s-]?out|build[\s-]?out|develop(er|ment))\b/i;
const ROBOT = /okibo|dusty robotics|drywall (finishing )?robot|finishing robot|paint(ing)? robot|construction robot|job ?site robot|robots?.{0,40}(construction|job ?site|drywall)|(construction|job ?site|drywall).{0,40}robot|\bcanvas\b.{0,40}(robot|drywall|jlg)|jlg.{0,40}canvas/i;
const BUILDING = /\b(hospital|medical|tower|terminal|airport|hotel|casino|arena|stadium|school|campus|university|data cent(er|re)|apartment|residential|condo|housing|office|lab|library|courthouse|museum|convention)\b/i;
const NOT_US = /\b(UK|London|Scotland|Wales|Ireland|Australia|Sydney|Melbourne|Canada|Ontario|Toronto|Vancouver|India|Mumbai|Delhi|Dubai|Saudi|Singapore|Nigeria|Kenya|South Africa|Philippines|Malaysia|New Zealand)\b/i;

const STATES = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY" };
const CITIES = { "Wichita Falls": "TX", "West Palm": "FL", "Palm Beach": "FL", "Disney World": "FL", "Port Washington": "WI", "St. Paul": "MN", "Twin Cities": "MN", "Silicon Valley": "CA", "Bay Area": "CA", "New York City": "NY", "Long Island": "NY", "Jersey City": "NJ", "San Francisco": "CA", "Los Angeles": "CA", "San Diego": "CA", "San Jose": "CA", "Santa Monica": "CA", "Long Beach": "CA", "San Antonio": "TX", "Fort Worth": "TX", "Salt Lake": "UT", "Las Vegas": "NV", "St. Louis": "MO", "Kansas City": "MO", "Des Moines": "IA", NYC: "NY", Manhattan: "NY", Brooklyn: "NY", Queens: "NY", Bronx: "NY", Chicago: "IL", Boston: "MA", Philadelphia: "PA", Pittsburgh: "PA", Seattle: "WA", Spokane: "WA", Portland: "OR", Sacramento: "CA", Oakland: "CA", Fresno: "CA", Honolulu: "HI", Dallas: "TX", Houston: "TX", Austin: "TX", Phoenix: "AZ", Tucson: "AZ", Atlanta: "GA", Miami: "FL", Orlando: "FL", Tampa: "FL", Denver: "CO", Minneapolis: "MN", Detroit: "MI", Cleveland: "OH", Columbus: "OH", Cincinnati: "OH", Nashville: "TN", Memphis: "TN", Charlotte: "NC", Raleigh: "NC", Newark: "NJ", Baltimore: "MD", Milwaukee: "WI", Indianapolis: "IN", Richmond: "VA", Norfolk: "VA", Louisville: "KY", Tulsa: "OK", Omaha: "NE", Boise: "ID", Albuquerque: "NM", Anchorage: "AK" };

/* "Washington" alone is usually DC or a place name, so it never counts as the state. */
function stateOf(text) {
  for (const k of Object.keys(CITIES)) if (new RegExp("\\b" + k + "\\b").test(text)) return CITIES[k];
  if (/Washington state/i.test(text)) return "WA";
  if (/Washington,? D\.?C\.?/i.test(text)) return "DC";
  for (const k of Object.keys(STATES)) if (k !== "Washington" && new RegExp("\\b" + k + "\\b").test(text)) return STATES[k];
  return null;
}

/* Short or common-word names need a second word of proof before they count as a match. */
const AMBIGUOUS = /^(standard drywall|the circle group|metro walls|wallworks|group builders|the rockwell group|certified interiors|creative partition systems|central ceilings|alliance partition systems|south valley|reliance interiors|the raymond group|the mo|ceiling experts|arch painting|champion painting|vpi|graydaze)$/i;
const CONTEXT = /\b(drywall|contractor|subcontractor|construction|interior|acoustic|ceiling|wall|paint|builder|project|robot)\b/i;

function aliases(a) {
  const base = [a.n];
  const short = a.n.replace(/\b(Inc\.?|LLC|Corp\.?|Co\.?|Company|Enterprises|Constructors|Contractors|Contracting|Group)\b\.?/gi, "").replace(/\s+/g, " ").trim();
  if (short.split(" ").length >= 2 && !AMBIGUOUS.test(short)) base.push(short);
  if (a.id === "pcg") base.push("Performance Contracting", "PCI");
  if (a.id === "khss") base.push("KHS&S");
  if (a.id === "daleys") base.push("Daley's Drywall", "Daleys Drywall");
  return [...new Set(base)];
}
const nameRe = n => new RegExp("(^|[^A-Za-z])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]") + "([^A-Za-z]|$)", "i");

export function matchEntities(title, entities) {
  const hits = [];
  for (const e of entities) {
    if (!e.res.some(r => r.test(title))) continue;
    if (AMBIGUOUS.test(e.name) && !CONTEXT.test(title)) continue;
    hits.push(e.id);
  }
  return hits;
}

function classify(title, lens, st, named) {
  if (/\bOrigin\b/.test(title) && /robot/i.test(title)) return null;   /* the founders know their own press */
  if (ROBOT.test(title)) return /dusty|layout/i.test(title) ? "layout" : "robot";
  if (LAG.test(title) && BUILDING.test(title) && !NOT_PROJECT.test(title)) return st || named ? "delay" : null;
  if (/data cent(er|re)|data hall|hyperscale/i.test(title) && BUILD_WORDS.test(title) && !FINANCE.test(title)) return st || named ? "dc" : null;
  if (named && /\b(acquir\w+|merger|expands?|expansion|opens? (new )?(office|location)|new office|new region)\b/i.test(title)) return "growth";
  if (named && /\b(innovation|vdc|technology (lead|director|officer)|chief technology|digital construction)\b/i.test(title)) return "innov";
  if (/\b(labor|labour|worker|workforce|craft) (shortage|gap|crunch|squeeze)|shortage of (workers|labor)\b/i.test(title) && /construct|contractor|trade|craft|drywall/i.test(title)) return "labor";
  return lens === "account" ? "mention" : null;
}

async function fetchFeed(q) {
  const res = await get(RSS(q), { timeout: 20000, retries: 1 });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const pick = tag => (m[1].match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")) || [])[1] || "";
    const raw = decode(pick("title").replace(/<!\[CDATA\[|\]\]>/g, ""));
    const source = decode(pick("source"));
    const title = raw.replace(new RegExp("\\s[-–|]\\s" + source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$"), "").trim()
      .replace(/^(News Releases?|News)\s*\|\s*/i, "").replace(/\s\|\s.{3,70}$/, "");
    const d = new Date(pick("pubDate"));
    return { title, source, url: decode(pick("link")), date: isNaN(d) ? null : isoDay(d) };
  }).filter(x => x.title && x.date);
}

export async function collectNews(G) {
  const rep = report("news", "News scan", "rss", "https://news.google.com/", "Daily");
  const entities = [
    ...G.accounts.map(a => ({ id: a.id, name: a.n, kind: "account", res: aliases(a).map(nameRe) })),
    ...G.gcs.map((g, i) => ({ id: "gc" + i, name: g.n, kind: "gc", res: g.n === "Suffolk" ? [/Suffolk Construction/i, /\bSuffolk\b.*\b(innovation center|general contractor|tech push)\b/i] : [nameRe(g.n)] }))
  ];
  const cutoff = Date.now() - 120 * 86400000;
  const items = new Map();
  let ok = 0, fail = 0;

  const add = (x, lens, forced) => {
    if (Date.parse(x.date) < cutoff) return;
    if (NOT_US.test(x.title) && lens !== "robot") return;
    const hits = matchEntities(x.title, entities);
    if (forced && !hits.includes(forced)) return;   /* per-company search: the name must be in the headline */
    const st = stateOf(x.title + " " + x.source);
    const kind = classify(x.title, lens, st, hits.length > 0);
    if (!kind) return;
    if (kind === "mention" && !hits.some(h => !h.startsWith("gc"))) return;   /* a GC's routine PR is not a signal */
    const id = hash(x.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 70));
    const prev = items.get(id);
    if (prev) { prev.entities = [...new Set([...prev.entities, ...hits])]; return; }
    items.set(id, { id, kind, title: x.title, source: x.source, url: x.url, date: x.date, entities: hits, st });
  };

  for (const { q, lens } of MARKET_QUERIES) {
    try { (await fetchFeed(q)).forEach(x => add(x, lens)); ok++; } catch { fail++; }
    await sleep(700);
  }
  const named = [...G.accounts.filter(a => a.tier !== "excl").map(a => ({ id: a.id, n: a.n })), ...G.gcs.map((g, i) => ({ id: "gc" + i, n: g.n === "Suffolk" ? "Suffolk Construction" : g.n }))];
  for (const e of named) {
    try { (await fetchFeed(`"${e.n}" when:120d`)).forEach(x => add(x, "account", e.id)); ok++; } catch { fail++; }
    await sleep(650);
  }

  /* Two outlets on one job is one signal: keep the newest headline. */
  const words = t => new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter(w => w.length > 3));
  const out = [];
  [...items.values()].sort((a, b) => b.date.localeCompare(a.date)).forEach(i => {
    const w = words(i.title);
    const dupe = out.find(o => o.kind === i.kind && o.st === i.st && [...words(o.title)].filter(x => w.has(x)).length >= 3);
    if (!dupe) out.push(i);
  });
  rep.items = out.length;
  rep.status = fail === 0 ? "ok" : ok > 0 ? "partial" : "failed";
  rep.note = ok + " searches run" + (fail ? ", " + fail + " failed" : "") + ", " + out.filter(i => i.entities.length).length + " headlines name a tracked company";
  return { rep, items: out };
}
