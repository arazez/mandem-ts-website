// Checks the data files against docs/SITE-DATA.md. Read-only: never edits.
// Run: node tools/validate-data.mjs (also run on every push by
// .github/workflows/check-data.yml). Mirrors the bot's own validator in
// gunsmoke-ts-bot/src/data/files.ts, plus the contract's name rules.
import { readFileSync, existsSync } from "node:fs";

const problems = [];
const RESERVED = new Set(["__proto__", "constructor", "prototype"]);

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isInt = (v, min, max = Infinity) => Number.isInteger(v) && v >= min && v <= max;
const isNum = (v, min) => typeof v === "number" && Number.isFinite(v) && v >= min;
const isUtc = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));

function isDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function hasControl(s) {
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

// Perks keys and donor names: 1-40 characters, no control characters, no
// spaces at either end, not reserved, and unique ignoring case.
function checkNames(file, names) {
  const seen = new Map();
  for (const name of names) {
    if (typeof name !== "string" || name.length < 1 || name.length > 40 ||
        name.trim() !== name || hasControl(name) || RESERVED.has(name)) {
      problems.push(`${file}: name ${JSON.stringify(name)} breaks the name rules`);
      continue;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) problems.push(`${file}: "${seen.get(lower)}" and "${name}" differ only in case`);
    else seen.set(lower, name);
  }
}

function load(file, required) {
  if (!existsSync(file)) {
    if (required) problems.push(`${file}: missing`);
    return null;
  }
  const raw = readFileSync(file, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) problems.push(`${file}: starts with a byte order mark`);
  // A Windows checkout may show CRLF; git stores LF (.gitattributes). CI sees the real bytes.
  const text = process.env.CI ? raw : raw.replace(/\r\n/g, "\n");
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    problems.push(`${file}: not valid JSON (${e.message})`);
    return null;
  }
  if (text !== JSON.stringify(data, null, 2) + "\n") {
    problems.push(`${file}: not written as 2-space JSON with a final newline`);
  }
  if (!isObj(data)) {
    problems.push(`${file}: must be a JSON object`);
    return null;
  }
  return data;
}

function need(file, ok, what) {
  if (!ok) problems.push(`${file}: ${what}`);
}

// --- perks.json ---
const perks = load("perks.json", true);
if (perks) {
  const f = "perks.json";
  need(f, perks.lastUpdated === undefined || isDate(perks.lastUpdated), "lastUpdated must be a date like 2026-10-03");
  if (!isObj(perks.perks)) {
    problems.push(`${f}: perks must be an object`);
  } else {
    checkNames(f, Object.keys(perks.perks));
    for (const [name, p] of Object.entries(perks.perks)) {
      const at = `${f} perks.${name}`;
      if (!isObj(p)) { problems.push(`${at}: must be an object`); continue; }
      need(at, p.banner === undefined || isInt(p.banner, 0), "banner must be a whole number >= 0");
      need(at, p.modal === undefined || isInt(p.modal, 0), "modal must be a whole number >= 0");
      need(at, p.mute === undefined || p.mute === true || isDate(p.mute), "mute must be true or a date");
      need(at, p.bannerUntil === undefined || isUtc(p.bannerUntil), "bannerUntil must be a UTC time");
      need(at, p.modalUntil === undefined || isUtc(p.modalUntil), "modalUntil must be a UTC time");
    }
  }
}

// --- donations.json ---
const don = load("donations.json", true);
if (don) {
  const f = "donations.json";
  need(f, isNum(don.goal, 0), "goal must be a number >= 0");
  need(f, isNum(don.raised, 0), "raised must be a number >= 0");
  need(f, don.currency === undefined || typeof don.currency === "string", "currency must be a string");
  need(f, don.closeWhenGoalReached === undefined || typeof don.closeWhenGoalReached === "boolean", "closeWhenGoalReached must be true or false");
  for (const k of ["adminMinimum", "muteMinimum", "maxPerPerson"]) need(f, isInt(don[k], 1), `${k} must be a whole number >= 1`);
  need(f, don.lastUpdated === undefined || isDate(don.lastUpdated), "lastUpdated must be a date like 2026-10-03");
  if (don.window !== undefined) {
    const w = don.window;
    need(f, isObj(w) && isInt(w.month, 1, 12) && isInt(w.day, 1, 31) && isInt(w.days, 1, 366),
      "window must be { month 1-12, day 1-31, days 1-366 }");
  }
  if (!Array.isArray(don.donors)) {
    problems.push(`${f}: donors must be an array`);
  } else {
    don.donors.forEach((d, i) => {
      need(f, isObj(d) && typeof d.name === "string", `donors[${i}] needs a name`);
      need(f, !isObj(d) || d.level === undefined || typeof d.level === "string", `donors[${i}].level must be text`);
    });
    checkNames(f, don.donors.filter((d) => isObj(d) && typeof d.name === "string").map((d) => d.name));
  }
}

// --- leaderboards.json (proposed; optional until the bot creates it) ---
const lb = load("leaderboards.json", false);
if (lb) {
  const f = "leaderboards.json";
  need(f, isUtc(lb.updatedAt), "updatedAt must be a UTC time");
  for (const board of ["trivia", "uno"]) {
    const rows = lb[board];
    if (!Array.isArray(rows)) { problems.push(`${f}: ${board} must be an array`); continue; }
    need(f, rows.length <= 10, `${board} has more than 10 entries`);
    rows.forEach((r, i) => {
      const ok = isObj(r) && typeof r.name === "string" && r.name.length > 0 && isNum(r.points, 0) &&
        (board === "trivia" || (isInt(r.won, 0) && isInt(r.lost, 0)));
      need(f, ok, `${board}[${i}] is not a valid entry`);
    });
  }
}

// --- live.json (proposed; optional until the bot creates it) ---
const live = load("live.json", false);
if (live) {
  const f = "live.json";
  need(f, isUtc(live.updatedAt), "updatedAt must be a UTC time");
  if (!Array.isArray(live.live)) {
    problems.push(`${f}: live must be an array`);
  } else {
    live.live.forEach((s, i) => {
      need(f, isObj(s) && typeof s.name === "string" && s.name.length > 0 &&
        typeof s.twitch === "string" && s.twitch.length > 0 && isUtc(s.since), `live[${i}] is not a valid entry`);
    });
  }
}

if (existsSync("identities.json")) problems.push("identities.json: must never be in this repo");

if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("validate-data: ok");
