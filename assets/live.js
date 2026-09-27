// Live now page: everyone in live.json (the bot only lists people who opted
// in with !twitch show).
import { loadLive } from "./data.js";
import { el, link, fill, loadFailed, comingSoon, notice } from "./ui.js";
import { formatUkMoment } from "./time.js";

const list = document.getElementById("liveList");

// Safety net: the bot only rewrites live.json when something changes, so if it
// stops mid-stream a streamer could look live forever. Hide anyone who went
// live over 12 hours ago (owner's ruling; see docs/SITE-DATA.md).
const STALE_MS = 12 * 60 * 60 * 1000;
const isFresh = (s, now) => !s.since || now - s.since < STALE_MS;

function card(s, now) {
  const name = el("span", "live-name", el("span", "live-dot"), s.name);
  const since = s.since ? el("span", "live-since", "Live since " + formatUkMoment(s.since, now)) : el("span", "live-since");
  // twitch is only set when it's a safe login (checked in data.js).
  const watch = s.twitch
    ? link("https://twitch.tv/" + s.twitch, "twitch-link", "Watch on Twitch")
    : null;
  return el("li", "live-card", name, since, watch);
}

try {
  const res = await loadLive();
  if (res.status === "missing") {
    fill(list, comingSoon("Soon you'll see who from the server is streaming on Twitch right now."));
  } else if (res.status !== "ok") {
    fill(list, loadFailed());
  } else {
    const now = new Date();
    const live = res.data.live.filter((s) => isFresh(s, now));
    fill(list, live.length
      ? el("ul", "live-list", ...live.map((s) => card(s, now)))
      : notice("Nobody's live right now", "Check back later, or hop on the server and say hi."));
    if (res.data.updatedAt) {
      document.getElementById("liveUpdated").textContent = "Updated " + formatUkMoment(res.data.updatedAt, now) + ".";
    }
  }
} catch (err) {
  console.error(err);
  fill(list, loadFailed());
}
