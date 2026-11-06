/* BLS OEWS, straight from the public API. This is the primary source behind the wage benchmark.
   Series id = OE U {S|N|M} area(7) industry(6) occupation(6) datatype(2); datatype 08 = hourly median, 01 = employment.
   Unregistered keys get 25 requests a day, so the full pull only runs when the cache is a week old or BLS publishes a new year. */
import { getJson, report, readJson, writeJson, sleep } from "../lib/util.mjs";

const FIPS = { AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56" };
const METROS = { "New York": "0035620", Chicago: "0016980", Seattle: "0042660", Boston: "0014460", "San Francisco": "0041860", "Los Angeles": "0031080", Dallas: "0019100", Phoenix: "0038060", Honolulu: "0046520", Philadelphia: "0037980", Atlanta: "0012060", Miami: "0033100", Washington: "0047900", Houston: "0026420", Minneapolis: "0033460", Denver: "0019740", Portland: "0038900" };

/* The trades Origin has said come next, plus the wage series that benchmarks each one. */
export const TRADES = { finishing: "472082", installation: "472081", painting: "472141", conduit: "472111", drilling: "472152" };
const CACHE = "data/wages-cache.json";
const API = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

const stateId = (st, soc, dt) => `OEUS${FIPS[st]}${"0".repeat(11)}${soc}${dt}`;
const metroId = (code, soc, dt) => `OEUM${code}${"0".repeat(6)}${soc}${dt}`;
const natId = (soc, dt) => `OEUN${"0".repeat(13)}${soc}${dt}`;

async function fetchSeries(ids, key) {
  const out = {};
  for (let i = 0; i < ids.length; i += 25) {
    const payload = { seriesid: ids.slice(i, i + 25), startyear: "2024", endyear: String(new Date().getUTCFullYear()) };
    if (key) payload.registrationkey = key;
    const j = await getJson(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), timeout: 30000, retries: 2 });
    if (j.status !== "REQUEST_SUCCEEDED") throw new Error("BLS: " + (j.message || []).join(" ").slice(0, 160));
    for (const s of j.Results?.series || []) {
      const d = s.data?.[0];
      if (d && d.value !== "-" && d.value !== "*") out[s.seriesID] = { value: +d.value, year: d.year };
    }
    await sleep(300);
  }
  return out;
}

export async function collectWages(G) {
  const rep = report("bls", "BLS wage survey", "api", "https://www.bls.gov/oes/", "Daily check");
  const cache = readJson(CACHE, null);
  const key = process.env.BLS_API_KEY || "";
  const age = cache ? (Date.now() - Date.parse(cache.pulledAt)) / 86400000 : 999;
  if (cache && age < 7) {
    rep.status = "ok"; rep.items = Object.keys(cache.states).length;
    rep.note = "Survey year " + cache.year + ". Annual data, re-pulled weekly.";
    return { rep, wages: cache };
  }
  try {
    const sentinel = await fetchSeries([natId(TRADES.finishing, "08")], key);
    const nat = sentinel[natId(TRADES.finishing, "08")];
    if (!nat) throw new Error("national taper series returned no value");

    const states = Object.keys(FIPS);
    const ids = [];
    states.forEach(s => { ids.push(stateId(s, TRADES.finishing, "08")); ids.push(stateId(s, TRADES.finishing, "01")); });
    Object.values(METROS).forEach(c => ids.push(metroId(c, TRADES.finishing, "08")));
    Object.values(TRADES).forEach(soc => { ids.push(natId(soc, "08")); ids.push(natId(soc, "01")); });
    Object.entries(TRADES).forEach(([t, soc]) => { if (t !== "finishing") states.forEach(s => ids.push(stateId(s, soc, "08"))); });
    const r = await fetchSeries(ids, key);

    const out = { pulledAt: new Date().toISOString(), year: nat.year, national: nat.value, states: {}, metros: {}, trades: {} };
    states.forEach(s => {
      const w = r[stateId(s, TRADES.finishing, "08")];
      const e = r[stateId(s, TRADES.finishing, "01")];
      if (w) out.states[s] = { wage: w.value, jobs: e ? e.value : null };
    });
    Object.entries(METROS).forEach(([n, c]) => { const w = r[metroId(c, TRADES.finishing, "08")]; if (w) out.metros[n] = w.value; });
    Object.entries(TRADES).forEach(([t, soc]) => {
      const s = {};
      states.forEach(st => { const w = r[stateId(st, soc, "08")]; if (w) s[st] = w.value; });
      out.trades[t] = { soc, national: r[natId(soc, "08")]?.value ?? null, jobs: r[natId(soc, "01")]?.value ?? null, states: s };
    });

    /* Anything that moved against the researched file is worth showing, not hiding. */
    out.changed = G.wages.filter(w => out.states[w[0]] && Math.abs(out.states[w[0]].wage - w[2]) >= 0.005)
      .map(w => ({ st: w[0], name: w[1], research: w[2], live: out.states[w[0]].wage }));

    writeJson(CACHE, out);
    rep.status = "ok"; rep.items = Object.keys(out.states).length;
    rep.note = Object.keys(out.states).length + " states, " + Object.keys(out.metros).length + " metros, 5 trades. Survey year " + out.year + ".";
    return { rep, wages: out };
  } catch (e) {
    /* OEWS only changes once a year, so a throttled pull with a recent cache is not a real failure. */
    rep.status = cache ? (age < 45 ? "ok" : "stale") : "failed";
    rep.note = cache ? "Survey year " + cache.year + ". Using the last pull; BLS said: " + String(e.message || e).slice(0, 70) : String(e.message || e).slice(0, 160);
    return { rep, wages: cache };
  }
}
