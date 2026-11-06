/* USAspending.gov: federal contracts and subcontracts, public and keyless.
   Two jobs:
   1. Evidence. A contractor named on a federal drywall subaward is working under a prevailing wage, which is
      where the artifact says the cost case is strongest.
   2. Discovery. Searching subaward descriptions surfaces finishing subs that are not on our list yet. */
import { getJson, report, sleep, daysAgo, isoDay, titleCase } from "../lib/util.mjs";

const API = "https://api.usaspending.gov/api/v2/search/spending_by_award/";
const FIELDS = ["Sub-Award ID", "Sub-Awardee Name", "Sub-Award Date", "Sub-Award Amount", "Prime Recipient Name", "Awarding Agency", "Sub-Award Description", "Prime Award ID", "prime_award_generated_internal_id", "Sub-Recipient UEI"];
const TRADE = /drywall|gypsum|gyp\b|metal (stud|fram)|cold[\s-]formed|framing|ceiling|acoustic|partition|plaster|taping|finish|interior|paint|wall/i;
const BROAD = /drywall|gypsum|gyp\b|taping|plaster/i;
const NOT_WORK = /de-?obligat|funding|decrease ceiling|increase ceiling|closeout|close out|\bmod(ification)?\b|\bceiling\/|spec material|ship|vessel|generator/i;
const CODES = ["A", "B", "C", "D"];

const search = (filters, limit = 25) => getJson(API, {
  method: "POST", timeout: 30000, retries: 2, headers: { "content-type": "application/json" },
  body: JSON.stringify({ subawards: true, limit, page: 1, sort: "Sub-Award Amount", order: "desc", fields: FIELDS, filters })
});

const norm = s => String(s || "").toUpperCase().replace(/&/g, " AND ").replace(/[^A-Z0-9 ]/g, " ")
  .replace(/\b(INC|INCORPORATED|LLC|LP|LTD|CORP|CORPORATION|CO|COMPANY|THE|OF|AND)\b/g, " ").replace(/\s+/g, " ").trim();

const clean = s => String(s || "").replace(/\s+/g, " ").trim().slice(0, 90);
const row = r => ({
  name: titleCase(r["Sub-Awardee Name"]), amount: +r["Sub-Award Amount"] || 0, date: r["Sub-Award Date"], prime: titleCase(r["Prime Recipient Name"]),
  agency: r["Awarding Agency"] || "", desc: clean(r["Sub-Award Description"]),
  url: r.prime_award_generated_internal_id ? "https://www.usaspending.gov/award/" + encodeURIComponent(r.prime_award_generated_internal_id) : "https://www.usaspending.gov/"
});

export async function collectFederal(G) {
  const rep = report("fed", "Federal subcontracts", "api", "https://www.usaspending.gov/", "Daily");
  const period = [{ start_date: daysAgo(760), end_date: isoDay() }];
  const known = G.accounts.map(a => ({ id: a.id, key: norm(a.n) })).filter(a => a.key.length > 5);
  const matches = {};
  let ok = 0, fail = 0;

  for (const a of G.accounts.filter(x => x.tier !== "excl")) {
    try {
      const j = await search({ award_type_codes: CODES, recipient_search_text: [a.n.replace(/^The /, "").replace(/ (Inc\.|Corp\.|Co\.|LLC)$/, "")], time_period: period });
      ok++;
      const key = norm(a.n);
      const hits = (j.results || []).map(row).filter(r => {
        const n = norm(r.name);
        const same = key.length < 10 ? n === key : n === key || n.startsWith(key + " ");
        return same && TRADE.test(r.desc) && !NOT_WORK.test(r.desc);
      });
      if (hits.length) matches[a.id] = hits.slice(0, 4);
    } catch { fail++; }
    await sleep(160);
  }

  /* Discovery: who else is doing federal drywall work that we have never looked at? */
  const found = new Map();
  for (const kw of ["drywall", "gypsum", "taping and finishing"]) {
    try {
      const j = await search({ award_type_codes: CODES, keywords: [kw], time_period: [{ start_date: daysAgo(400), end_date: isoDay() }] }, 100);
      ok++;
      (j.results || []).map(row).filter(r => BROAD.test(r.desc) && !NOT_WORK.test(r.desc) && r.amount >= 150000).forEach(r => {
        const k = norm(r.name);
        if (!k || known.some(a => k.startsWith(a.key) || a.key.startsWith(k))) return;
        const f = found.get(k) || { ...r, total: 0, jobs: 0 };
        f.total += r.amount; f.jobs += 1;
        if (r.amount > f.amount) Object.assign(f, { amount: r.amount, prime: r.prime, agency: r.agency, desc: r.desc, url: r.url, date: r.date });
        found.set(k, f);
      });
    } catch { fail++; }
    await sleep(250);
  }
  const discovered = [...found.values()].sort((a, b) => b.total - a.total).slice(0, 24);

  rep.items = Object.keys(matches).length + discovered.length;
  rep.status = ok === 0 ? "failed" : fail ? "partial" : "ok";
  rep.note = Object.keys(matches).length + " tracked contractors on federal jobs, " + discovered.length + " new names discovered";
  return { rep, matches, discovered };
}
