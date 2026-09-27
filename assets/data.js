// The only place that reads the site's data files. Formats and rules:
// docs/SITE-DATA.md. Each loader resolves (never rejects) to one of:
//   { status: "ok", data }   file loaded; data cleaned up as described below
//   { status: "missing" }    file doesn't exist (yet)
//   { status: "error" }      couldn't load or parse, or a required field is broken
// Unknown fields are ignored. Missing optional fields are normal.

import { isDateOnly, parseUtc, DEFAULT_WINDOW } from "./time.js";
import { queryParam } from "./ui.js";

const RESERVED = new Set(["__proto__", "constructor", "prototype"]);

async function fetchJson(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (res.status === 404) return { status: "missing" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", data: await res.json() };
  } catch (err) {
    console.warn("Couldn't load " + path, err);
    return { status: "error" };
  }
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const count = (v) => (Number.isInteger(v) && v > 0 ? v : 0);
const isName = (v) => typeof v === "string" && v.length > 0 && !RESERVED.has(v);
const dateOrNull = (v) => (isDateOnly(v) ? v : null);

async function load(path, clean) {
  const res = await fetchJson(path);
  if (res.status !== "ok") return res;
  try {
    const data = isObj(res.data) ? clean(res.data) : null;
    return data ? { status: "ok", data } : { status: "error" };
  } catch (err) {
    console.warn("Couldn't read " + path, err);
    return { status: "error" };
  }
}

// donations.json → { goal, raised, currency, closeWhenGoalReached, adminMinimum,
//   muteMinimum, maxPerPerson, lastUpdated, window, donors: [{ name, level }] }
export function loadDonations() {
  return load("donations.json", (d) => {
    const required = [d.goal, d.raised, d.adminMinimum, d.muteMinimum, d.maxPerPerson];
    if (!required.every(isNum) || !Array.isArray(d.donors)) return null;
    const w = d.window;
    const windowOk = isObj(w) && [w.month, w.day, w.days].every(Number.isInteger) &&
      w.month >= 1 && w.month <= 12 && w.day >= 1 && w.day <= 31 && w.days >= 1 && w.days <= 366;
    return {
      goal: d.goal,
      raised: d.raised,
      currency: typeof d.currency === "string" ? d.currency : "GBP",
      closeWhenGoalReached: d.closeWhenGoalReached === true,
      adminMinimum: d.adminMinimum,
      muteMinimum: d.muteMinimum,
      maxPerPerson: d.maxPerPerson,
      lastUpdated: dateOrNull(d.lastUpdated),
      window: windowOk ? { month: w.month, day: w.day, days: w.days } : DEFAULT_WINDOW,
      donors: d.donors
        .filter((x) => isObj(x) && isName(x.name))
        .map((x) => ({ name: x.name, level: typeof x.level === "string" && x.level ? x.level : null }))
    };
  });
}

// perks.json → { lastUpdated, perks: [{ name, banner, modal, mute, bannerUntil, modalUntil }] }
// banner/modal: weeks not yet started (0 if none). mute: true, a "YYYY-MM-DD"
// date it comes back, or null. bannerUntil/modalUntil: Date or null.
function cleanPerks(p) {
  if (!isObj(p.perks)) return null;
  return {
    lastUpdated: dateOrNull(p.lastUpdated),
    perks: Object.keys(p.perks).filter(isName).map((name) => {
      const e = isObj(p.perks[name]) ? p.perks[name] : {};
      return {
        name,
        banner: count(e.banner),
        modal: count(e.modal),
        mute: e.mute === true ? true : dateOrNull(e.mute),
        bannerUntil: parseUtc(e.bannerUntil),
        modalUntil: parseUtc(e.modalUntil)
      };
    })
  };
}

// ?demo=perks (local only) shows made-up people so the perk displays can be
// previewed without touching perks.json.
const DEMO_PERKS = {
  lastUpdated: "2026-09-21",
  perks: {
    ExampleUser: { banner: 5, modal: 5, mute: true },
    AnotherDonor: { banner: 3, modal: 1, mute: "2027-04-01", bannerUntil: new Date(Date.now() + 3 * 86400000).toISOString() },
    MuteOnly: { mute: true },
    AllUsed: { banner: 0, modal: 0 }
  }
};

export function loadPerks() {
  if (queryParam("demo") === "perks") return Promise.resolve({ status: "ok", data: cleanPerks(DEMO_PERKS) });
  return load("perks.json", cleanPerks);
}

// leaderboards.json (proposed) → { updatedAt, trivia: [{ name, points }],
//   uno: [{ name, points, won, lost }] }, in the file's order (already ranked).
export function loadLeaderboards() {
  return load("leaderboards.json", (l) => {
    const rows = (v) => (Array.isArray(v) ? v : []).filter((r) => isObj(r) && isName(r.name)).slice(0, 10);
    return {
      updatedAt: parseUtc(l.updatedAt),
      trivia: rows(l.trivia).map((r) => ({ name: r.name, points: isNum(r.points) ? r.points : 0 })),
      uno: rows(l.uno).map((r) => ({
        name: r.name, points: isNum(r.points) ? r.points : 0, won: count(r.won), lost: count(r.lost)
      }))
    };
  });
}

// live.json (proposed) → { updatedAt, live: [{ name, twitch, since }] }.
// twitch is null unless it's a safe login (letters, digits, underscores).
export function loadLive() {
  return load("live.json", (l) => {
    if (!Array.isArray(l.live)) return null;
    return {
      updatedAt: parseUtc(l.updatedAt),
      live: l.live.filter((s) => isObj(s) && isName(s.name)).map((s) => ({
        name: s.name,
        twitch: typeof s.twitch === "string" && /^[A-Za-z0-9_]+$/.test(s.twitch) ? s.twitch : null,
        since: parseUtc(s.since)
      }))
    };
  });
}
