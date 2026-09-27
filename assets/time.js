// Time helpers. Everything is shown in UK time, with dot clock times (14.00).
// Date-only strings ("YYYY-MM-DD") are calendar dates, not moments: never pass
// them to new Date(str), which reads them as UTC midnight and can show the
// wrong day. Compare them as strings against ukToday() instead.

export const UK = "Europe/London";

function ukParts(date) {
  const map = {};
  new Intl.DateTimeFormat("en-GB", {
    timeZone: UK, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(date).forEach((p) => { map[p.type] = p.value; });
  return map;
}

// Today's UK calendar date as "YYYY-MM-DD".
export function ukToday(now = new Date()) {
  const p = ukParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

// The current UK wall-clock time, stored as if it were UTC. Only for
// calendar arithmetic (the donation window); never format it as UK time.
export function ukWallClock(now = new Date()) {
  const p = ukParts(now);
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second));
}

export function isDateOnly(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// "3 October 2026" (or "3 Oct 2026" with month "short").
export function formatDateOnly(str, month = "long") {
  const [y, m, d] = str.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month, year: "numeric" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

// A UTC time like "2026-10-10T14:00:00Z" as a Date, or null.
export function parseUtc(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t);
}

// "14.00"
export function formatUkTime(date) {
  const p = ukParts(date);
  return `${p.hour}.${p.minute}`;
}

// "14.00" if it's today in the UK, "yesterday, 23.10", otherwise "Sat 3 Oct, 14.00".
export function formatUkMoment(date, now = new Date()) {
  const day = ukToday(date);
  if (day === ukToday(now)) return formatUkTime(date);
  if (day === ukToday(new Date(now.getTime() - 86400000))) return "yesterday, " + formatUkTime(date);
  const label = new Intl.DateTimeFormat("en-GB", { timeZone: UK, weekday: "short", day: "numeric", month: "short" }).format(date);
  return `${label}, ${formatUkTime(date)}`;
}

// --- Donation window --------------------------------------------------------
// Opens at UK midnight on month/day each year and lasts `days` days,
// including the first. May run over the new year.
export const DEFAULT_WINDOW = { month: 10, day: 1, days: 31 };

// Returns { opensAt, closesAt, open } in UK wall-clock time (see ukWallClock)
// for the window that is running now, or else the next one.
export function donationWindow(wall, win = DEFAULT_WINDOW) {
  function forYear(year) {
    // A day past the month's end (31 February) means the month's last day.
    const lastDay = new Date(Date.UTC(year, win.month, 0)).getUTCDate();
    const opensAt = new Date(Date.UTC(year, win.month - 1, Math.min(win.day, lastDay)));
    const closesAt = new Date(opensAt.getTime());
    closesAt.setUTCDate(closesAt.getUTCDate() + win.days);
    return { opensAt, closesAt };
  }
  const year = wall.getUTCFullYear();
  const prev = forYear(year - 1); // may still be running into this year
  if (wall >= prev.opensAt && wall < prev.closesAt) return { ...prev, open: true };
  const cur = forYear(year);
  if (wall < cur.closesAt) return { ...cur, open: wall >= cur.opensAt };
  return { ...forYear(year + 1), open: false };
}

// Wall-clock Date (from donationWindow) as a "YYYY-MM-DD" calendar date.
export function wallDate(wall) {
  return wall.toISOString().slice(0, 10);
}
