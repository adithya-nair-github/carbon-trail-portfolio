/* Carbon Trail onboarding snapshot. Plan dates, RAG, coverage and plan health
   follow the v1 tracker rules. The 0–100 score is separate and shows its drivers. */

const STORAGE_KEY = "ct-cs-v2";
const VIEWS = [
  ["today", "Today"],
  ["snapshot", "Snapshot"],
  ["plan", "Plan"],
  ["tasks", "Tasks"],
  ["data", "Data"],
  ["people", "People"],
  ["score", "Score"],
  ["renewal", "Renewal"]
];

const PHASES = [
  { id: "P1", stage: "POC", name: "Kickoff & success criteria", ct: "CS & Technical PM", team: "Sustainability", start: () => 0, dur: () => 1 },
  { id: "P2", stage: "POC", name: "Connect data sources (APIs)", ct: "Integrations", team: "IT, Product", start: () => 0, dur: () => 2 },
  { id: "P3", stage: "POC", name: "Standardise & map data", ct: "Data", team: "Product, Procurement", start: () => 1, dur: () => 2 },
  { id: "P4", stage: "POC", name: "Calculate pilot footprints", ct: "Data", team: "Sustainability", start: (s) => s.poc - 2, dur: () => 1 },
  { id: "P5", stage: "POC", name: "Validate & POC readout (go / no-go)", ct: "CS & Technical PM", team: "Sustainability, Exec sponsor", start: (s) => s.poc - 1, dur: () => 1 },
  { id: "R1", stage: "Rollout", name: "Wave 1 – first category group live", ct: "Integrations, Data", team: "Product, Procurement", start: (s) => s.poc, dur: (s) => waveWeeks(s.roll) },
  { id: "R2", stage: "Rollout", name: "Wave 2 – next category group live", ct: "Data", team: "Product, Procurement", start: (s) => s.poc + waveWeeks(s.roll), dur: (s) => waveWeeks(s.roll) },
  { id: "R3", stage: "Rollout", name: "Wave 3 – remaining categories + Scope 3 roll-up", ct: "Data", team: "Sustainability", start: (s) => s.poc + 2 * waveWeeks(s.roll), dur: (s) => waveWeeks(s.roll) },
  { id: "R4", stage: "Rollout", name: "Reporting handover & BAU success plan", ct: "CS & Technical PM", team: "Sustainability", start: (s) => s.poc + 3 * waveWeeks(s.roll) - 2, dur: () => 2 }
];

const TASK_TPL = [
  ["T01", "P1", "Kickoff call: confirm sponsor and success criteria", "Carbon Trail", "Sustainability", 1],
  ["T02", "P1", "Agree POC scope: categories, suppliers, sample size", "Carbon Trail", "Sustainability, Product", 3],
  ["T03", "P1", "Share data request list and access needs", "Carbon Trail", "IT", 4],
  ["T04", "P2", "API access to PLM (product specs and BOM)", "Client", "IT", 5],
  ["T05", "P2", "Connect supplier data platform (e.g. Higg FEM via Worldly)", "Carbon Trail", "Procurement", 8],
  ["T06", "P2", "Purchase volumes feed from ERP (units bought)", "Client", "Procurement, Finance", 10],
  ["T07", "P3", "Map products, suppliers, facilities, activity to Carbon Trail model", "Carbon Trail", "Product", 5],
  ["T08", "P3", "Flag data gaps and agree proxies for missing inputs", "Carbon Trail", "Sustainability", 10],
  ["T09", "P3", "Supplier follow-up for missing primary data", "Client", "Procurement", 13],
  ["T10", "P4", "Run pilot product footprints (ISO-aligned / PEF)", "Carbon Trail", "Sustainability", 4],
  ["T11", "P4", "Pilot Scope 3 estimate (footprint × units bought)", "Carbon Trail", "Sustainability", 6],
  ["T12", "P5", "Review pilot results with sustainability team", "Client", "Sustainability", 3],
  ["T13", "P5", "POC readout and go / no-go for rollout", "Carbon Trail", "Exec sponsor", 6],
  ["T14", "R1", "Extend connections to Wave 1 categories", "Carbon Trail", "IT", 7],
  ["T15", "R1", "Train category and sourcing users", "Carbon Trail", "Product, Procurement", 14],
  ["T16", "R2", "Wave 2 categories live", "Carbon Trail", "Product", 25],
  ["T17", "R2", "Monthly steering review", "Carbon Trail", "Exec sponsor", 20],
  ["T18", "R3", "Wave 3 live; full Scope 3 roll-up", "Carbon Trail", "Sustainability", 25],
  ["T19", "R4", "Reporting outputs aligned to GHG Protocol", "Carbon Trail", "Sustainability", 7],
  ["T20", "R4", "Handover to BAU success plan", "Carbon Trail", "Sustainability", 12]
];

const DATA_TPL = [
  ["PLM – product specs and BOM", "Product", "Product / IT", "API"],
  ["Supplier data platform – facilities", "Facility", "Procurement", "API"],
  ["ERP – purchase orders (units bought)", "Activity", "Finance", "API"],
  ["Supplier master list", "Supplier", "Procurement", "File upload"],
  ["Traceability platform – Tier 2-4 links", "Supplier", "Procurement", "API"]
];

const DEFAULT_WEIGHTS = { onboarding: 30, coverage: 25, adoption: 15, ttv: 15, sentiment: 15 };
const TASK_STATUSES = ["Not started", "In progress", "Done", "Blocked"];
const DATA_STATUSES = ["Requested", "Received", "Mapped", "Live"];

function waveWeeks(roll) {
  return Math.max(1, Math.round(Number(roll) * 52 / 12 / 3));
}
function D(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDays(d, n) { return new Date(d.getTime() + n * 864e5); }
function daysBetween(a, b) { return Math.round((a - b) / 864e5); }
function iso(d) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate());
}
function fmt(d) { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }); }
function fmtY(d) { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }); }
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function round1(n) { return Math.round(n * 10) / 10; }

function blankTasks() {
  return TASK_TPL.map((t) => ({ id: t[0], ph: t[1], name: t[2], owner: t[3], team: t[4], off: t[5], status: "Not started" }));
}
function blankData() {
  return DATA_TPL.map((r) => ({ sys: r[0], type: r[1], owner: r[2], conn: r[3], status: "Requested", exp: 0, map: 0 }));
}
function people(rows) {
  return rows.map((r) => ({ role: r[0], team: r[1], influence: r[2], lastContact: r[3] }));
}

function makeMS() {
  const tasks = blankTasks();
  const st = { T01: "Done", T02: "Done", T03: "Done", T04: "Done", T05: "Done", T06: "In progress", T07: "Done", T08: "In progress", T09: "Blocked", T10: "Done", T11: "In progress" };
  tasks.forEach((t) => { if (st[t.id]) t.status = st[t.id]; });
  tasks[4].name = "Connect supplier data platform (Higg FEM via Worldly)";
  return {
    id: "ms",
    name: "Marks & Spencer",
    kind: "Illustrative worked example. Not Marks & Spencer data.",
    real: true,
    stage: "POC",
    owner: "Adithya Nair",
    kickoff: "2026-12-07",
    poc: 4,
    roll: 3,
    asof: "2026-12-28",
    contractStart: "2026-12-07",
    renewal: "2027-12-07",
    renewalStatus: "Not started",
    licensed: 10,
    activeUsers: 6,
    lastLogin: "2026-12-26",
    firstFootprint: "2026-12-22",
    csat: 8,
    nps: 30,
    tasks,
    data: [
      { sys: "PLM – product specs and BOM", type: "Product", owner: "Product / IT", conn: "API", status: "Mapped", exp: 400, map: 372 },
      { sys: "Higg FEM via Worldly – Tier 1-2 facilities", type: "Facility", owner: "Procurement", conn: "API", status: "Mapped", exp: 120, map: 96 },
      { sys: "ERP – purchase orders (units bought)", type: "Activity", owner: "Finance", conn: "API", status: "Received", exp: 400, map: 210 },
      { sys: "Supplier master list", type: "Supplier", owner: "Procurement", conn: "File upload", status: "Mapped", exp: 150, map: 141 },
      { sys: "Traceability platform – Tier 2-4 links", type: "Supplier", owner: "Procurement", conn: "API", status: "Requested", exp: 150, map: 0 }
    ],
    stakeholders: people([
      ["Exec sponsor", "Sustainability", "High", "2026-12-18"],
      ["Sustainability lead", "Sustainability", "High", "2026-12-22"],
      ["Product lead", "Product", "Medium", "2026-12-15"],
      ["Sourcing lead", "Procurement", "High", "2026-12-20"],
      ["Integrations lead", "IT", "Medium", "2026-11-18"],
      ["Finance partner", "Finance", "Medium", "2026-12-16"]
    ]),
    issues: [
      { title: "Primary data still missing for part of the pilot supplier set", severity: "Sev-2", status: "Waiting on customer", owner: "Client · Procurement", opened: "2026-12-20" }
    ],
    activities: [
      { date: "2026-12-07", type: "Kickoff", note: "Sponsor and success criteria agreed. POC is one category group, not the full catalogue.", next: "Send the data request and the access list." },
      { date: "2026-12-18", type: "Working session", note: "Product mapping is in. Gaps are visible. Proxies are not agreed yet.", next: "Put the proxy list in front of sustainability before the readout." },
      { date: "2026-12-22", type: "Working session", note: "First pilot product footprints are in.", next: "Finish the units feed so Scope 3 can use footprint × units bought." }
    ]
  };
}

function makeNorthloom() {
  const tasks = blankTasks();
  tasks.forEach((t) => {
    if (["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10", "T11", "T12", "T13", "T14", "T15"].includes(t.id)) t.status = "Done";
    if (t.id === "T16" || t.id === "T17") t.status = "In progress";
  });
  return {
    id: "northloom",
    name: "Northloom",
    kind: "Fictional apparel brand. Not a Carbon Trail customer.",
    real: false,
    stage: "Rollout",
    owner: "Adithya Nair",
    kickoff: "2026-10-12",
    poc: 4,
    roll: 3,
    asof: "2026-12-28",
    contractStart: "2026-10-12",
    renewal: "2027-10-12",
    renewalStatus: "Not started",
    licensed: 24,
    activeUsers: 18,
    lastLogin: "2026-12-26",
    firstFootprint: "2026-11-02",
    csat: 8,
    nps: 45,
    tasks,
    data: [
      { sys: "Centric – product and BOM", type: "Product", owner: "Product / IT", conn: "API", status: "Live", exp: 220, map: 214 },
      { sys: "SAP ERP – units bought", type: "Activity", owner: "Finance", conn: "API", status: "Mapped", exp: 220, map: 198 },
      { sys: "Higg FEM via Worldly – facilities", type: "Facility", owner: "Procurement", conn: "API", status: "Mapped", exp: 40, map: 36 },
      { sys: "Supplier master", type: "Supplier", owner: "Procurement", conn: "File upload", status: "Mapped", exp: 80, map: 74 },
      { sys: "TrusTrace – tier links", type: "Supplier", owner: "Procurement", conn: "API", status: "Received", exp: 80, map: 22 }
    ],
    stakeholders: people([
      ["Exec sponsor", "Sustainability", "High", "2026-12-10"],
      ["Sustainability lead", "Sustainability", "High", "2026-12-21"],
      ["Product lead", "Product", "High", "2026-11-20"],
      ["Sourcing lead", "Procurement", "Medium", "2026-12-14"],
      ["Integrations lead", "IT", "Medium", "2026-12-08"],
      ["Finance partner", "Finance", "Medium", "2026-12-11"]
    ]),
    issues: [],
    activities: [
      { date: "2026-11-02", type: "Readout", note: "POC readout was a go. Wave 1 followed.", next: "Keep wave 2 on the category list already agreed." },
      { date: "2026-12-14", type: "Steering", note: "Wave 2 is open. The December steering note is not closed.", next: "Hold the monthly steering this week." }
    ]
  };
}

function seed() {
  return { v: 2, cur: "ms", view: "snapshot", weights: { ...DEFAULT_WEIGHTS }, clients: [makeMS(), makeNorthloom()] };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 2 || !Array.isArray(parsed.clients)) return seed();
    parsed.weights = { ...DEFAULT_WEIGHTS, ...(parsed.weights || {}) };
    return parsed;
  } catch (e) {
    return seed();
  }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}
function client() {
  return state.clients.find((c) => c.id === state.cur) || state.clients[0];
}

function templatePhases(c) {
  const s = { poc: +c.poc || 4, roll: +c.roll || 3 };
  return PHASES.map((p) => ({
    id: p.id,
    stage: p.stage,
    name: p.name,
    ct: p.ct,
    team: p.team,
    sw: p.start(s),
    w: p.dur(s)
  }));
}
function phasesOf(c) {
  return Array.isArray(c.phases) && c.phases.length ? c.phases : templatePhases(c);
}
function touchPhases(c) {
  if (!Array.isArray(c.phases) || !c.phases.length) c.phases = templatePhases(c);
  return c.phases;
}
function planOf(c) {
  const kick = D(c.kickoff);
  return phasesOf(c).map((p) => {
    const sw = Math.max(0, Math.round(Number(p.sw) || 0));
    const w = Math.max(1, Math.round(Number(p.w) || 1));
    const st = addDays(kick, sw * 7);
    return { ...p, sw, w, st, en: addDays(st, w * 7 - 1) };
  });
}
function labelRag(rag) {
  return rag === "Amber" ? "Yellow" : rag;
}

function calc(c) {
  const P = planOf(c);
  const asof = D(c.asof);
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  const tasks = c.tasks.map((t) => {
    const due = addDays(byId[t.ph] ? byId[t.ph].st : D(c.kickoff), +t.off || 0);
    const late = t.status === "Done" ? 0 : Math.max(0, daysBetween(asof, due));
    const rag = t.status === "Done" ? "Done" : (t.status === "Blocked" || late > 0) ? "Red" : (daysBetween(due, asof) <= 7 ? "Amber" : "Green");
    return { ...t, due, late, rag };
  });
  const done = tasks.filter((t) => t.status === "Done").length;
  const blocked = tasks.filter((t) => t.status === "Blocked").length;
  const overdue = tasks.filter((t) => t.late > 0 && t.status !== "Blocked").length;
  const soon = tasks.filter((t) => t.rag === "Amber").length;
  const exp = c.data.reduce((a, r) => a + (+r.exp || 0), 0);
  const map = c.data.reduce((a, r) => a + (+r.map || 0), 0);
  const sup = c.data.filter((r) => r.type === "Supplier");
  const supExp = sup.reduce((a, r) => a + (+r.exp || 0), 0);
  const supMap = sup.reduce((a, r) => a + (+r.map || 0), 0);
  const cur = P.filter((p) => p.st <= asof && p.en >= asof);
  const nxt = P.filter((p) => p.en >= asof).sort((a, b) => a.en - b.en)[0];
  const health = (blocked > 0 || overdue > 2) ? "Red" : overdue > 0 ? "Amber" : "Green";
  const weekNum = daysBetween(asof, D(c.kickoff)) >= 0 ? Math.floor(daysBetween(asof, D(c.kickoff)) / 7) + 1 : 0;
  return {
    P, tasks, done, blocked, overdue, soon, exp, map,
    cov: exp ? map / exp : 0,
    supExp, supMap, supCov: supExp ? supMap / supExp : 0,
    cur, nxt, health, asof,
    pocEnd: addDays(D(c.kickoff), (+c.poc) * 7 - 1),
    golive: P.length ? P[P.length - 1].en : D(c.kickoff),
    weekNum
  };
}

function openIssues(c) {
  return (c.issues || []).filter((i) => i.status !== "Resolved");
}
function silentPeople(c) {
  const asof = D(c.asof);
  return (c.stakeholders || []).map((p) => {
    const age = p.lastContact ? daysBetween(asof, D(p.lastContact)) : 999;
    return { ...p, age };
  }).filter((p) => p.age >= 30);
}

function scoreOf(c, k) {
  const w = state.weights;
  const donePct = k.tasks.length ? Math.round(k.done / k.tasks.length * 100) : 0;
  const onboarding = clamp(donePct - k.overdue * 5 - k.blocked * 10, 0, 100);
  const coverage = Math.round((k.cov * 70) + (k.supCov * 30));
  let adoption = c.licensed ? Math.round((+c.activeUsers || 0) / +c.licensed * 100) : 0;
  const loginAge = c.lastLogin ? daysBetween(D(c.asof), D(c.lastLogin)) : 999;
  if (loginAge > 14) adoption = clamp(adoption - 20, 0, 100);
  adoption = clamp(adoption, 0, 100);
  const target = Math.round((+c.poc || 4) * 7 * 0.75);
  const foot = c.firstFootprint || (k.tasks.find((t) => t.id === "T10" && t.status === "Done") ? iso(k.tasks.find((t) => t.id === "T10").due) : "");
  let ttv = 0;
  let ttvDetail = "No product footprint yet.";
  if (foot) {
    const elapsed = daysBetween(D(foot), D(c.kickoff));
    ttv = elapsed <= target ? 100 : clamp(100 - (elapsed - target) * 4, 0, 100);
    ttvDetail = "First product footprint on " + fmtY(D(foot)) + ", " + elapsed + " days after kickoff. Target for this POC is day " + target + ".";
  } else {
    const elapsed = Math.max(0, daysBetween(D(c.asof), D(c.kickoff)));
    ttv = elapsed <= target ? 60 : clamp(40 - (elapsed - target) * 3, 0, 100);
    ttvDetail = "No footprint date yet. Day " + elapsed + " of the engagement. Target is day " + target + ".";
  }
  const csatScore = clamp(+c.csat || 0, 0, 10) / 10 * 100;
  const npsScore = (clamp(+c.nps || 0, -100, 100) + 100) / 2;
  const sentiment = clamp(Math.round(csatScore * 0.6 + npsScore * 0.4 - openIssues(c).length * 10), 0, 100);
  const parts = [
    {
      key: "onboarding", label: "Onboarding progress", score: onboarding, weight: +w.onboarding || 0,
      detail: donePct + "% of tasks are done (" + k.done + " of " + k.tasks.length + "). Penalty is " + (k.overdue * 5) + " for " + k.overdue + " overdue and " + (k.blocked * 10) + " for " + k.blocked + " blocked. " + donePct + " − " + (k.overdue * 5) + " − " + (k.blocked * 10) + " = " + onboarding + "."
    },
    {
      key: "coverage", label: "Data coverage", score: coverage, weight: +w.coverage || 0,
      detail: Math.round(k.cov * 100) + "% of records are mapped (" + k.map.toLocaleString() + " of " + k.exp.toLocaleString() + "). Suppliers with primary data: " + Math.round(k.supCov * 100) + "% (" + k.supMap.toLocaleString() + " of " + k.supExp.toLocaleString() + "). Score is 70% records and 30% supplier primary."
    },
    {
      key: "adoption", label: "Adoption", score: adoption, weight: +w.adoption || 0,
      detail: (+c.activeUsers || 0) + " active users of " + (+c.licensed || 0) + " licensed seats. Last login " + (c.lastLogin ? fmtY(D(c.lastLogin)) : "not set") + (loginAge > 14 ? ". Login is older than 14 days, so 20 points come off." : ". Login is inside 14 days.")
    },
    { key: "ttv", label: "Time to value", score: ttv, weight: +w.ttv || 0, detail: ttvDetail },
    {
      key: "sentiment", label: "Sentiment", score: sentiment, weight: +w.sentiment || 0,
      detail: "CSAT " + c.csat + "/10 and NPS " + c.nps + ". Open issues: " + openIssues(c).length + ". Each open issue takes 10 points. 60% of the base is CSAT, 40% is NPS rescaled from −100…100."
    }
  ];
  const weightSum = parts.reduce((a, p) => a + p.weight, 0) || 1;
  parts.forEach((p) => { p.contribution = round1(p.score * p.weight / 100); });
  const total = round1(parts.reduce((a, p) => a + p.contribution, 0));
  return { parts, total, weightSum, onboarding, coverage, adoption, ttv, sentiment };
}

function renewalDays(c) { return daysBetween(D(c.renewal), D(c.asof)); }

function whyToday(c, k, sc) {
  const lines = [];
  if (k.blocked) lines.push(k.blocked + " task" + (k.blocked === 1 ? " is" : "s are") + " blocked. Plan health is Red on that rule alone.");
  else if (k.overdue > 2) lines.push(k.overdue + " tasks are overdue. Three or more makes plan health Red.");
  else if (k.overdue) lines.push(k.overdue + " task" + (k.overdue === 1 ? " is" : "s are") + " overdue. Plan health is Yellow.");
  if (sc.total < 60) lines.push("Account score is " + sc.total + ", under 60. The table on Score shows which driver did it.");
  silentPeople(c).forEach((p) => lines.push(p.role + " (" + p.team + ") has not been contacted in " + p.age + " days."));
  const rd = renewalDays(c);
  if (rd >= 0 && rd <= 90 && c.renewalStatus !== "Closed won" && c.renewalStatus !== "Closed lost") {
    lines.push("Renewal is " + fmtY(D(c.renewal)) + ", " + rd + " days out, and the renewal status is " + c.renewalStatus + ".");
  }
  if (!lines.length) lines.push("Nothing in the rules is asking for a conversation today. The next milestone is " + (k.nxt ? k.nxt.name : "complete") + ".");
  return lines;
}

function specificAsk(t) {
  const who = t.owner + " · " + t.team;
  if (t.id === "T09") return { who, say: "The supplier follow-up is blocked. Ask procurement for a date. Where primary data is still missing, agree a proxy and keep the source on the record. Do not present the proxy as if the supplier sent it." };
  if (t.id === "T06") return { who, say: "The units-bought feed is late. Scope 3 for the pilot is product footprint times units bought. Without the volumes, the roll-up is not ready to stand behind." };
  if (t.id === "T08") return { who, say: "We owe sustainability the gap list and the proxy proposed for each gap, before the readout." };
  if (t.id === "T11") return { who, say: "Finish the pilot Scope 3 estimate with the units already in, and label what is still uncovered." };
  if (t.id === "T12") return { who, say: "Put the pilot review with sustainability on this week's calendar. Walk hotspots, proxies, and what the sample does not cover." };
  if (t.id === "T13") return { who, say: "The go / no-go sits with the exec sponsor. Ask for a decision on wave 1, with the proxy share written down." };
  if (t.id === "T17") return { who, say: "The monthly steering is late. Use it to confirm the wave in progress and name the one blocker, if there is one." };
  const when = t.late ? t.late + " days late" : "due " + fmt(t.due);
  return { who, say: t.name + " is " + t.status.toLowerCase() + " and " + when + ". Agree an owner and a date on the call." };
}

function callScript(c, k) {
  const phase = k.cur.length ? k.cur.map((p) => p.name).join("; ") : "Between phases";
  const open = "Status date " + fmtY(k.asof) + ". Week " + k.weekNum + ". Current phase: " + phase + ". Plan health is " + labelRag(k.health) + ".";
  const reason = k.health === "Red"
    ? (k.blocked ? " Red because " + k.blocked + " task" + (k.blocked === 1 ? " is" : "s are") + " blocked" + (k.overdue ? " and " + k.overdue + " more are overdue" : "") + "." : " Red because " + k.overdue + " tasks are overdue.")
    : k.health === "Amber" ? " Yellow because " + k.overdue + " task" + (k.overdue === 1 ? " is" : "s are") + " overdue and nothing is blocked." : " Green: nothing is blocked or overdue.";
  const focus = k.tasks.filter((t) => t.rag === "Red" || t.rag === "Amber").sort((a, b) => (b.status === "Blocked") - (a.status === "Blocked") || b.late - a.late);
  const asks = focus.slice(0, 4).map(specificAsk);
  const proxy = Math.max(0, k.exp - k.map);
  const dataLine = k.exp
    ? (k.map.toLocaleString() + " of " + k.exp.toLocaleString() + " records are mapped (" + Math.round(k.cov * 100) + "%). " + proxy.toLocaleString() + " are still on proxy. Supplier primary data is " + Math.round(k.supCov * 100) + "%.")
    : "No expected records yet. Coverage stays blank until the data request has volumes.";
  return { open: open + reason, asks, dataLine, done: k.done + " of " + k.tasks.length + " tasks are done." };
}

function gantt(k) {
  if (!k.P.length) return `<p class="note">No phases yet. Add a phase to draw the plan.</p>`;
  const weeks = Math.max(1, ...k.P.map((p) => p.sw + p.w));
  const k0 = k.P[0].st;
  const pocWeeks = k.P.find((p) => p.id === "P5") ? k.P.find((p) => p.id === "P5").sw + k.P.find((p) => p.id === "P5").w : 4;
  const tw = daysBetween(k.asof, k0) / 7;
  const cols = `minmax(190px,230px) repeat(${weeks}, minmax(26px,1fr))`;
  let h = `<div class="gantt" style="grid-template-columns:${cols}">`;
  h += `<div class="lbl hd">Phase</div>`;
  for (let w = 0; w < weeks; w++) {
    h += `<div class="wk hd${w < pocWeeks ? " pocband" : ""}">${esc(fmt(addDays(k0, w * 7)).replace(" ", "\u00a0"))}</div>`;
  }
  k.P.forEach((p) => {
    h += `<div class="lbl"><b>${p.id}</b> ${esc(p.name)}</div>`;
    for (let w = 0; w < weeks; w++) {
      const on = w >= p.sw && w < p.sw + p.w;
      let cell = "";
      if (on) {
        const cls = (p.stage === "POC" ? "poc" : "roll") + (w === p.sw ? " s" : "") + (w === p.sw + p.w - 1 ? " e" : "");
        cell += `<i class="bar ${cls}"></i>`;
      }
      if (tw >= w && tw < w + 1) cell += `<i class="today" style="left:${((tw - w) * 100).toFixed(1)}%"></i>`;
      h += `<div class="wk${w < pocWeeks ? " pocband" : ""}">${cell}</div>`;
    }
  });
  return h + "</div>";
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + "…").width > max) cut = cut.slice(0, -1);
  return cut + "…";
}

function downloadGantt() {
  const c = client();
  const k = calc(c);
  if (!k.P.length) return;
  const weeks = Math.max(1, ...k.P.map((p) => p.sw + p.w));
  const k0 = k.P[0].st;
  const p5 = k.P.find((p) => p.id === "P5");
  const pocWeeks = p5 ? p5.sw + p5.w : 4;
  const tw = daysBetween(k.asof, k0) / 7;
  const scale = 2;
  const labelW = 300;
  const weekW = 68;
  const rowH = 38;
  const head = 96;
  const pad = 20;
  const width = pad * 2 + labelW + weeks * weekW;
  const height = head + rowH + k.P.length * rowH + 40;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#14241c";
  ctx.font = "600 22px Georgia, serif";
  ctx.fillText(c.name, pad, 34);
  ctx.font = "13px Segoe UI, sans-serif";
  ctx.fillStyle = "#5c6d64";
  ctx.fillText("Onboarding plan", pad, 56);
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.fillStyle = "#1f6b45";
  roundRect(ctx, pad, 70, 18, 8, 3);
  ctx.fill();
  ctx.fillStyle = "#5c6d64";
  ctx.fillText("POC", pad + 24, 78);
  ctx.fillStyle = "#2f5f78";
  roundRect(ctx, pad + 70, 70, 18, 8, 3);
  ctx.fill();
  ctx.fillStyle = "#5c6d64";
  ctx.fillText("Rollout", pad + 94, 78);
  ctx.fillStyle = "#8e332e";
  ctx.fillRect(pad + 168, 68, 2, 12);
  ctx.fillStyle = "#5c6d64";
  ctx.fillText("Status date", pad + 176, 78);

  const top = head;
  const left = pad;
  ctx.fillStyle = "#f7f8f6";
  ctx.fillRect(left, top, labelW + weeks * weekW, rowH);
  for (let w = 0; w < weeks; w++) {
    const x = left + labelW + w * weekW;
    if (w < pocWeeks) {
      ctx.fillStyle = "#f3faf6";
      ctx.fillRect(x, top, weekW, rowH);
    }
    ctx.fillStyle = "#5c6d64";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.fillText(fmt(addDays(k0, w * 7)), x + 6, top + 23);
  }
  ctx.fillStyle = "#5c6d64";
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.fillText("Phase", left + 10, top + 23);

  k.P.forEach((p, i) => {
    const y = top + rowH * (i + 1);
    for (let w = 0; w < weeks; w++) {
      ctx.fillStyle = w < pocWeeks ? "#f7fbf8" : "#ffffff";
      ctx.fillRect(left + labelW + w * weekW, y, weekW, rowH);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(left, y, labelW, rowH);
    ctx.strokeStyle = "#e1e6e1";
    ctx.beginPath();
    ctx.moveTo(left, y + rowH + 0.5);
    ctx.lineTo(left + labelW + weeks * weekW, y + rowH + 0.5);
    ctx.stroke();
    const barX = left + labelW + p.sw * weekW + 4;
    const barW = Math.max(10, p.w * weekW - 8);
    ctx.fillStyle = p.stage === "POC" ? "#1f6b45" : "#2f5f78";
    roundRect(ctx, barX, y + 9, barW, rowH - 18, 5);
    ctx.fill();
    ctx.fillStyle = "#14241c";
    ctx.font = "600 12px Segoe UI, sans-serif";
    ctx.fillText(p.id, left + 10, y + 23);
    ctx.font = "12px Segoe UI, sans-serif";
    ctx.fillText(fitText(ctx, p.name, labelW - 52), left + 38, y + 23);
  });

  if (tw >= 0 && tw <= weeks) {
    ctx.fillStyle = "#8e332e";
    ctx.fillRect(left + labelW + tw * weekW, top, 2, rowH * (k.P.length + 1));
  }
  ctx.fillStyle = "#5c6d64";
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.fillText("POC ends " + fmt(k.pocEnd) + "   ·   handover " + fmtY(k.golive), pad, height - 16);

  const name = c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-gantt.png";
  const finish = (blob) => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  if (canvas.toBlob) canvas.toBlob((blob) => { if (blob) finish(blob); }, "image/png");
  else finish(dataUrlToBlob(canvas.toDataURL("image/png")));
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function pill(rag) {
  const shown = labelRag(rag);
  return `<span class="pill ${esc(shown)}">${esc(shown)}</span>`;
}

function methodStrip() {
  return `<div class="steps">
    <div class="step"><b>1 · Extract</b> Read the API payload or the export the team already has.</div>
    <div class="step"><b>2 · Resolve</b> Map it to product, supplier, facility and activity. Surface gaps.</div>
    <div class="step"><b>3 · Calculate</b> Product footprint, then footprint × units bought for Scope 3.</div>
    <div class="step"><b>4 · Reuse</b> The same records feed the next wave and the reporting handover.</div>
  </div>`;
}

function viewToday() {
  const rows = state.clients.map((c) => {
    const k = calc(c);
    const sc = scoreOf(c, k);
    return { c, k, sc, why: whyToday(c, k, sc) };
  }).sort((a, b) => (a.k.health === "Red" ? 0 : a.k.health === "Amber" ? 1 : 2) - (b.k.health === "Red" ? 0 : b.k.health === "Amber" ? 1 : 2));
  const red = rows.filter((r) => r.k.health === "Red").length;
  const low = rows.filter((r) => r.sc.total < 60).length;
  const renewing = rows.filter((r) => { const d = renewalDays(r.c); return d >= 0 && d <= 90 && r.c.renewalStatus !== "Closed won"; }).length;
  const silent = rows.reduce((a, r) => a + silentPeople(r.c).length, 0);
  return `<div class="stack">
    <p class="lede">Who needs a conversation, and why.</p>
    <p class="note">Plan health is the weekly rule: Red if anything is blocked or three or more tasks are overdue, Yellow if any task is overdue, otherwise Green. The account score is the longer view. A healthy score does not cancel a late steering review.</p>
    <div class="kpis">
      ${kpi("Accounts", rows.length, "In this book")}
      ${kpi("Plan health Red", red, "Blocked, or 3+ overdue")}
      ${kpi("Score under 60", low, "See the five drivers")}
      ${kpi("Renewals in 90 days", renewing, "Status still open")}
      ${kpi("Contacts gone quiet", silent, "30 days or more")}
    </div>
    ${rows.map((r) => `<button type="button" class="card account" data-open="${esc(r.c.id)}">
      <div><span class="tag">${esc(r.c.stage)} · ${esc(r.c.owner)}</span><h2>${esc(r.c.name)}</h2></div>
      <div>${pill(r.k.health)}<div class="note">Plan health</div><div style="margin-top:6px"><b>${r.sc.total}</b> <span class="note">/ 100</span></div></div>
      <div class="note">${r.why.map(esc).join("<br>")}</div>
      <div class="btn">Open</div>
    </button>`).join("")}
  </div>`;
}

function kpi(l, v, s) {
  const shown = labelRag(v);
  const tone = shown === "Red" || shown === "Yellow" || shown === "Green" ? " " + shown : "";
  return `<div class="card kpi"><div class="l">${esc(l)}</div><div class="v${tone}">${esc(shown)}</div><div class="s">${esc(s)}</div></div>`;
}

function viewSnapshot(c, k, sc) {
  const script = callScript(c, k);
  const focus = k.tasks.filter((t) => t.rag === "Red" || t.rag === "Amber").sort((a, b) => b.late - a.late);
  const quiet = silentPeople(c);
  return `<div class="stack">
    <p class="lede">${esc(whereLine(c, k))}</p>
    <div class="kpis">
      ${kpi("Plan health", k.health, healthRule(k))}
      ${kpi("Account score", sc.total, "Out of 100, drivers on Score")}
      ${kpi("Tasks done", k.done + " / " + k.tasks.length, k.soon + " due within 7 days")}
      ${kpi("Data coverage", Math.round(k.cov * 100) + "%", Math.max(0, k.exp - k.map).toLocaleString() + " records on proxy")}
      ${kpi("This phase ends", k.nxt ? fmt(k.nxt.en) : "—", k.nxt ? k.nxt.id + " " + k.nxt.name : "Plan complete")}
    </div>
    ${methodStrip()}
    <div class="card">
      <h2>Teams on this engagement</h2>
      <p class="note" style="margin:6px 0 10px">The POC needs a decision from sustainability and the exec sponsor. The data comes from product, IT, procurement and finance. Rollout adds the category users who will live in the waves.</p>
      <div class="teams">
        <span class="team">Sustainability · success criteria, proxies, readout</span>
        <span class="team">Exec sponsor · go / no-go</span>
        <span class="team">Product · scope and mapping</span>
        <span class="team">IT · API access</span>
        <span class="team">Procurement · supplier platform and follow-up</span>
        <span class="team">Finance · units bought</span>
      </div>
    </div>
    <div class="card stack">
      <div class="legend"><b>Plan on a page</b><span><i class="swatch" style="background:var(--leaf)"></i>POC</span><span><i class="swatch" style="background:var(--roll)"></i>Rollout</span><span><i class="swatch" style="background:var(--red)"></i>Status date</span><span>POC ends ${fmt(k.pocEnd)} · handover ${fmtY(k.golive)}</span><button type="button" class="btn" id="ganttBtn">Download Gantt</button></div>
      <div class="scroll">${gantt(k)}</div>
    </div>
    <div class="say">
      <h2>What to say on the weekly call</h2>
      <p>${esc(script.open)} ${esc(script.done)}</p>
      <ol>${script.asks.map((a) => `<li><span class="who">${esc(a.who)}</span>${esc(a.say)}</li>`).join("") || "<li>Nothing is late or due this week. Confirm the next milestone and the owner.</li>"}</ol>
      <p style="margin-top:10px">${esc(script.dataLine)}</p>
    </div>
    <div class="card">
      <div class="row-actions" style="justify-content:space-between;margin-bottom:8px">
        <h2>Red and yellow · who moves next</h2>
        <span class="note">Change a status. The colour, the plan health and the call notes update together.</span>
      </div>
      ${taskList(c, focus, true)}
    </div>
    ${quiet.length ? `<div class="card"><h2>People gone quiet</h2><p class="note" style="margin-top:6px">${quiet.map((p) => esc(p.role + " · " + p.team + " · last contact " + p.lastContact + " · " + p.age + " days")).join("<br>")}</p></div>` : ""}
    <div class="row-actions no-print">
      <button type="button" class="btn primary" id="printBtn">Print this page</button>
      <button type="button" class="btn" id="csvBtn">Download tasks as CSV</button>
      <button type="button" class="btn" data-goto="score">Show the score maths</button>
    </div>
    <footer class="sources note">Product wording checked against carbontrail.net on 20 Nov 2026: home, data integrations, customer stories for CALIDA, Mammut and Deichmann, and the pricing page. Standards named from those pages include GHG Protocol, PEF, ISO 14040/44, ISO-aligned product LCAs, French environmental cost, and digital product passports. Connectors named from the integrations page include SAP, Dynamics 365, Centric, Infor, WFX, PTC FlexPLM, BigQuery, Snowflake, Higg/Worldly, Enablon, Sphera, TrusTrace and Retraced. This page is a concept for the Marks & Spencer assessment. It is not a client deliverable and not their data.</footer>
  </div>`;
}

function whereLine(c, k) {
  const phase = k.cur[0];
  if (c.id === "ms" && phase && phase.id === "P5") {
    return "Week " + k.weekNum + " of the POC. The readout starts on the status date. Plan health is " + labelRag(k.health) + " for a specific reason, and the pilot footprints are already in.";
  }
  if (phase) return "Week " + k.weekNum + ". " + phase.id + " " + phase.name + " is the open phase. Plan health is " + labelRag(k.health) + ".";
  if (k.asof > k.golive) return "The planned handover date has passed. Plan health is " + labelRag(k.health) + ".";
  return "The status date is before kickoff. Plan health is " + labelRag(k.health) + ".";
}
function healthRule(k) {
  if (k.blocked && k.overdue > 2) return k.blocked + " blocked and " + k.overdue + " overdue";
  if (k.blocked) return k.blocked + " blocked";
  if (k.overdue > 2) return k.overdue + " overdue";
  if (k.overdue) return k.overdue + " overdue";
  return "Nothing blocked or overdue";
}

const openTask = new Set();

function phaseChoices(c, selected) {
  const ids = phasesOf(c).map((p) => p.id);
  if (selected && !ids.includes(selected)) ids.push(selected);
  return ids.map((id) => `<option${id === selected ? " selected" : ""}>${esc(id)}</option>`).join("");
}
function statusSelect(t) {
  const tone = labelRag(t.rag);
  return `<select class="${esc(tone)}" data-task="${esc(t.id)}" data-key="status" aria-label="Status">${TASK_STATUSES.map((s) => `<option${s === t.status ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>`;
}
function taskRow(c, t, allowEdit) {
  const tone = labelRag(t.rag);
  const editing = allowEdit && openTask.has(t.id);
  return `<article class="task-row">
    <div>
      <div class="task-name">${esc(t.name)}</div>
      <div class="task-meta">${esc(t.ph)} · ${esc(t.team || "No client team")}${allowEdit ? ` <button type="button" class="text-btn" data-edit-task="${esc(t.id)}">${editing ? "Close" : "Edit"}</button>` : ""}</div>
      ${editing ? `<div class="task-edit">
        <label>Task<input data-task="${esc(t.id)}" data-key="name" value="${esc(t.name)}"></label>
        <label>Phase<select data-task="${esc(t.id)}" data-key="ph">${phaseChoices(c, t.ph)}</select></label>
        <label>Client team<input data-task="${esc(t.id)}" data-key="team" value="${esc(t.team)}"></label>
        <label>Day offset<input data-task="${esc(t.id)}" data-key="off" type="number" value="${esc(t.off)}"></label>
      </div>` : ""}
    </div>
    <div><select data-task="${esc(t.id)}" data-key="owner" aria-label="Who"><option${t.owner === "Carbon Trail" ? " selected" : ""}>Carbon Trail</option><option${t.owner === "Client" ? " selected" : ""}>Client</option></select></div>
    <div class="task-due">${fmt(t.due)}</div>
    <div class="status-chip">
      <span class="pill ${esc(tone)}">${esc(tone)}</span>
      ${statusSelect(t)}
    </div>
  </article>`;
}
function taskList(c, rows, allowEdit) {
  if (!rows.length) return `<p class="note">Nothing late or due in the next 7 days.</p>`;
  return `<div class="task-list">
    <div class="task-head"><span>Task</span><span>Who</span><span>Due</span><span>Status</span></div>
    ${rows.map((t) => taskRow(c, t, allowEdit)).join("")}
  </div>`;
}

function viewPlan(c, k) {
  const phases = phasesOf(c);
  return `<div class="stack">
    <div class="card">
      <h2>Setup</h2>
      <p class="note" style="margin:4px 0 10px">Kickoff is a Monday. Phase dates are calculated from the start week and the duration in the table below.</p>
      <div class="form">
        ${field("name", "Account name", c.name, "text")}
        ${field("kickoff", "Kickoff", c.kickoff, "date")}
        ${field("poc", "POC length (weeks)", c.poc, "number")}
        ${field("roll", "Rollout length (months)", c.roll, "number")}
        ${field("asof", "Status date", c.asof, "date")}
        ${field("stage", "Stage", c.stage, "text")}
      </div>
    </div>
    <div class="card stack">
      <div class="legend"><b>Plan on a page</b><span><i class="swatch" style="background:var(--leaf)"></i>POC</span><span><i class="swatch" style="background:var(--roll)"></i>Rollout</span><span><i class="swatch" style="background:var(--red)"></i>Status date</span><button type="button" class="btn" id="ganttBtn">Download Gantt</button></div>
      <div class="scroll">${gantt(k)}</div>
    </div>
    <div class="row-actions">
      <button type="button" class="btn primary" id="addPhase">Add phase</button>
    </div>
    <div class="scroll"><table class="phase-table">
      <thead><tr><th>ID</th><th>Phase</th><th>Start week</th><th>Weeks</th><th>Carbon Trail lead</th><th>Client team</th><th>Start</th><th>End</th><th></th></tr></thead>
      <tbody>${k.P.map((p, i) => `<tr>
        <td>${esc(p.id)}</td>
        <td><input data-phase="${i}" data-key="name" value="${esc(phases[i].name)}"></td>
        <td><input data-phase="${i}" data-key="sw" type="number" min="0" value="${esc(p.sw)}" style="width:72px"></td>
        <td><input data-phase="${i}" data-key="w" type="number" min="1" value="${esc(p.w)}" style="width:72px"></td>
        <td><input data-phase="${i}" data-key="ct" value="${esc(phases[i].ct)}"></td>
        <td><input data-phase="${i}" data-key="team" value="${esc(phases[i].team)}"></td>
        <td>${fmt(p.st)}</td>
        <td>${fmtY(p.en)}</td>
        <td><button type="button" class="btn danger" data-remove-phase="${i}">Delete</button></td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}
function field(key, label, value, type) {
  return `<label>${esc(label)}<input class="input" data-field="${esc(key)}" type="${type}" value="${esc(value)}"${type === "number" ? " min='1'" : ""}></label>`;
}

function viewTasks(c, k) {
  return `<div class="stack">
    <div class="row-actions">
      <button type="button" class="btn primary" id="csvBtn">Download CSV</button>
      <button type="button" class="btn" id="addTask">Add task</button>
    </div>
    ${taskList(c, k.tasks, true)}
  </div>`;
}

function viewData(c, k) {
  return `<div class="stack">
    <p class="note">Coverage = records mapped ÷ records expected. The rest is on proxy. Supplier primary data uses the rows whose type is Supplier. Carbon Trail connects to the source. It does not collect the supplier data itself.</p>
    <div class="kpis">
      ${kpi("Records mapped", Math.round(k.cov * 100) + "%", k.map.toLocaleString() + " of " + k.exp.toLocaleString())}
      ${kpi("On proxy", Math.max(0, k.exp - k.map).toLocaleString(), "Expected minus mapped")}
      ${kpi("Supplier primary", Math.round(k.supCov * 100) + "%", k.supMap.toLocaleString() + " of " + k.supExp.toLocaleString())}
    </div>
    <div class="scroll"><table>
      <thead><tr><th>Source</th><th>Type</th><th>Client owner</th><th>Connection</th><th>Status</th><th>Expected</th><th>Mapped</th><th>Coverage</th><th>On proxy</th></tr></thead>
      <tbody>${c.data.map((r, i) => {
        const cv = r.exp ? Math.min(1, r.map / r.exp) : 0;
        return `<tr>
          <td><input data-row="${i}" data-key="sys" value="${esc(r.sys)}" style="min-width:200px"></td>
          <td><select data-row="${i}" data-key="type">${["Product", "Supplier", "Facility", "Activity"].map((o) => `<option${o === r.type ? " selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><input data-row="${i}" data-key="owner" value="${esc(r.owner)}" style="width:120px"></td>
          <td><select data-row="${i}" data-key="conn">${["API", "File upload"].map((o) => `<option${o === r.conn ? " selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><select data-row="${i}" data-key="status">${DATA_STATUSES.map((o) => `<option${o === r.status ? " selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><input data-row="${i}" data-key="exp" type="number" min="0" value="${esc(r.exp)}" style="width:80px"></td>
          <td><input data-row="${i}" data-key="map" type="number" min="0" value="${esc(r.map)}" style="width:80px"></td>
          <td><div class="cov"><i style="width:${Math.round(cv * 100)}%"></i></div>${Math.round(cv * 100)}%</td>
          <td>${Math.max(0, (+r.exp || 0) - (+r.map || 0)).toLocaleString()}</td>
        </tr>`;
      }).join("")}
      <tr><td colspan="5"><b>Total</b></td><td>${k.exp.toLocaleString()}</td><td>${k.map.toLocaleString()}</td><td>${Math.round(k.cov * 100)}%</td><td>${Math.max(0, k.exp - k.map).toLocaleString()}</td></tr>
      </tbody></table></div>
  </div>`;
}

function viewPeople(c) {
  return `<div class="stack">
    <div class="row-actions"><button type="button" class="btn primary" id="addPerson">Add person</button></div>
    <div class="scroll"><table>
      <thead><tr><th>Role</th><th>Team</th><th>Influence</th><th>Last contact</th><th>Quiet?</th><th></th></tr></thead>
      <tbody>${(c.stakeholders || []).map((p, i) => {
        const age = p.lastContact ? daysBetween(D(c.asof), D(p.lastContact)) : null;
        const quiet = age !== null && age >= 30;
        return `<tr>
          <td><input data-person="${i}" data-key="role" value="${esc(p.role)}" placeholder="Role"></td>
          <td><select data-person="${i}" data-key="team">${["Sustainability", "Procurement", "Product", "IT", "Finance"].map((t) => `<option${t === p.team ? " selected" : ""}>${t}</option>`).join("")}</select></td>
          <td><select data-person="${i}" data-key="influence">${["High", "Medium", "Low"].map((t) => `<option${t === p.influence ? " selected" : ""}>${t}</option>`).join("")}</select></td>
          <td><input data-person="${i}" data-key="lastContact" type="date" value="${esc(p.lastContact || "")}"></td>
          <td>${quiet ? pill("Red") + " " + age + " days" : pill("Green")}</td>
          <td><button type="button" class="btn danger" data-remove-person="${i}">Delete</button></td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    <div class="card stack">
      <h2>Issues</h2>
      <p class="note">An open issue takes 10 points off sentiment. Resolving it puts the points back. This is separate from plan health.</p>
      ${(c.issues || []).map((issue, i) => `<div class="form">
        <label>Title<input data-issue="${i}" data-key="title" value="${esc(issue.title)}"></label>
        <label>Severity<select data-issue="${i}" data-key="severity">${["Sev-1", "Sev-2", "Sev-3"].map((s) => `<option${s === issue.severity ? " selected" : ""}>${s}</option>`).join("")}</select></label>
        <label>Status<select data-issue="${i}" data-key="status">${["New", "Investigating", "Waiting on customer", "Escalated", "Resolved"].map((s) => `<option${s === issue.status ? " selected" : ""}>${s}</option>`).join("")}</select></label>
        <label>Owner<input data-issue="${i}" data-key="owner" value="${esc(issue.owner)}"></label>
      </div>`).join("") || `<p class="note">No open or closed issues on this account.</p>`}
      <button type="button" class="btn" id="addIssue">Add issue</button>
    </div>
    <div class="card stack">
      <h2>Activity</h2>
      ${(c.activities || []).map((a) => `<p><b>${esc(a.date)} · ${esc(a.type)}.</b> ${esc(a.note)} ${a.next ? `<span class="note">Next: ${esc(a.next)}</span>` : ""}</p>`).join("")}
      <div class="form">
        <label>Note<textarea id="actNote" placeholder="What was agreed"></textarea></label>
        <label>Next step<textarea id="actNext" placeholder="Becomes a task on the current phase"></textarea></label>
      </div>
      <button type="button" class="btn primary" id="addAct">Save note</button>
    </div>
  </div>`;
}

function viewScore(c, k, sc) {
  return `<div class="stack">
    <p class="lede">Account score ${sc.total} out of 100.</p>
    <p class="note">Each driver is a number from 0 to 100. Contribution = driver × weight. Weights are editable and should add to 100. They currently add to ${sc.weightSum}. Plan health is not this score. Plan health is ${labelRag(k.health)}: ${esc(healthRule(k))}.</p>
    <div class="card form">
      ${Object.keys(DEFAULT_WEIGHTS).map((key) => `<label>${esc(key)} weight<input class="input" data-weight="${esc(key)}" type="number" min="0" max="100" value="${esc(state.weights[key])}"></label>`).join("")}
    </div>
    <div class="card parts">
      ${sc.parts.map((p) => `<div class="part"><div><b>${esc(p.label)}</b><div class="note">${esc(p.detail)}</div></div><div><div class="note">Driver</div><div class="pts">${p.score}</div></div><div><div class="note">× ${p.weight}%</div><div class="pts">${p.contribution}</div></div></div>`).join("")}
      <div class="part"><div><b>Total</b><div class="note">Sum of the contributions.</div></div><div></div><div><div class="pts">${sc.total}</div></div></div>
    </div>
  </div>`;
}

function viewRenewal(c, k, sc) {
  const rd = renewalDays(c);
  const trace = c.data.find((r) => /trace/i.test(r.sys));
  return `<div class="stack">
    <div class="form card">
      ${field("contractStart", "Contract start", c.contractStart, "date")}
      ${field("renewal", "Renewal date", c.renewal, "date")}
      <label>Renewal status<select data-field="renewalStatus">${["Not started", "Outreach", "Proposal", "Negotiation", "Closed won", "Closed lost"].map((s) => `<option${s === c.renewalStatus ? " selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    </div>
    <div class="kpis">
      ${kpi("Days to renewal", rd, fmtY(D(c.renewal)))}
      ${kpi("Account score", sc.total, sc.total < 60 ? "Under 60. Raise it before a renewal conversation." : "60 or above.")}
      ${kpi("Plan health", k.health, healthRule(k))}
    </div>
    <div class="card">
      <h2>Questions worth raising later</h2>
      <p class="note" style="margin:6px 0 8px">These are questions, not a forecast. Nothing here is a commitment from ${esc(c.name)}.</p>
      <ul class="clean">
        <li>More categories: waves 1 to 3 are the agreed path after a go. A further category is a separate conversation.</li>
        <li>More of the supplier set on primary data: supplier primary coverage is ${Math.round(k.supCov * 100)}% in this example.</li>
        ${trace ? `<li>${esc(trace.sys)} is ${esc(trace.status).toLowerCase()}. ${(+trace.map || 0).toLocaleString()} of ${(+trace.exp || 0).toLocaleString()} mapped. Connecting the rest is the expansion, once the pilot decision is made.</li>` : ""}
        <li>A second brand or banner only if the sponsor raises the group. Do not assume it.</li>
      </ul>
    </div>
  </div>`;
}

function render() {
  const c = client();
  state.cur = c.id;
  const k = calc(c);
  const sc = scoreOf(c, k);
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === state.view));
  const sel = document.getElementById("clientSel");
  sel.innerHTML = state.clients.map((a) => `<option value="${esc(a.id)}"${a.id === c.id ? " selected" : ""}>${esc(a.name)}</option>`).join("");
  const views = { today: viewToday, snapshot: () => viewSnapshot(c, k, sc), plan: () => viewPlan(c, k), tasks: () => viewTasks(c, k), data: () => viewData(c, k), people: () => viewPeople(c), score: () => viewScore(c, k, sc), renewal: () => viewRenewal(c, k, sc) };
  document.getElementById("app").innerHTML = (views[state.view] || views.snapshot)();
}

function setClientField(key, value) {
  const c = client();
  if (["poc", "roll", "licensed", "activeUsers", "csat", "nps"].includes(key)) value = Number(value);
  c[key] = value;
  save();
  render();
}

function onChange(e) {
  const t = e.target;
  const c = client();
  if (t.dataset.phase != null) {
    const phases = touchPhases(c);
    const phase = phases[+t.dataset.phase];
    if (!phase) return;
    if (t.dataset.key === "sw") phase.sw = Math.max(0, Math.round(Number(t.value) || 0));
    else if (t.dataset.key === "w") phase.w = Math.max(1, Math.round(Number(t.value) || 1));
    else phase[t.dataset.key] = t.value;
    save();
    render();
    return;
  }
  if (t.dataset.field) {
    if ((t.dataset.field === "kickoff" || t.dataset.field === "asof" || t.dataset.field === "renewal" || t.dataset.field === "contractStart") && !t.value) return;
    setClientField(t.dataset.field, t.type === "number" ? Math.max(1, +t.value || 1) : t.value);
    return;
  }
  if (t.dataset.task) {
    const task = c.tasks.find((x) => x.id === t.dataset.task);
    if (!task) return;
    task[t.dataset.key] = t.dataset.key === "off" ? Number(t.value || 0) : t.value;
    save();
    render();
    return;
  }
  if (t.dataset.row != null) {
    const row = c.data[+t.dataset.row];
    if (!row) return;
    row[t.dataset.key] = (t.dataset.key === "exp" || t.dataset.key === "map") ? Math.max(0, +t.value || 0) : t.value;
    save();
    render();
    return;
  }
  if (t.dataset.person != null) {
    const p = c.stakeholders[+t.dataset.person];
    if (!p) return;
    p[t.dataset.key] = t.value;
    save();
    render();
    return;
  }
  if (t.dataset.issue != null) {
    const issue = c.issues[+t.dataset.issue];
    if (!issue) return;
    issue[t.dataset.key] = t.value;
    save();
    render();
    return;
  }
  if (t.dataset.weight) {
    state.weights[t.dataset.weight] = Math.max(0, Number(t.value || 0));
    save();
    render();
  }
}

function downloadCsv() {
  const c = client();
  const k = calc(c);
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [["ID", "Phase", "Task", "Owner", "Client team", "Due", "Status", "Days late", "RAG"].join(",")];
  k.tasks.forEach((t) => lines.push([t.id, t.ph, q(t.name), t.owner, q(t.team), iso(t.due), t.status, t.late, t.rag].join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + "-tasks.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function onClick(e) {
  const goto = e.target.closest("[data-goto]");
  if (goto) { state.view = goto.dataset.goto; save(); render(); return; }
  const open = e.target.closest("[data-open]");
  if (open) { state.cur = open.dataset.open; state.view = "snapshot"; save(); render(); return; }
  if (e.target.id === "csvBtn") downloadCsv();
  if (e.target.id === "ganttBtn") downloadGantt();
  if (e.target.id === "printBtn") window.print();
  const removePhase = e.target.closest("[data-remove-phase]");
  if (removePhase) {
    const c = client();
    const phases = touchPhases(c);
    phases.splice(+removePhase.dataset.removePhase, 1);
    save();
    render();
    return;
  }
  const removePerson = e.target.closest("[data-remove-person]");
  if (removePerson) {
    const c = client();
    c.stakeholders.splice(+removePerson.dataset.removePerson, 1);
    save();
    render();
    return;
  }
  const editTask = e.target.closest("[data-edit-task]");
  if (editTask) {
    const id = editTask.dataset.editTask;
    if (openTask.has(id)) openTask.delete(id);
    else openTask.add(id);
    render();
    return;
  }
  if (e.target.id === "addPhase") {
    const c = client();
    const phases = touchPhases(c);
    const last = phases[phases.length - 1];
    let n = 1;
    while (phases.some((p) => p.id === "X" + n)) n += 1;
    const sw = last ? (Number(last.sw) || 0) + Math.max(1, Number(last.w) || 1) : 0;
    phases.push({ id: "X" + n, stage: "Rollout", name: "New phase", ct: "", team: "", sw, w: 1 });
    save();
    render();
    return;
  }
  if (e.target.id === "addPerson") {
    const c = client();
    c.stakeholders = c.stakeholders || [];
    c.stakeholders.push({ role: "", team: "Sustainability", influence: "Medium", lastContact: "" });
    save();
    render();
    return;
  }
  if (e.target.id === "addTask") {
    const c = client();
    const n = c.tasks.length + 1;
    c.tasks.push({ id: "T" + String(n).padStart(2, "0"), ph: "P1", name: "New task", owner: "Carbon Trail", team: "", off: 0, status: "Not started" });
    save();
    render();
  }
  if (e.target.id === "addIssue") {
    const c = client();
    c.issues = c.issues || [];
    c.issues.push({ title: "New issue", severity: "Sev-3", status: "New", owner: "Carbon Trail", opened: c.asof });
    save();
    render();
  }
  if (e.target.id === "addAct") {
    const c = client();
    const note = document.getElementById("actNote").value.trim();
    const next = document.getElementById("actNext").value.trim();
    if (!note && !next) return;
    c.activities = c.activities || [];
    c.activities.push({ date: c.asof, type: "Note", note: note || "Note added.", next });
    if (next) {
      const k = calc(c);
      const ph = (k.cur[0] && k.cur[0].id) || "P5";
      const n = c.tasks.length + 1;
      c.tasks.push({ id: "T" + String(n).padStart(2, "0"), ph, name: next, owner: "Carbon Trail", team: "Sustainability", off: 3, status: "Not started" });
    }
    save();
    render();
  }
}

function boot() {
  const nav = document.getElementById("nav");
  nav.innerHTML = VIEWS.map(([id, label]) => `<button type="button" data-view="${id}">${label}</button>`).join("");
  nav.addEventListener("click", (e) => {
    if (!e.target.dataset.view) return;
    state.view = e.target.dataset.view;
    save();
    render();
  });
  document.getElementById("app").addEventListener("change", onChange);
  document.getElementById("app").addEventListener("click", onClick);
  document.getElementById("clientSel").addEventListener("change", (e) => { state.cur = e.target.value; save(); render(); });
  document.getElementById("newBtn").addEventListener("click", () => { document.getElementById("modal").hidden = false; document.getElementById("newName").focus(); });
  document.getElementById("cancelNew").addEventListener("click", () => { document.getElementById("modal").hidden = true; });
  document.getElementById("newForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newName").value.trim();
    if (!name) return;
    const id = "c" + Date.now();
    const kick = nextMonday();
    state.clients.push({
      id, name, kind: "Illustrative. Created from the template in this browser.", real: false, stage: "POC", owner: "Adithya Nair",
      kickoff: kick, poc: 4, roll: 3, asof: kick, contractStart: kick, renewal: iso(addDays(D(kick), 365)), renewalStatus: "Not started",
      licensed: 8, activeUsers: 0, lastLogin: kick, firstFootprint: "", csat: 0, nps: 0,
      tasks: blankTasks(), data: blankData(),
      stakeholders: people([["Exec sponsor", "Sustainability", "High", kick], ["Sustainability lead", "Sustainability", "High", kick], ["Product lead", "Product", "Medium", kick], ["Sourcing lead", "Procurement", "Medium", kick], ["Integrations lead", "IT", "Medium", kick], ["Finance partner", "Finance", "Medium", kick]]),
      issues: [], activities: []
    });
    state.cur = id;
    state.view = "plan";
    document.getElementById("modal").hidden = true;
    save();
    render();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    state = seed();
    save();
    render();
  });
  render();
}

function nextMonday() {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = utc.getUTCDay();
  const n = (8 - day) % 7 || 7;
  return iso(addDays(utc, n));
}

boot();
