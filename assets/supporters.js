// Supporters page: donation window, goal bar, donate buttons, thresholds and
// the supporter list. Data: donations.json and perks.json via assets/data.js.
import { loadDonations, loadPerks } from "./data.js";
import { el, link, fill, loadFailed, formatMoney, perkChips, updatedNote } from "./ui.js";
import { donationStatus, lastOpenDay, openingDay } from "./donation-state.js";
import { formatDateOnly } from "./time.js";

const REVOLUT_URL = "https://revolut.me/amjedlwa";
const PAYPAL_URL = "https://paypal.me/arazez";
const MONZO_URL = "https://monzo.me/amjedagabani";

// Logo marks (white, on each brand's own button colour), inline so there are
// no external image requests. Paths from Simple Icons (simpleicons.org).
const PAYMENT_METHODS = [
  {
    cls: "btn-revolut", href: REVOLUT_URL, label: "Revolut",
    iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fff" d="M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z"/></svg>'
  },
  {
    cls: "btn-paypal", href: PAYPAL_URL, label: "PayPal",
    iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fff" d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"/></svg>'
  },
  {
    cls: "btn-monzo", href: MONZO_URL, label: "Monzo",
    iconSvg: '<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fff" d="M4.244 1.174a.443.443 0 00-.271.13l-3.97 3.97-.001.001c3.884 3.882 8.093 8.092 11.748 11.748v-8.57L4.602 1.305a.443.443 0 00-.358-.131zm15.483 0a.443.443 0 00-.329.13L12.25 8.456v8.568L24 5.275c-1.316-1.322-2.647-2.648-3.97-3.97a.443.443 0 00-.301-.131zM0 5.979l.002 10.955c0 .294.118.577.326.785l4.973 4.976c.28.282.76.083.758-.314V12.037zm23.998.003l-6.06 6.061v10.338c-.004.399.48.6.76.314l4.974-4.976c.208-.208.326-.49.326-.785z"/></svg>'
  }
];

const $ = (id) => document.getElementById(id);

function formatCountdown(ms) {
  if (ms <= 0) return "0 days";
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const out = [];
  if (days > 0) out.push(days + "d");
  out.push(pad(Math.floor((total % 86400) / 3600)) + "h");
  out.push(pad(Math.floor((total % 3600) / 60)) + "m");
  out.push(pad(total % 60) + "s");
  return out.join(" ");
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function renderProgress(d, raised) {
  const root = $("heroProgress");
  const pct = d.goal > 0 ? Math.min(100, Math.round((raised / d.goal) * 100)) : 0;
  root.querySelector(".raised").textContent = formatMoney(raised, d.currency);
  root.querySelector(".goal-amt").textContent = formatMoney(d.goal, d.currency);
  root.querySelector(".progress-fill").style.width = pct + "%";
  const bar = root.querySelector(".progress-bar");
  bar.setAttribute("aria-valuenow", raised);
  bar.setAttribute("aria-valuemax", d.goal);
  root.querySelector(".updated-note").textContent = updatedNote("Totals last updated", d.lastUpdated);
}

function renderPaymentButtons() {
  const box = $("paymentButtons");
  if (!box.hidden) return; // already showing
  box.replaceChildren(...PAYMENT_METHODS.map((m) => {
    const icon = el("span", "btn-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = m.iconSvg; // static, hand-written markup, not data
    return link(m.href, "btn " + m.cls, icon, "Donate with " + m.label);
  }));
  box.hidden = false;
}

function hidePaymentButtons() {
  $("paymentButtons").hidden = true;
  $("paymentButtons").replaceChildren();
  $("perkNote").hidden = true;
}

// Banner, countdown and buttons. Re-run every second for the countdown.
function render(d) {
  const { state, preview, wall, win } = donationStatus(d);
  const banner = $("statusBanner");
  const title = $("bannerTitle");
  const countdown = $("bannerCountdown");

  $("perksSection").hidden = state !== "open";
  $("heroProgress").hidden = state === "closed";
  // ?preview=goal should look reached even if the real total hasn't caught up.
  const raised = preview === "goal" ? Math.max(d.raised, d.goal) : d.raised;
  if (state !== "closed") renderProgress(d, raised);

  if (state === "open") {
    const closesAt = preview ? addDays(wall, 3) : win.closesAt;
    const lastDay = preview ? addDays(wall, 2).toISOString().slice(0, 10) : lastOpenDay(win);
    banner.className = "banner open";
    title.textContent = "Donations are open until " + formatDateOnly(lastDay);
    fill(countdown, "Closes in ", el("strong", null, formatCountdown(closesAt - wall)));
    renderPaymentButtons();
    const max = formatMoney(d.maxPerPerson, d.currency);
    fill($("perkNote"), "Please donate ", el("strong", null, max + " maximum"),
      " per person. Anything over " + max + " will be refunded.");
    $("perkNote").hidden = false;
  } else if (state === "goal") {
    banner.className = "banner goal";
    title.textContent = "🎉 Goal reached, thank you!";
    fill(countdown, "Final total: ", el("strong", null, formatMoney(raised, d.currency)), " raised");
    hidePaymentButtons();
  } else {
    const opensAt = preview ? addDays(wall, 14) : win.opensAt;
    const openDay = preview ? opensAt.toISOString().slice(0, 10) : openingDay(win);
    banner.className = "banner closed";
    title.textContent = "Donations are closed. Next window opens " + formatDateOnly(openDay);
    fill(countdown, "Opens in ", el("strong", null, formatCountdown(opensAt - wall)));
    hidePaymentButtons();
  }
}

// Hover / keyboard-focus / tap explainer. The visible "What's a …?" text is
// the call to action, so people know there's more to see.
let helpCount = 0;
function buildHelp(cta, text) {
  const id = "perk-tip-" + helpCount++;
  const trigger = el("button", "help-trigger", "ⓘ " + cta);
  trigger.type = "button";
  trigger.setAttribute("aria-describedby", id);
  const tip = el("span", "help-tip", text);
  tip.id = id;
  tip.setAttribute("role", "tooltip");
  return el("span", "help", trigger, tip);
}

// "What you get". Two kinds of perk, shown differently on purpose:
// banner/modal control scales with every £1 (rate strip), while admin and
// mute unlock at a threshold (cards).
function renderPerks(d) {
  const rate = $("perkRate");
  const ratePerks = [
    ["🖼️", "1 week of control over the TeamSpeak banner photo", "What's the banner?",
      "The banner is the image shown on the right in the channel details page, visible to everyone on the server. You pick the photo."],
    ["💬", "1 week of control over the TeamSpeak modal", "What's a modal?",
      "A modal is the pop-up message box that appears in the middle of everyone's screen when they connect to the server. They have to dismiss it before carrying on. You choose what it says, up to 200 characters."]
  ];
  const rules = [
    "Once your week starts, nobody can interrupt it. The one exception: an important service modal from the owner can interrupt your modal. Your week pauses while it's up and carries on once it's gone, so you lose no time.",
    "It can't be paused or resumed: it runs for the full week, then ends.",
    "Banner and modal are separate, so you can use each one on its own."
  ];

  fill(rate,
    el("p", "perk-rate-lead", "Every ", el("span", "rate-amt", formatMoney(1, d.currency)), " you donate gets you"),
    el("ul", "perk-rate-list", ...ratePerks.map(([icon, text, cta, help]) => {
      const i = el("span", "perk-icon", icon);
      i.setAttribute("aria-hidden", "true");
      return el("li", null, i, el("span", "perk-rate-text", el("strong", null, text), el("br"), buildHelp(cta, help)));
    })),
    el("p", "perk-rules-head", "How it works"),
    el("ul", "perk-rules", ...rules.map((r) => el("li", null, r)))
  );

  const unlockAmount = (amt) => formatMoney(amt, d.currency) + (amt < d.maxPerPerson ? "+" : "");
  fill($("perkUnlocks"),
    ...[
      [d.adminMinimum, "🛡️ Server admin", "Level at the owner's discretion"],
      [d.muteMinimum, "🔇 1-hour mute on any user", "Once every 6 months. Non-rolling, so unused ones don't carry over"]
    ].map(([amt, title, detail]) =>
      el("div", "unlock-card", el("span", "unlock-amount", unlockAmount(amt)),
        el("span", "unlock-title", title), el("span", "unlock-detail", detail)))
  );

  // Touch devices have no hover, so tapping the trigger toggles the tip;
  // tapping anywhere else, or pressing Escape, closes it.
  const closeHelp = (except) => rate.querySelectorAll(".help.open").forEach((h) => {
    if (h !== except) h.classList.remove("open");
  });
  rate.addEventListener("click", (e) => {
    const trigger = e.target.closest(".help-trigger");
    if (!trigger) return;
    closeHelp(trigger.parentNode);
    trigger.parentNode.classList.toggle("open");
    e.stopPropagation();
  });
  document.addEventListener("click", () => closeHelp(null));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeHelp(null); });
}

// Known levels in rank order (any case). Any other level text comes after
// them, and no level at all comes last.
const LEVEL_ORDER = ["owner", "super admin", "admin"];
function levelRank(level) {
  if (!level) return LEVEL_ORDER.length + 1;
  const i = LEVEL_ORDER.indexOf(level.trim().toLowerCase());
  return i === -1 ? LEVEL_ORDER.length : i;
}

// Supporter list. Each card also shows perks still to use, matched by name
// (ignoring case) against perks.json. Names only in perks.json still get a
// card, so nobody is silently hidden.
function renderDonors(d, perks) {
  const byName = new Map();
  (perks ? perks.perks : []).forEach((p) => byName.set(p.name.toLowerCase(), p));
  const hasPerks = byName.size > 0;

  $("thanksIntro").textContent =
    "Massive thanks to everyone who's chipped in to keep the server running. " +
    "Donors of " + formatMoney(d.adminMinimum, d.currency) + "+ are gifted server admin, " +
    "the level at the owner's discretion." +
    (hasPerks ? " Tags under a name are perks they still have to use." : "");

  const cards = d.donors.map((donor) => {
    const key = donor.name.toLowerCase();
    const p = byName.get(key);
    byName.delete(key);
    return { name: donor.name, level: donor.level, perks: p };
  });
  byName.forEach((p) => cards.push({ name: p.name, level: null, perks: p }));
  // Highest rank first; ties keep the file's order.
  cards.sort((a, b) => levelRank(a.level) - levelRank(b.level));

  fill($("donorList"), ...cards.map((c) =>
    el("li", null, c.name,
      c.level && " ", c.level && el("span", "amt", "🛡️ " + c.level),
      c.perks && perkChips(c.perks))));

  $("perksLeftUpdated").textContent = hasPerks ? updatedNote("Perks last updated", perks.lastUpdated) : "";
}

try {
  const [donations, perks] = await Promise.all([loadDonations(), loadPerks()]);
  if (donations.status !== "ok") {
    $("statusBanner").className = "banner closed";
    $("bannerTitle").textContent = "Couldn't load the latest donation info";
    $("bannerCountdown").textContent = "Please try refreshing in a minute.";
    fill($("thanksCard"), loadFailed());
  } else {
    const d = donations.data;
    renderDonors(d, perks.status === "ok" ? perks.data : null);
    renderPerks(d);
    render(d);
    setInterval(() => render(d), 1000);
  }
} catch (err) {
  console.error(err);
  $("bannerTitle").textContent = "Couldn't load the latest donation info";
  $("bannerCountdown").textContent = "Please try refreshing in a minute.";
}
