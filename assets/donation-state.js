// Whether donations are open right now. Used by Supporters and Home.
import { ukWallClock, donationWindow, wallDate } from "./time.js";
import { queryParam } from "./ui.js";

// Returns { state: "open" | "closed" | "goal", preview, wall, win } for a
// loaded donations.json. ?preview=open|closed|goal (local only) forces a state.
export function donationStatus(d, now = new Date()) {
  const wall = ukWallClock(now);
  const win = donationWindow(wall, d.window);
  const p = queryParam("preview");
  const preview = p === "open" || p === "closed" || p === "goal" ? p : null;

  let state;
  if (preview) {
    state = preview;
  } else if (!win.open) {
    state = "closed";
  } else {
    // Guard against a stale "raised" carried over from last year: only let
    // goal-reached fire if donations.json was updated on or after this
    // window opened. Otherwise fail safe toward "open", rather than hiding
    // the donate buttons on day one of a new window.
    const confirmed = d.lastUpdated !== null && d.lastUpdated >= wallDate(win.opensAt);
    state = d.closeWhenGoalReached && d.raised >= d.goal && confirmed ? "goal" : "open";
  }
  return { state, preview, wall, win };
}

// The window's last open day and opening day, as "YYYY-MM-DD".
export function lastOpenDay(win) {
  return wallDate(new Date(win.closesAt.getTime() - 86400000));
}

export function openingDay(win) {
  return wallDate(win.opensAt);
}
