/* Live building permits from city open data portals (Socrata), plus Texas TDLR registrations.
   These answer one question: where is large interior work starting right now, and who holds it? */
import { getJson, get, report, stripHtml, titleCase, daysAgo, hash, sleep } from "../lib/util.mjs";

const INTERIOR = /interior|fit[\s-]?out|tenant|renovat|conversion|convert|partition|drywall|gut\b|build[\s-]?out|alteration|hospital|hotel|residential|multifamily|apartment|dormitor|lab\b|office/i;
const NOT_INTERIOR = /^(demolish|demolition)|parking garage|dumpster|sidewalk shed|facade|scaffold|solar|fence|roof replacement|retaining wall/i;
const DATA_CENTER = /data[\s-]?cent(er|re)|data[\s-]?hall|hyperscale|colocation|server farm/i;

function kindOf(text) {
  if (DATA_CENTER.test(text)) return "dc";
  if (/conversion|convert|change of use|change of occupancy/i.test(text)) return "conversion";
  if (/interior|fit[\s-]?out|build[\s-]?out|tenant|gut\b|renovat|alteration/i.test(text)) return "interior";
  return "new";
}
const clip = (s, n = 150) => { s = stripHtml(s).replace(/^(ePlan[^:]*:|DDS 2019 CBC[R]?[.:]?|\(DDS 2019 CBC\)|SELF CERT 2019 CBC:|Hereby filing to|Filing herewith)\s*/i, ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };

async function nyc(rep) {
  const rows = await getJson("https://data.cityofnewyork.us/resource/rbx6-tga4.json?" + new URLSearchParams({
    $where: `issued_date > '${daysAgo(30)}' AND work_type='General Construction'`,
    $limit: "4000", $select: "job_filing_number,filing_reason,house_no,street_name,borough,applicant_business_name,owner_business_name,job_description,estimated_job_costs,issued_date,bin"
  }), { timeout: 45000, retries: 2 });
  const seen = new Set();
  const out = [];
  rows.filter(r => +r.estimated_job_costs >= 2000000).sort((a, b) => b.estimated_job_costs - a.estimated_job_costs).forEach(r => {
    const base = (r.job_filing_number || "").split("-")[0];
    if (seen.has(base)) return;
    seen.add(base);
    const d = r.job_description || "";
    if (!INTERIOR.test(d) || NOT_INTERIOR.test(d.trim())) return;
    out.push({
      id: "nyc-" + base, market: "NYC", city: r.borough, st: "NY", tier: "t1",
      address: [r.house_no, r.street_name].filter(Boolean).join(" ").replace(/\s+/g, " "),
      cost: +r.estimated_job_costs, holder: titleCase(r.applicant_business_name || ""), owner: titleCase(r.owner_business_name || ""),
      desc: clip(d), kind: kindOf(d), date: (r.issued_date || "").slice(0, 10), renewal: /renewal/i.test(r.filing_reason || ""),
      url: "https://a810-dobnow.nyc.gov/publish/Index.html#!/search", src: "NYC DOB NOW"
    });
  });
  rep.items += out.length;
  return out;
}

async function chicago(rep) {
  const rows = await getJson("https://data.cityofchicago.org/resource/ydr8-5enu.json?" + new URLSearchParams({
    $where: `issue_date > '${daysAgo(45)}' AND reported_cost > 2000000`, $limit: "300", $order: "reported_cost DESC"
  }), { timeout: 30000, retries: 2 });
  const out = [];
  rows.forEach(r => {
    const d = r.work_description || "";
    if (!INTERIOR.test(d) || NOT_INTERIOR.test(d.trim())) return;
    let gc = "";
    for (let i = 1; i <= 15; i++) if (/GENERAL CONTRACTOR/i.test(r["contact_" + i + "_type"] || "")) { gc = r["contact_" + i + "_name"]; break; }
    out.push({
      id: "chi-" + (r.permit_ || r.id), market: "Chicago", city: "Chicago", st: "IL", tier: "t2",
      address: [r.street_number, r.street_direction, r.street_name].filter(Boolean).join(" "),
      cost: +r.reported_cost, holder: titleCase(gc), owner: "", desc: clip(d), kind: kindOf(d), date: (r.issue_date || "").slice(0, 10), renewal: false,
      url: "https://data.cityofchicago.org/Buildings/Building-Permits/ydr8-5enu", src: "Chicago Building Permits"
    });
  });
  rep.items += out.length;
  return out;
}

async function seattle(rep) {
  const rows = await getJson("https://data.seattle.gov/resource/76t5-zqzr.json?" + new URLSearchParams({
    $where: `issueddate > '${daysAgo(45)}' AND estprojectcost > 2000000`, $limit: "200", $order: "estprojectcost DESC"
  }), { timeout: 30000, retries: 2 });
  const out = [];
  rows.forEach(r => {
    const d = r.description || "";
    if (!INTERIOR.test(d) || NOT_INTERIOR.test(d.trim())) return;
    out.push({
      id: "sea-" + r.permitnum, market: "Seattle", city: "Seattle", st: "WA", tier: "t2", address: titleCase(r.originaladdress1 || ""),
      cost: +r.estprojectcost, holder: titleCase(r.contractorcompanyname || ""), owner: "", desc: clip(d), kind: kindOf(d), date: (r.issueddate || "").slice(0, 10), renewal: false,
      url: (r.link && r.link.url) || "https://data.seattle.gov/d/76t5-zqzr", src: "Seattle Building Permits"
    });
  });
  rep.items += out.length;
  return out;
}

async function austin(rep) {
  const rows = await getJson("https://data.austintexas.gov/resource/3syk-w9eu.json?" + new URLSearchParams({
    $where: `issue_date > '${daysAgo(45)}' AND total_job_valuation > 2000000`, $limit: "200", $order: "total_job_valuation DESC"
  }), { timeout: 30000, retries: 2 });
  const out = [];
  rows.forEach(r => {
    const d = r.description || "";
    if (!INTERIOR.test(d) || NOT_INTERIOR.test(d.trim())) return;
    out.push({
      id: "aus-" + (r.permit_number || hash(r.original_address1 + d)), market: "Austin", city: "Austin", st: "TX", tier: "t3", address: titleCase(r.original_address1 || ""),
      cost: +r.total_job_valuation, holder: titleCase(r.contractor_company_name || ""), owner: "", desc: clip(d), kind: kindOf(d), date: (r.issue_date || "").slice(0, 10), renewal: false,
      url: (r.link && r.link.url) || "https://data.austintexas.gov/d/3syk-w9eu", src: "Austin Issued Permits"
    });
  });
  rep.items += out.length;
  return out;
}

/* TDLR registers every Texas commercial project. Newest first, so paging the latest two thousand covers about two weeks. */
async function texas(rep) {
  const rows = [];
  for (let start = 0; start < 2000;) {
    const body = new URLSearchParams({ draw: "1", start: String(start), length: "100", "search[value]": "", "search[regex]": "false" }).toString();
    const res = await get("https://www.tdlr.texas.gov/TABS/Search/SearchProjects", {
      method: "POST", body, timeout: 40000, retries: 2,
      headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "x-requested-with": "XMLHttpRequest" }
    });
    if (!res.ok) throw new Error("TDLR HTTP " + res.status);
    const j = await res.json();
    if (!j.data || !j.data.length) break;
    rows.push(...j.data);
    start += j.data.length;
    await sleep(350);
  }
  rep.scanned = rows.length;
  const hits = rows.filter(r => DATA_CENTER.test((r.ProjectName || "") + " " + (r.FacilityName || "")));
  const big = rows.filter(r => !hits.includes(r) && (r.EstimatedCost || 0) >= 15000000 && INTERIOR.test((r.ProjectName || "") + " " + (r.FacilityName || "")));
  const pick = [...hits, ...big.sort((a, b) => b.EstimatedCost - a.EstimatedCost).slice(0, 12)];
  const out = [];
  for (const r of pick.slice(0, 40)) {
    const url = "https://www.tdlr.texas.gov/TABS/Search/Print/" + r.ProjectNumber;
    let city = "", desc = "", area = null, status = "";
    try {
      const res = await get(url, { timeout: 15000 });
      const t = stripHtml(await res.text());
      city = (t.match(/Location Address:.*?\s([A-Z][A-Za-z .'-]{2,28}),\s*TX\b/) || [])[1] || "";
      city = city.replace(/^.*\b(Building|Bldg|Suite|Ste|Unit|Floor|Rd|Road|St|Street|Ave|Avenue|Blvd|Hwy|Pkwy|Dr|Drive|Ln|Way|Fwy|Pike|Trail|Lane|Parkway|Strip|Circle|Court|Ct|Loop|Plaza)\.?\s+/i, "").trim();
      desc = (t.match(/Scope of Work:\s*(.{10,400}?)\s+Square Footage:/i) || [])[1] || "";
      const sq = (t.match(/Square Footage:\s*([\d,]+)/i) || [])[1];
      if (sq) area = +sq.replace(/,/g, "");
      status = (t.match(/Current Status:\s*(.{3,40}?)\s+PERSON/i) || [])[1] || "";
      await sleep(250);
    } catch { /* the listing row is still useful without the detail page */ }
    const text = r.ProjectName + " " + (r.FacilityName || "") + " " + desc;
    out.push({
      id: "tx-" + r.ProjectNumber, market: "Texas", city: titleCase(city), st: "TX", tier: "t3",
      address: titleCase(r.FacilityName || ""), name: r.ProjectName,
      cost: +r.EstimatedCost || 0, holder: "", owner: "", desc: clip(desc || r.ProjectName), kind: kindOf(text), status,
      date: (r.ProjectCreatedOn || "").slice(0, 10), start: (r.EstimatedStartDate || "").slice(0, 10), end: (r.EstimatedEndDate || "").slice(0, 10),
      area, renewal: false, url, src: "Texas TDLR TABS"
    });
  }
  rep.items += out.length;
  return out;
}

export async function collectPermits() {
  const reps = {
    nyc: report("nyc", "NYC building permits", "open data", "https://data.cityofnewyork.us/d/rbx6-tga4", "Daily"),
    chi: report("chi", "Chicago building permits", "open data", "https://data.cityofchicago.org/d/ydr8-5enu", "Daily"),
    sea: report("sea", "Seattle building permits", "open data", "https://data.seattle.gov/d/76t5-zqzr", "Daily"),
    aus: report("aus", "Austin building permits", "open data", "https://data.austintexas.gov/d/3syk-w9eu", "Daily"),
    tx: report("tx", "Texas TDLR filings", "public registry", "https://www.tdlr.texas.gov/TABS/Search", "Daily")
  };
  const jobs = [["nyc", nyc], ["chi", chicago], ["sea", seattle], ["aus", austin], ["tx", texas]];
  const projects = [];
  const results = await Promise.allSettled(jobs.map(([k, fn]) => fn(reps[k])));
  results.forEach((r, i) => {
    const k = jobs[i][0];
    if (r.status === "fulfilled") {
      projects.push(...r.value);
      reps[k].status = "ok";
      reps[k].note = r.value.length + " large interior jobs" + (reps[k].scanned ? " in the latest " + reps[k].scanned + " filings" : "");
    } else {
      reps[k].status = "failed";
      reps[k].note = String(r.reason?.message || r.reason).slice(0, 160);
    }
  });
  projects.sort((a, b) => b.cost - a.cost);
  return { reps: Object.values(reps), projects };
}
