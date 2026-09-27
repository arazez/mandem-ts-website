// While anyone is streaming: a pulsing red dot on the navbar's "Live now"
// link (and on the phone menu button), plus one slim strip under the navbar:
// "Name is live right now!" or "Name + 2 more are live right now!" (Name picked
// at random). Only people in live.json appear: the bot lists only those who
// opted in with !twitch show.
// One person with a Twitch link: the button goes to their stream. Otherwise it
// goes to the Live now page, which doesn't get the strip (it lists everyone).
// The ✕ hides the strip for this browser tab until someone else goes live.
// Loaded by layout.js on every page.
import { loadLive } from "./data.js";
import { el, link } from "./ui.js";

const HIDDEN_KEY = "liveAlertHidden";

export async function showLiveAlert(nav, current) {
  const res = await loadLive();
  if (res.status !== "ok" || !res.data.live.length) return;
  const live = res.data.live;

  nav.classList.add("has-live");
  const navLink = nav.querySelector('.nav-links a[href="/live"]');
  if (navLink) {
    navLink.classList.add("is-live");
    navLink.append(el("span", "rec-dot"), el("span", "visually-hidden", " (someone is live)"));
  }

  if (current === "live") return;
  // Remembered per set of streamers, so a new one brings the strip back.
  const who = live.map((s) => s.name).sort().join("\n");
  try { if (sessionStorage.getItem(HIDDEN_KEY) === who) return; } catch (err) { /* storage blocked: show it */ }

  // A different streamer is named each time a page loads, so nobody is always first.
  const first = live[Math.floor(Math.random() * live.length)];
  const more = live.length - 1;
  const text = el("span", "live-alert-text",
    el("strong", null, first.name),
    more ? " + " + more + " more are live right now!" : " is live right now!");
  const cta = more === 0 && first.twitch
    ? link("https://twitch.tv/" + first.twitch, "live-alert-cta", "Watch on Twitch")
    : link("/live", "live-alert-cta", more ? "See who's live" : "Watch now");

  const close = el("button", "live-alert-close", "✕");
  close.type = "button";
  close.setAttribute("aria-label", "Hide this message");

  const bar = el("div", "live-alert",
    el("div", "wrap", el("span", "rec-dot"), text, cta, close));
  bar.setAttribute("role", "status");
  close.addEventListener("click", () => {
    bar.remove();
    try { sessionStorage.setItem(HIDDEN_KEY, who); } catch (err) { /* not remembered, that's fine */ }
  });
  nav.after(bar);
}
