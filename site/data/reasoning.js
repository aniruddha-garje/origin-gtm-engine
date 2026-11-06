/* The reasoning layer. research.js holds the facts, unchanged from the original work.
   This file holds the thinking drawn on top of those facts: why an event is on the calendar,
   how the robot veterans were found, and what changes when the engine moves to a new trade. */
window.REASON = {

  /* Two signals added to the original twelve so a name can be on the list for a reason the
     daily run actually detects. Both flow through the same capped signal score. */
  addSignals: [
    { k: "delay", n: "Project under schedule pressure", w: 10, why: "A named job is slipping. Recovering a finishing schedule takes capacity, not overtime.", where: "Daily news scan", freq: "Daily", play: "p4", src: [] },
    { k: "fed", n: "Federal job on the books", w: 8, why: "Federal work pays prevailing wages, which is where the cost case is strongest.", where: "USAspending subawards", freq: "Daily", play: "p2", src: ["s24"] }
  ],

  /* The one-word reasons a name is on the list. */
  reasons: {
    robot: { label: "Tried robots", icon: "◆", about: "Already put a robot on a live job" },
    wage: { label: "High wage", icon: "$", about: "Finisher hours cost more than the robot" },
    lag: { label: "Project lagging", icon: "!", about: "A job is slipping and needs capacity" },
    fed: { label: "Federal job", icon: "★", about: "Prevailing wage work on the books" },
    dc: { label: "Data centers", icon: "▦", about: "Long continuous walls on tight schedules" },
    near: { label: "Near NYC team", icon: "◎", about: "Inside the deployment team's reach" },
    crew: { label: "Big crews", icon: "▲", about: "Staffing gap felt daily by the super" },
    grow: { label: "Growing", icon: "↗", about: "Growth is outrunning hiring" },
    union: { label: "Union crews", icon: "◉", about: "Higher loaded rates, known operator path" },
    lean: { label: "Lean or prefab", icon: "▤", about: "Already measures and changes process" },
    tech: { label: "Tech sponsor", icon: "⬡", about: "Someone owns new technology" },
    scale: { label: "Top 50 volume", icon: "≡", about: "Enough continuous wall area to keep robots busy" }
  },

  /* Why each event earned a place. */
  lenses: [
    { id: "buyer", n: "Buyers in the room", about: "The contractor's own association" },
    { id: "gc", n: "GCs who pull work through", about: "They open doors to their subs" },
    { id: "dc", n: "Data center builders", about: "Where the tight schedules are" },
    { id: "pilot", n: "Pilot countries", about: "Home shows for Origin's pilots" },
    { id: "cred", n: "Credibility and talent", about: "Hiring, research, recognition" },
    { id: "watch", n: "Watch, do not spend", about: "Right industry, wrong moment" },
    { id: "wrong", n: "Wrong room", about: "Big show, no drywall buyers" }
  ],
  eventLens: {
    build27: "buyer", pcaexpo27: "buyer", pcacc26: "buyer",
    woc27: "gc", agc27: "gc", ftech27: "gc", gb27: "gc", ibs27: "gc",
    dca27: "dc", dcw27: "dc",
    bau27: "pilot", big5g26: "pilot", b5s_may27: "pilot", b5s_sep27: "pilot",
    rse27: "cred", isarc27: "cred", bts26: "cred",
    jbuild26: "watch", dcweek27: "watch", nmhc27: "watch",
    ces27: "wrong", automate27: "wrong"
  },
  eventPaths: [
    ["Start at the buyer", "Who does a finishing contractor already trust? AWCI and PCA."],
    ["Follow the money", "Where GCs and data center builders meet their subs."],
    ["Map the pilots", "Each Origin pilot country has a home show."],
    ["Rate the room", "Buyer fit out of 5, then the cheapest format that still reaches them."]
  ],
  fitLadder: [
    { fit: 5, rule: "Bring the robot" },
    { fit: 4, rule: "Light booth or walk" },
    { fit: 3, rule: "Walk, speak or submit" },
    { fit: 2, rule: "Monitor, or walk if cheap" },
    { fit: 1, rule: "Skip" }
  ],

  /* How the robot veterans were found: start from the vendors, not the contractors. */
  vetPaths: [
    ["Start from the vendors", "Canvas, Okibo and layout robots all publish who they work with."],
    ["Read every partner trail", "Programs, case studies, investor notes, trade press."],
    ["Tag what each one ran", "Finishing robot or layout robot. Sub or GC."],
    ["Ask if they are free", "Canvas went to JLG. Okibo is scaling. That decides the play."]
  ],
  vendors: [
    { id: "canvas", n: "Canvas", kind: "Finishing robot", state: "Core tech sold to JLG, Jan 2026", read: "Partners may be between programs", src: ["s34", "s36"] },
    { id: "okibo", n: "Okibo", kind: "Finishing robot", state: "Scaling a national fleet", read: "Committed for now", src: ["s29", "s31"] },
    { id: "layout", n: "Layout robots", kind: "Dusty Robotics and peers", state: "Prints the floor plan on the slab", read: "Robot-comfortable, finishing is the next step", src: ["s41", "s42"] }
  ],
  vetLinks: [
    { v: "canvas", n: "Nevell Group", acct: "nevell", role: "Innovation partner", src: ["s36"] },
    { v: "canvas", n: "KHS&S Contractors", acct: "khss", role: "Innovation partner", src: ["s36"] },
    { v: "canvas", n: "Daley's Drywall", acct: "daleys", role: "Ran it with union crews", src: ["s36", "s38"] },
    { v: "canvas", n: "California Drywall", acct: "caldrywall", role: "Innovation partner", src: ["s37"] },
    { v: "canvas", n: "Webcor", gc: true, role: "Used it on SFO Terminal B", src: ["s38"] },
    { v: "canvas", n: "DPR Construction", gc: true, role: "Innovation partner", src: ["s36"] },
    { v: "canvas", n: "Swinerton", gc: true, role: "Innovation partner", src: ["s36"] },
    { v: "canvas", n: "Suffolk", gc: true, role: "Strategic investor, 2021", src: ["s62"] },
    { v: "okibo", n: "Performance Contracting", acct: "pcg", role: "Scaling a fleet with PCI", src: ["s29", "s30"] },
    { v: "okibo", n: "Hensel Phelps", gc: true, role: "Hosted the EG7+ debut", src: ["s31"] },
    { v: "layout", n: "Ford Drywall & Stucco", acct: "forddw", role: "Layout robot user", src: ["s41"] },
    { v: "layout", n: "South Valley", acct: "southvalley", role: "Layout robot user", src: ["s72"] },
    { v: "layout", n: "Swinerton", gc: true, role: "Trains in-house operators", src: ["s42"] },
    { v: "layout", n: "DPR Construction", gc: true, role: "Licensed its Laybot to Dusty", src: ["s43"] },
    { v: "layout", n: "Turner Construction", gc: true, role: "Robotic layout at Ohio State", src: ["s63"] }
  ],
  timeline: [
    { y: "2021", t: "Suffolk invests in Canvas", src: "s62" },
    { y: "2023", t: "USG and Hilti partner with Canvas", src: "s39" },
    { y: "Jul 2024", t: "Canvas ships the 1200CX", src: "s64" },
    { y: "Apr 2025", t: "Okibo opens a US HQ in New Jersey", src: "s33" },
    { y: "Nov 2025", t: "Origin's first New York deployment", src: "s5", origin: true },
    { y: "Jan 2026", t: "JLG buys Canvas's core technology", src: "s34", key: true },
    { y: "Mar 2026", t: "Okibo and PCI announce a national fleet", src: "s29", key: true },
    { y: "Oct 2026", t: "Origin raises $20M", src: "s5", origin: true }
  ],

  /* The same engine, pointed at the next trade. */
  trades: [
    { id: "finishing", n: "Drywall finishing", status: "Live", occ: "Tapers", soc: "47-2082", buyer: "Wall and ceiling subs", list: "W&C Top 50, Siteline", robots: "Canvas, Okibo, layout robots", assoc: "AWCI", show: "BUILD27", note: "Taping rides on this same wage series." },
    { id: "painting", n: "Priming and painting", status: "Started", occ: "Painters", soc: "47-2141", buyer: "Commercial painters", list: "Siteline painting list", robots: "ConBotics, Les Companions, Okibo", assoc: "PCA", show: "PCA EXPO", note: "Seven accounts are already scored." },
    { id: "installation", n: "Drywall installation", status: "Next", occ: "Drywall and ceiling tile installers", soc: "47-2081", buyer: "The same wall and ceiling subs", list: "Same list, no new prospecting", robots: "To research", assoc: "AWCI", show: "BUILD27", note: "Same buyer, same booth. The cheapest trade to add." },
    { id: "conduit", n: "Conduit", status: "Then", occ: "Electricians", soc: "47-2111", buyer: "Electrical subs", list: "To build", robots: "To research", assoc: "To confirm", show: "To research", note: "New buyer, so a new list and a new show." },
    { id: "drilling", n: "Drilling", status: "Then", occ: "Plumbers and pipefitters, as a proxy", soc: "47-2152", buyer: "Mechanical and electrical subs", list: "To build", robots: "To research", assoc: "To confirm", show: "To research", note: "No single wage series covers drilling, so this one is a proxy." }
  ],
  tradeKnobs: [
    ["Wage series", "One BLS occupation code", "swap"],
    ["Target list", "The trade's own ranking", "swap"],
    ["Robot history", "Who already ran that robot", "swap"],
    ["Association and show", "Where that buyer gathers", "swap"],
    ["Permit and federal scans", "Same feeds, new keywords", "keep"],
    ["Scoring model", "Same five factors", "keep"],
    ["Tiers and plays", "Same logic, new copy", "keep"],
    ["Daily run and this portal", "Unchanged", "keep"]
  ],

  /* Sweeps the daily run now does itself, versus those still done by a person. */
  sweepStatus: {
    "Taper and finisher postings by metro": "manual",
    "Texas data center filings (TDLR TABS)": "auto",
    "NYC job filings (DOB NOW)": "auto",
    "Federal wage determinations": "manual",
    "Trade press": "auto",
    "LinkedIn Sales Navigator": "manual",
    "Competitor alerts": "auto",
    "Event attendee and exhibitor lists": "manual"
  }
};
