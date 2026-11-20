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
  ["score", "Urgency"]
];

const PHASES = [
  { id: "P1", stage: "POC", name: "Kick-off", ct: "Technical PM", team: "Plan A Sustainability", start: () => 0, dur: () => 1 },
  { id: "P2", stage: "POC", name: "Connect", ct: "Integrations", team: "Product & Technical", start: () => 1, dur: () => 1 },
  { id: "P3", stage: "POC", name: "Calculate", ct: "LCA and Data Science", team: "Product & Sourcing", start: () => 2, dur: () => 1 },
  { id: "P4", stage: "POC", name: "Decide", ct: "Technical PM", team: "Plan A Sustainability", start: () => 3, dur: () => 1 },
  { id: "R1", stage: "Rollout", name: "Connect live systems", ct: "Integrations", team: "IT & Security", start: () => 4, dur: () => 4 },
  { id: "R2", stage: "Rollout", name: "Standardise and calculate", ct: "LCA and Data Science", team: "Product & Technical, Finance", start: () => 8, dur: () => 4 },
  { id: "R3", stage: "Rollout", name: "Anomaly checks", ct: "Technical PM", team: "Plan A Sustainability", start: () => 12, dur: () => 4 },
  { id: "R4", stage: "Rollout", name: "Enablement and go-live", ct: "Technical PM", team: "Plan A Sustainability", start: () => 16, dur: () => 4 }
];

const TASK_TPL = [
  ["T01", "P1", "Kickoff call: confirm sponsor and success criteria", "Carbon Trail", "Sustainability", 1],
  ["T02", "P1", "Agree POC scope: categories, suppliers, sample size", "Carbon Trail", "Sustainability, Product", 3],
  ["T03", "P1", "Share data request list and access needs", "Carbon Trail", "IT", 4],
  ["T04", "P1", "API access to PLM (product specs and BOM)", "Client", "IT", 5],
  ["T05", "P2", "Connect supplier data platform (Higg FEM via Worldly)", "Carbon Trail", "Procurement", 1],
  ["T06", "P2", "Purchase volumes feed from ERP (units bought)", "Client", "Procurement, Finance", 3],
  ["T07", "P2", "Map products, suppliers, facilities, activity to Carbon Trail model", "Carbon Trail", "Product", 5],
  ["T08", "P3", "Flag data gaps and agree proxies for missing inputs", "Carbon Trail", "Sustainability", 3],
  ["T09", "P3", "Supplier follow-up for missing primary data", "Client", "Procurement", 6],
  ["T10", "P3", "Run pilot product footprints (ISO-aligned / PEF)", "Carbon Trail", "Sustainability", 4],
  ["T11", "P3", "Pilot Scope 3 estimate (footprint × units bought)", "Carbon Trail", "Sustainability", 6],
  ["T12", "P4", "Review pilot results with sustainability team", "Client", "Sustainability", 3],
  ["T13", "P4", "POC readout and go / no-go for rollout", "Carbon Trail", "Exec sponsor", 6],
  ["T14", "R1", "Extend connections to the live APIs", "Carbon Trail", "IT", 7],
  ["T15", "R1", "Train category and sourcing users", "Carbon Trail", "Product, Procurement", 14],
  ["T16", "R2", "Full category baseline live", "Carbon Trail", "Product", 25],
  ["T17", "R2", "Steering review", "Carbon Trail", "Exec sponsor", 20],
  ["T18", "R3", "Anomaly checks against the prior baseline", "Carbon Trail", "Sustainability", 21],
  ["T19", "R3", "Reporting outputs aligned to GHG Protocol", "Carbon Trail", "Sustainability", 21],
  ["T20", "R4", "Handover to BAU success plan", "Carbon Trail", "Sustainability", 12]
];

const DATA_TPL = [
  ["PLM – product specs and BOM", "Product", "Product / IT", "API"],
  ["Supplier data platform – facilities", "Facility", "Procurement", "API"],
  ["ERP – purchase orders (units bought)", "Activity", "Finance", "API"],
  ["Supplier master list", "Supplier", "Procurement", "File upload"],
  ["Traceability platform – Tier 2-4 links", "Supplier", "Procurement", "API"]
];

const DEFAULT_WEIGHTS = { schedule: 40, coverage: 25, ownership: 20, movement: 15 };
const WEIGHT_LABELS = { schedule: "Schedule", coverage: "Coverage", ownership: "Ownership", movement: "Movement" };
const TASK_STATUSES = ["Not started", "In progress", "Done", "Blocked"];
const DATA_STATUSES = ["Requested", "Received", "Mapped", "Live"];

function waveWeeks(roll) {
  return Math.max(1, Math.round(Number(roll) * 52 / 12 / 3));
}
function okDate(d) { return d instanceof Date && !isNaN(d.getTime()); }
function D(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return okDate(d) ? d : null;
}
function addDays(d, n) {
  if (!okDate(d)) return null;
  return new Date(d.getTime() + (Number(n) || 0) * 864e5);
}
function daysBetween(a, b) {
  if (!okDate(a) || !okDate(b)) return 0;
  return Math.round((a - b) / 864e5);
}
function iso(d) {
  if (!okDate(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate());
}
function fmt(d) { return okDate(d) ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }) : "—"; }
function fmtY(d) { return okDate(d) ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—"; }
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
    roll: 4,
    asof: "2026-12-28",
    contractStart: "2026-12-07",
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
    parsed.weights = cleanWeights(parsed.weights);
    if (parsed.view === "renewal") parsed.view = "snapshot";
    parsed.clients.forEach((c) => {
      delete c.renewal;
      delete c.renewalStatus;
      delete c.statusReport;
      if (!Array.isArray(c.tasks)) c.tasks = [];
      if (!Array.isArray(c.data)) c.data = [];
      if (!Array.isArray(c.stakeholders)) c.stakeholders = [];
    });
    return scrubAmber(parsed);
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
  return /^amber$/i.test(String(rag || "")) ? "Yellow" : rag;
}
function scrubAmber(node) {
  if (typeof node === "string") return node.replace(/amber/ig, "Yellow");
  if (Array.isArray(node)) return node.map(scrubAmber);
  if (node && typeof node === "object") {
    Object.keys(node).forEach((key) => { node[key] = scrubAmber(node[key]); });
  }
  return node;
}

function rowStats(r) {
  const exp = Math.max(0, Number(r && r.exp) || 0);
  const map = Math.max(0, Number(r && r.map) || 0);
  const pct = exp ? Math.min(100, Math.round(map / exp * 100)) : 0;
  const proxy = Math.max(0, exp - map);
  return { exp, map, pct, proxy };
}
function calc(c) {
  const P = planOf(c);
  const asof = D(c.asof);
  const kick = D(c.kickoff);
  const tasksIn = Array.isArray(c.tasks) ? c.tasks : [];
  const dataIn = Array.isArray(c.data) ? c.data : [];
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  const tasks = tasksIn.map((t) => {
    const phase = byId[t.ph];
    const due = addDays(phase && phase.st ? phase.st : kick, +t.off || 0);
    const late = t.status === "Done" || !okDate(due) || !okDate(asof) ? 0 : Math.max(0, daysBetween(asof, due));
    const until = okDate(due) && okDate(asof) ? daysBetween(due, asof) : 99;
    const rag = t.status === "Done" ? "Done" : (t.status === "Blocked" || late > 0) ? "Red" : (until <= 7 ? "Yellow" : "Green");
    return { ...t, due, late, rag };
  });
  const done = tasks.filter((t) => t.status === "Done").length;
  const blocked = tasks.filter((t) => t.status === "Blocked").length;
  const overdue = tasks.filter((t) => t.late > 0 && t.status !== "Blocked").length;
  const soon = tasks.filter((t) => t.rag === "Yellow").length;
  const rows = dataIn.map(rowStats);
  const exp = rows.reduce((a, r) => a + r.exp, 0);
  const map = rows.reduce((a, r) => a + r.map, 0);
  const proxy = rows.reduce((a, r) => a + r.proxy, 0);
  const sup = dataIn.filter((r) => r.type === "Supplier").map(rowStats);
  const supExp = sup.reduce((a, r) => a + r.exp, 0);
  const supMap = sup.reduce((a, r) => a + r.map, 0);
  const cur = P.filter((p) => okDate(p.st) && okDate(p.en) && okDate(asof) && p.st <= asof && p.en >= asof);
  const nxt = P.filter((p) => okDate(p.st) && okDate(asof) && p.st > asof).sort((a, b) => a.st - b.st)[0] || null;
  const health = (blocked > 0 || overdue > 2) ? "Red" : overdue > 0 ? "Yellow" : "Green";
  const elapsed = okDate(asof) && okDate(kick) ? daysBetween(asof, kick) : -1;
  const weekNum = elapsed >= 0 ? Math.floor(elapsed / 7) + 1 : 0;
  return {
    P, tasks, done, blocked, overdue, soon, exp, map, proxy,
    cov: exp ? Math.min(1, map / exp) : 0,
    supExp, supMap, supCov: supExp ? Math.min(1, supMap / supExp) : 0,
    cur, nxt, health, asof,
    pocEnd: addDays(kick, (+c.poc || 0) * 7 - 1),
    golive: P.length ? P[P.length - 1].en : kick,
    weekNum
  };
}

function openIssues(c) {
  return (c.issues || []).filter((i) => i.status !== "Resolved");
}
function silentPeople(c) {
  const asof = D(c.asof);
  return (c.stakeholders || []).map((p) => {
    if (!p.lastContact) return null;
    return { ...p, age: daysBetween(asof, D(p.lastContact)) };
  }).filter((p) => p && p.age >= 30);
}
function cleanWeights(saved) {
  const keys = Object.keys(DEFAULT_WEIGHTS);
  const old = saved && (saved.onboarding != null || saved.adoption != null || saved.sentiment != null || saved.ttv != null || saved.renewal != null);
  if (!saved || old || !keys.every((key) => saved[key] != null)) return { ...DEFAULT_WEIGHTS };
  const next = {};
  keys.forEach((key) => { next[key] = Math.max(0, Number(saved[key]) || 0); });
  return next;
}
function teamHit(personTeam, label) {
  const needle = String(personTeam || "").trim().toLowerCase();
  if (!needle) return false;
  return String(label || "").split(/[,/]/).some((part) => part.trim().toLowerCase() === needle);
}

function scoreOf(c, k) {
  const w = cleanWeights(state.weights);
  const donePct = k.tasks.length ? Math.round(k.done / k.tasks.length * 100) : 0;
  const schedule = clamp(donePct - k.overdue * 5 - k.blocked * 15, 0, 100);
  const coverage = k.exp ? Math.min(100, Math.round(k.cov * 100)) : 0;
  const gap = k.proxy;
  const openTasks = k.tasks.filter((t) => t.status !== "Done");
  const named = openTasks.filter((t) => String(t.owner || "").trim() && String(t.team || "").trim()).length;
  const ownedItems = openTasks.length;
  const quiet = silentPeople(c).filter((p) => openTasks.some((t) => teamHit(p.team, t.team)));
  const ownership = clamp((ownedItems ? Math.round(named / ownedItems * 100) : 100) - quiet.length * 20, 0, 100);
  const phaseTasks = k.tasks.filter((t) => k.cur.some((p) => p.id === t.ph));
  const moving = phaseTasks.filter((t) => t.status === "In progress" || t.status === "Done");
  let movement = 100;
  let moveLine = "No phase contains the status date.";
  if (!k.cur.length) movement = 40;
  else if (!phaseTasks.length || !moving.length) {
    movement = 20;
    moveLine = k.cur.map((p) => p.name).join("; ") + " is stalled. None of its tasks are in progress or done.";
  } else {
    moveLine = k.cur.map((p) => p.name).join("; ") + " is moving. " + moving.length + " of " + phaseTasks.length + " tasks in that phase are in progress or done.";
  }
  const foot = c.firstFootprint || "";
  const footLine = foot
    ? " First footprint on " + fmtY(D(foot)) + ", " + daysBetween(D(foot), D(c.kickoff)) + " days after kickoff."
    : " No footprint yet.";
  const parts = [
    {
      key: "schedule", label: "Schedule", score: schedule, weight: +w.schedule || 0,
      detail: donePct + "% of tasks are done (" + k.done + " of " + k.tasks.length + "). Each overdue task takes 5. Each blocked task takes 15. " + donePct + " − " + (k.overdue * 5) + " − " + (k.blocked * 15) + " = " + schedule + "."
    },
    {
      key: "coverage", label: "Coverage", score: coverage, weight: +w.coverage || 0,
      detail: k.map.toLocaleString() + " of " + k.exp.toLocaleString() + " records are mapped (" + coverage + "%). " + gap.toLocaleString() + " are still on a proxy."
    },
    {
      key: "ownership", label: "Ownership", score: ownership, weight: +w.ownership || 0,
      detail: named + " of " + ownedItems + " open tasks have a named team. " + (quiet.length ? quiet.map((p) => p.role + " (" + p.team + ") is quiet " + p.age + " days on an open task, so 20 points come off.").join(" ") : "Nobody quiet for 30 days is sitting on an open task.")
    },
    {
      key: "movement", label: "Movement", score: movement, weight: +w.movement || 0,
      detail: moveLine + footLine
    }
  ];
  const weightSum = parts.reduce((a, p) => a + p.weight, 0) || 1;
  parts.forEach((p) => { p.contribution = round1(p.score * p.weight / 100); });
  const total = round1(parts.reduce((a, p) => a + p.contribution, 0));
  return { parts, total, weightSum, schedule, coverage, ownership, movement, urgencies: planIssues(c, k).map((item) => item.line) };
}
function planIssues(c, k) {
  const items = [];
  const team = (value) => String(value || "").trim() || "No team";
  k.tasks.filter((t) => t.status === "Blocked").sort((a, b) => b.late - a.late).forEach((t) => {
    items.push({
      team: team(t.team),
      line: team(t.team) + ": " + t.name + " is blocked. Due " + fmt(t.due) + ".",
      action: team(t.team) + ": unblock " + t.name
    });
  });
  k.tasks.filter((t) => t.late > 0 && t.status !== "Blocked").sort((a, b) => b.late - a.late).forEach((t) => {
    items.push({
      team: team(t.team),
      line: team(t.team) + ": " + t.name + " is " + t.late + " day" + (t.late === 1 ? "" : "s") + " late. Due " + fmt(t.due) + ".",
      action: team(t.team) + ": close " + t.name
    });
  });
  (c.data || []).forEach((r) => {
    const stats = rowStats(r);
    if (stats.exp > 0 && stats.map < stats.exp) {
      items.push({
        team: team(r.owner),
        line: team(r.owner) + ": " + r.sys + " is not fully mapped (" + stats.map.toLocaleString() + " of " + stats.exp.toLocaleString() + ", " + stats.proxy.toLocaleString() + " on proxy).",
        action: team(r.owner) + ": finish mapping " + r.sys
      });
    }
  });
  const open = k.tasks.filter((t) => t.status !== "Done");
  silentPeople(c).forEach((p) => {
    const hit = open.filter((t) => teamHit(p.team, t.team)).sort((a, b) => b.late - a.late)[0];
    if (!hit) return;
    items.push({
      team: team(p.team),
      line: team(p.team) + ": " + p.role + " has not been contacted in " + p.age + " days, while " + hit.name + " is still open. Due " + fmt(hit.due) + ".",
      action: team(p.team) + ": contact " + p.role
    });
  });
  return items;
}
function phaseTeams(k) {
  const names = [];
  k.cur.forEach((p) => String(p.team || "").split(",").forEach((part) => names.push(part.trim())));
  k.tasks.filter((t) => t.status !== "Done" && k.cur.some((p) => p.id === t.ph)).forEach((t) => {
    String(t.team || "").split(",").forEach((part) => names.push(part.trim()));
  });
  return [...new Set(names.filter(Boolean))];
}
function nextTeam(k) {
  const blocked = k.tasks.filter((t) => t.status === "Blocked").sort((a, b) => b.late - a.late)[0];
  if (blocked) return blocked.team || "Unassigned";
  const late = k.tasks.filter((t) => t.late > 0).sort((a, b) => b.late - a.late)[0];
  if (late) return late.team || "Unassigned";
  const open = k.tasks.find((t) => t.status !== "Done");
  return open ? (open.team || "Unassigned") : "No open task";
}
function phaseNow(k) {
  if (k.cur.length) return k.cur.map((p) => p.id + " " + p.name).join(", ");
  if (k.nxt) return "Next · " + k.nxt.id + " " + k.nxt.name;
  return "No open phase";
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
    : k.health === "Yellow" ? " Yellow because " + k.overdue + " task" + (k.overdue === 1 ? " is" : "s are") + " overdue and nothing is blocked." : " Green: nothing is blocked or overdue.";
  const focus = k.tasks.filter((t) => t.rag === "Red" || t.rag === "Yellow").sort((a, b) => (b.status === "Blocked") - (a.status === "Blocked") || b.late - a.late);
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
  const lastPoc = [...k.P].reverse().find((p) => p.stage === "POC");
  const pocWeeks = lastPoc ? lastPoc.sw + lastPoc.w : 4;
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
  if (!k.P.length || !okDate(k.P[0].st)) return;
  const weeks = Math.max(1, ...k.P.map((p) => p.sw + p.w));
  const k0 = k.P[0].st;
  const p5 = [...k.P].reverse().find((p) => p.stage === "POC");
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
    return { c, k, sc };
  }).sort((a, b) => (b.sc.urgencies.length - a.sc.urgencies.length) || ((a.k.health === "Red" ? 0 : a.k.health === "Yellow" ? 1 : 2) - (b.k.health === "Red" ? 0 : b.k.health === "Yellow" ? 1 : 2)));
  const red = rows.filter((r) => r.k.health === "Red").length;
  return `<div class="stack">
    <p class="lede">Which account needs a move, and which team makes it.</p>
    <p class="note">Plan colour is the weekly rule: Red if anything is blocked or three or more tasks are overdue, Yellow if any task is overdue, otherwise Green. Open urgencies are the blocked work, the late work, the proxy gap, and anyone quiet for 30 days.</p>
    <div class="kpis">
      ${kpi("Accounts", rows.length, "Open projects")}
      ${kpi("Plan colour Red", red, "Blocked, or 3+ overdue")}
      ${kpi("Open urgencies", rows.reduce((a, r) => a + r.sc.urgencies.length, 0), "Across these accounts")}
    </div>
    ${rows.map((r) => `<button type="button" class="card account" data-open="${esc(r.c.id)}">
      <div><h2>${esc(r.c.name)}</h2><div class="note">${esc(phaseNow(r.k))}</div></div>
      <div>${pill(r.k.health)}<div class="note">Plan</div></div>
      <div><b>${r.sc.urgencies.length}</b><div class="note">Open urgencies</div></div>
      <div><b>${esc(nextTeam(r.k))}</b><div class="note">Next team</div></div>
    </button>`).join("")}
  </div>`;
}

function kpi(l, v, s) {
  const shown = labelRag(v);
  const tone = shown === "Red" || shown === "Yellow" || shown === "Green" ? " " + shown : "";
  return `<div class="card kpi"><div class="l">${esc(l)}</div><div class="v${tone}">${esc(shown)}</div><div class="s">${esc(s)}</div></div>`;
}

function viewSnapshot(c, k) {
  const issues = planIssues(c, k);
  const phase = k.cur[0];
  const stage = k.cur.length ? [...new Set(k.cur.map((p) => p.stage))].join(" and ") : (c.stage || "Between phases");
  const teams = phaseTeams(k);
  const pct = k.exp ? Math.min(100, Math.round(k.cov * 100)) : 0;
  return `<div class="stack">
    <section class="card">
      <h2>Where the project is</h2>
      <p class="lede">Week ${k.weekNum} · ${esc(stage)}</p>
      <p>${k.cur.length ? k.cur.map((p) => `<b>${esc(p.id)} ${esc(p.name)}</b>`).join("<br>") : "No phase contains the status date."}</p>
      <p class="note">Status date ${fmtY(k.asof)}. Kickoff ${fmtY(D(c.kickoff))}. ${k.nxt ? "Next phase: " + esc(k.nxt.id) + " " + esc(k.nxt.name) + ", starting " + fmt(k.nxt.st) + "." : "No later phase is scheduled."}</p>
    </section>
    <section class="card">
      <h2>Progress</h2>
      <p class="lede">${k.done} of ${k.tasks.length} tasks done</p>
      <p>${pill(k.health)} <span class="note">${esc(healthRule(k))}</span></p>
    </section>
    <section class="card">
      <h2>Open issues</h2>
      <ol class="clean">${issues.map((item) => `<li>${esc(item.line)}</li>`).join("") || "<li>Nothing is blocked, late, unmapped, or sitting with someone quiet.</li>"}</ol>
    </section>
    <section class="card">
      <h2>What to do next</h2>
      <ol class="clean">${issues.slice(0, 3).map((item) => `<li>${esc(item.action)}</li>`).join("") || "<li>No open action. Confirm the next phase with the client team.</li>"}</ol>
    </section>
    <section class="card">
      <h2>Teams on this phase</h2>
      <p class="note">${phase ? esc(phase.id + " " + phase.name) : "No current phase."}</p>
      <div class="teams">${teams.map((name) => `<span class="team">${esc(name)}</span>`).join("") || `<span class="note">No client team is named on this phase.</span>`}</div>
    </section>
    <section class="card">
      <h2>Coverage</h2>
      <p>${k.map.toLocaleString()} mapped · ${k.proxy.toLocaleString()} on proxy · ${pct}%</p>
      <div class="report-block">
        ${(c.data || []).map((r) => {
          const stats = rowStats(r);
          return `<div class="report-row">
            <span>${esc(r.sys)}</span>
            <span>${stats.map.toLocaleString()} / ${stats.exp.toLocaleString()}</span>
            <span>${stats.proxy.toLocaleString()} on proxy · ${stats.pct}%</span>
            <div class="report-bar"><i class="${stats.pct < 50 ? "red" : stats.pct < 80 ? "yellow" : "green"}" style="width:${stats.pct}%"></i></div>
          </div>`;
        }).join("") || `<p class="note">No data sources yet.</p>`}
      </div>
    </section>
    <div class="card stack">
      <div class="legend"><b>Plan on a page</b><span><i class="swatch" style="background:var(--leaf)"></i>POC</span><span><i class="swatch" style="background:var(--roll)"></i>Rollout</span><span><i class="swatch" style="background:var(--red)"></i>Status date</span><button type="button" class="btn" id="ganttBtn">Download Gantt</button></div>
      <div class="scroll">${gantt(k)}</div>
    </div>
  </div>`;
}

function whereLine(c, k) {
  const phase = k.cur[0];
  if (c.id === "ms" && phase && phase.id === "P4") {
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
const taskUi = { q: "", phase: "All", owner: "All", status: "All", colour: "All", sort: "attention" };

function attentionRank(t) {
  const tone = labelRag(t.rag);
  if (tone === "Red") return 0;
  if (tone === "Yellow") return 1;
  return 2;
}

function phaseChoices(c, selected) {
  const ids = phasesOf(c).map((p) => p.id);
  if (selected && !ids.includes(selected)) ids.push(selected);
  return ids.map((id) => `<option${id === selected ? " selected" : ""}>${esc(id)}</option>`).join("");
}
function statusSelect(t) {
  const tone = labelRag(t.rag);
  return `<select class="${esc(tone)}" data-task="${esc(t.id)}" data-key="status" aria-label="Status">${TASK_STATUSES.map((s) => `<option${s === t.status ? " selected" : ""}>${esc(s)}</option>`).join("")}</select>`;
}
function taskCard(c, t, allowEdit) {
  const tone = labelRag(t.rag);
  const editing = allowEdit && openTask.has(t.id);
  const late = t.late > 0 ? ` · ${t.late} day${t.late === 1 ? "" : "s"} late` : "";
  return `<article class="task-card ${esc(tone)}">
    <div class="task-card-top">
      ${pill(tone)}
      ${allowEdit ? `<button type="button" class="text-btn" data-edit-task="${esc(t.id)}">${editing ? "Close" : "Edit"}</button>` : ""}
    </div>
    <h3 class="task-name">${esc(t.name)}</h3>
    <p class="task-meta">${esc(t.ph)} · ${esc(t.owner)} · ${esc(t.team || "No client team")} · Due ${fmt(t.due)}${late}</p>
    ${allowEdit ? `<label class="status-line">Status${statusSelect(t)}</label>` : ""}
    ${editing ? `<div class="task-edit">
      <label>Task<input data-task="${esc(t.id)}" data-key="name" value="${esc(t.name)}"></label>
      <label>Phase<select data-task="${esc(t.id)}" data-key="ph">${phaseChoices(c, t.ph)}</select></label>
      <label>Owner<select data-task="${esc(t.id)}" data-key="owner"><option${t.owner === "Carbon Trail" ? " selected" : ""}>Carbon Trail</option><option${t.owner === "Client" ? " selected" : ""}>Client</option></select></label>
      <label>Client team<input data-task="${esc(t.id)}" data-key="team" value="${esc(t.team)}"></label>
      <label>Day offset<input data-task="${esc(t.id)}" data-key="off" type="number" value="${esc(t.off)}"></label>
      <button type="button" class="btn danger" data-remove-task="${esc(t.id)}">Delete task</button>
    </div>` : ""}
  </article>`;
}
function taskBoard(c, rows) {
  const dueTime = (t) => okDate(t.due) ? t.due.getTime() : 0;
  if (taskUi.sort !== "attention") {
    return `<div class="task-cards">${rows.map((t) => taskCard(c, t, true)).join("")}</div>`;
  }
  return ["Red", "Yellow", "Green", "Done"].map((tone) => {
    const list = rows.filter((t) => labelRag(t.rag) === tone);
    if (!list.length) return "";
    if (tone === "Red") list.sort((a, b) => (b.status === "Blocked") - (a.status === "Blocked") || b.late - a.late || dueTime(a) - dueTime(b));
    else list.sort((a, b) => dueTime(a) - dueTime(b) || String(a.id).localeCompare(String(b.id)));
    return `<section class="task-group"><h3 class="task-group-h"><span class="pill ${esc(tone)}">${esc(tone)}</span> ${list.length}</h3><div class="task-cards">${list.map((t) => taskCard(c, t, true)).join("")}</div></section>`;
  }).join("");
}
function taskList(c, rows, allowEdit) {
  if (!rows.length) return `<p class="note">Nothing late or due in the next 7 days.</p>`;
  return `<div class="task-cards">${rows.map((t) => taskCard(c, t, allowEdit)).join("")}</div>`;
}
function filterOptions(values, selected) {
  return values.map((v) => `<option${v === selected ? " selected" : ""}>${esc(v)}</option>`).join("");
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
  const phases = [...new Set([...phasesOf(c).map((p) => p.id), ...k.tasks.map((t) => t.ph)])];
  let rows = k.tasks.slice();
  const q = taskUi.q.trim().toLowerCase();
  if (q) rows = rows.filter((t) => String(t.name).toLowerCase().includes(q));
  if (taskUi.phase !== "All") rows = rows.filter((t) => t.ph === taskUi.phase);
  if (taskUi.owner !== "All") rows = rows.filter((t) => t.owner === taskUi.owner);
  if (taskUi.status !== "All") rows = rows.filter((t) => t.status === taskUi.status);
  if (taskUi.colour !== "All") rows = rows.filter((t) => labelRag(t.rag) === taskUi.colour);
  const dueTime = (t) => okDate(t.due) ? t.due.getTime() : 0;
  if (taskUi.sort === "due") rows.sort((a, b) => dueTime(a) - dueTime(b) || String(a.id).localeCompare(String(b.id)));
  else if (taskUi.sort === "phase") rows.sort((a, b) => String(a.ph).localeCompare(String(b.ph)) || dueTime(a) - dueTime(b));
  return `<div class="stack">
    <div class="card task-tools">
      <div class="task-filters">
        <label>Search<input id="taskSearch" data-task-filter="q" value="${esc(taskUi.q)}" placeholder="Task name"></label>
        <label>Phase<select data-task-filter="phase">${filterOptions(["All", ...phases], taskUi.phase)}</select></label>
        <label>Owner<select data-task-filter="owner">${filterOptions(["All", "Carbon Trail", "Client"], taskUi.owner)}</select></label>
        <label>Status<select data-task-filter="status">${filterOptions(["All", ...TASK_STATUSES], taskUi.status)}</select></label>
        <label>Colour<select data-task-filter="colour">${filterOptions(["All", "Red", "Yellow", "Green", "Done"], taskUi.colour)}</select></label>
        <label>Sort<select id="taskSort" data-task-filter="sort">
          <option value="attention"${taskUi.sort === "attention" ? " selected" : ""}>Needs attention</option>
          <option value="due"${taskUi.sort === "due" ? " selected" : ""}>Due date</option>
          <option value="phase"${taskUi.sort === "phase" ? " selected" : ""}>Phase</option>
        </select></label>
      </div>
      <div class="row-actions">
        <span class="task-count">${rows.length} of ${k.tasks.length}</span>
        <button type="button" class="btn" id="csvBtn">Download CSV</button>
        <button type="button" class="btn primary" id="addTask">Add task</button>
      </div>
    </div>
    ${rows.length ? taskBoard(c, rows) : `<p class="note">No tasks match these filters.</p>`}
  </div>`;
}

function viewData(c, k) {
  return `<div class="stack">
    <p class="note">Coverage = records mapped ÷ records expected. The rest is on proxy. Supplier primary data uses the rows whose type is Supplier. Carbon Trail connects to the source. It does not collect the supplier data itself.</p>
    <div class="row-actions"><button type="button" class="btn primary" id="addSource">Add source</button></div>
    <div class="kpis">
      ${kpi("Records mapped", Math.min(100, Math.round(k.cov * 100)) + "%", k.map.toLocaleString() + " of " + k.exp.toLocaleString())}
      ${kpi("On proxy", k.proxy.toLocaleString(), "Expected minus mapped, per source")}
      ${kpi("Supplier primary", Math.min(100, Math.round(k.supCov * 100)) + "%", k.supMap.toLocaleString() + " of " + k.supExp.toLocaleString())}
    </div>
    <div class="scroll"><table>
      <thead><tr><th>Source</th><th>Type</th><th>Client owner</th><th>Connection</th><th>Status</th><th>Expected</th><th>Mapped</th><th>Coverage</th><th>On proxy</th><th></th></tr></thead>
      <tbody>${(c.data || []).map((r, i) => {
        const stats = rowStats(r);
        return `<tr>
          <td><input data-row="${i}" data-key="sys" value="${esc(r.sys)}" style="min-width:200px"></td>
          <td><select data-row="${i}" data-key="type">${["Product", "Supplier", "Facility", "Activity"].map((o) => `<option${o === r.type ? " selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><input data-row="${i}" data-key="owner" value="${esc(r.owner)}" style="width:120px"></td>
          <td><select data-row="${i}" data-key="conn">${["API", "File upload"].map((o) => `<option${o === r.conn ? " selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><select data-row="${i}" data-key="status">${DATA_STATUSES.map((o) => `<option${o === r.status ? " selected" : ""}>${o}</option>`).join("")}</select></td>
          <td><input data-row="${i}" data-key="exp" type="number" min="0" value="${esc(r.exp)}" style="width:80px"></td>
          <td><input data-row="${i}" data-key="map" type="number" min="0" value="${esc(r.map)}" style="width:80px"></td>
          <td><div class="cov"><i style="width:${stats.pct}%"></i></div>${stats.pct}%</td>
          <td>${stats.proxy.toLocaleString()}</td>
          <td><button type="button" class="btn danger" data-remove-source="${i}">Delete</button></td>
        </tr>`;
      }).join("")}
      <tr><td colspan="5"><b>Total</b></td><td>${k.exp.toLocaleString()}</td><td>${k.map.toLocaleString()}</td><td>${Math.min(100, Math.round(k.cov * 100))}%</td><td>${k.proxy.toLocaleString()}</td></tr>
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
      <p class="note">Issues stay on the account. They do not change the urgency score.</p>
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
    <p class="lede">Project urgency ${sc.total} out of 100.</p>
    <div class="card">
      <h2>Open urgencies</h2>
      <ul class="clean">${sc.urgencies.map((line) => `<li>${esc(line)}</li>`).join("") || "<li>Nothing is blocked, late, on a proxy, or sitting with someone quiet.</li>"}</ul>
    </div>
    <p class="note">Each line is 0 to 100. Points on the right are that line times its weight. Weights should add to 100. They currently add to ${sc.weightSum}. Plan colour is separate: it is ${labelRag(k.health)} (${esc(healthRule(k))}).</p>
    <div class="card form">
      ${Object.keys(DEFAULT_WEIGHTS).map((key) => `<label>${esc(WEIGHT_LABELS[key])} weight<input class="input" data-weight="${esc(key)}" type="number" min="0" max="100" value="${esc(state.weights[key] != null ? state.weights[key] : DEFAULT_WEIGHTS[key])}"></label>`).join("")}
    </div>
    <div class="card parts">
      ${sc.parts.map((p) => `<div class="part"><div><b>${esc(p.label)}</b><div class="note">${esc(p.detail)}</div></div><div><div class="note">Out of 100</div><div class="pts">${p.score}</div></div><div><div class="note">× ${p.weight}%</div><div class="pts">${p.contribution}</div></div></div>`).join("")}
      <div class="part"><div><b>Total</b><div class="note">Sum of the points.</div></div><div></div><div><div class="pts">${sc.total}</div></div></div>
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
  const views = { today: viewToday, snapshot: () => viewSnapshot(c, k, sc), plan: () => viewPlan(c, k), tasks: () => viewTasks(c, k), data: () => viewData(c, k), people: () => viewPeople(c), score: () => viewScore(c, k, sc) };
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
  if (t.dataset.taskFilter) {
    taskUi[t.dataset.taskFilter] = t.value;
    const id = t.id;
    const pos = t.selectionStart;
    render();
    const next = id && document.getElementById(id);
    if (next) {
      next.focus();
      if (typeof pos === "number" && next.setSelectionRange) next.setSelectionRange(pos, pos);
    }
    return;
  }
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
    if ((t.dataset.field === "kickoff" || t.dataset.field === "asof" || t.dataset.field === "contractStart") && !t.value) return;
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
  const lines = [["ID", "Phase", "Task", "Owner", "Client team", "Due", "Status", "Days late", "Colour"].join(",")];
  k.tasks.forEach((t) => lines.push([t.id, t.ph, q(t.name), t.owner, q(t.team), iso(t.due), t.status, t.late, labelRag(t.rag)].join(",")));
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
  const removeTask = e.target.closest("[data-remove-task]");
  if (removeTask) {
    const c = client();
    c.tasks = c.tasks.filter((task) => task.id !== removeTask.dataset.removeTask);
    openTask.delete(removeTask.dataset.removeTask);
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
  const removeSource = e.target.closest("[data-remove-source]");
  if (removeSource) {
    const c = client();
    c.data.splice(+removeSource.dataset.removeSource, 1);
    save();
    render();
    return;
  }
  if (e.target.id === "addSource") {
    const c = client();
    c.data = c.data || [];
    c.data.push({ sys: "New source", type: "Product", owner: "", conn: "API", status: "Requested", exp: 0, map: 0 });
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
    const n = c.tasks.reduce((max, task) => Math.max(max, Number(String(task.id).replace(/\D/g, "")) || 0), 0) + 1;
    const id = "T" + String(n).padStart(2, "0");
    c.tasks.push({ id, ph: "P1", name: "New task", owner: "Carbon Trail", team: "", off: 0, status: "Not started" });
    openTask.add(id);
    save();
    render();
    return;
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
      const ph = (k.cur[0] && k.cur[0].id) || "P4";
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
  document.getElementById("app").addEventListener("input", (e) => {
    if (e.target.dataset.taskFilter === "q") onChange(e);
  });
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
      kickoff: kick, poc: 4, roll: 3, asof: kick, contractStart: kick,
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
