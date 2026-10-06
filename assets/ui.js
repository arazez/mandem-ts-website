// Small page helpers shared by every page.
// Names come from TeamSpeak chat: always insert them with el() / textContent,
// never as HTML.

import { ukToday, formatDateOnly, formatUkMoment } from "./time.js";

// el("p", "muted", "text") → <p class="muted">text</p>. Children may be
// elements or strings (strings become text, never HTML).
export function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  children.forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.append(typeof c === "string" || typeof c === "number" ? String(c) : c);
  });
  return node;
}

export function link(href, className, ...children) {
  const a = el("a", className, ...children);
  a.href = href;
  if (/^https?:/.test(href)) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}

// Friendly message boxes.
export function notice(title, text) {
  return el("div", "notice", el("strong", null, title), text);
}

export function loadFailed() {
  return notice("Couldn't load the latest info", "Please try refreshing in a minute.");
}

export function comingSoon(what) {
  return notice("Coming soon", what);
}

// An on/off switch, such as the game pages' Sound: the label stays the same
// and the slider says On or Off, so it always shows the state, never the
// action. Its knob and colour move too, but the words carry the meaning.
export function toggleSwitch(label, on, onChange, title) {
  const button = el("button", "switch" + (on ? " on" : ""), el("span", "switch-label", label),
    el("span", "switch-track", el("span", "switch-knob"), el("span", "switch-state", on ? "On" : "Off")));
  button.type = "button";
  button.setAttribute("role", "switch");
  button.setAttribute("aria-checked", String(on));
  if (title) button.title = title;
  button.addEventListener("click", () => onChange(!on));
  return button;
}

// Replace a container's contents.
export function fill(container, ...children) {
  container.replaceChildren(...children.filter(Boolean));
}

const CURRENCY_SYMBOLS = { GBP: "£", USD: "$", EUR: "€" };

export function formatMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + " ";
  const rounded = Math.round(amount * 100) / 100;
  return symbol + (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2));
}

// --- Local testing switches ----------------------------------------------------
// ?preview=... and ?demo=... only work on file:// or localhost, so a shared
// link can't put donate buttons up on the live site while donations are closed.
export function isLocal() {
  const h = window.location.hostname;
  return window.location.protocol === "file:" || h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export function queryParam(name) {
  return isLocal() ? new URLSearchParams(window.location.search).get(name) : null;
}

// --- Perk tags for one person (Supporters and Perks pages) -------------------
function weeks(n) {
  return n + (n === 1 ? " wk" : " wks");
}

export function perkChips(p, now = new Date()) {
  const chips = el("span", "pl-chips");
  const chip = (cls, text) => chips.append(el("span", "pl-chip " + cls, text));

  if (p.bannerUntil && p.bannerUntil > now) chip("ready", "🖼️ Banner running until " + formatUkMoment(p.bannerUntil, now));
  if (p.modalUntil && p.modalUntil > now) chip("ready", "💬 Modal running until " + formatUkMoment(p.modalUntil, now));
  if (p.banner > 0) chip("weeks", "🖼️ Banner · " + weeks(p.banner));
  if (p.modal > 0) chip("weeks", "💬 Modal · " + weeks(p.modal));

  if (p.mute === true || (typeof p.mute === "string" && p.mute <= ukToday(now))) {
    chip("ready", "🔇 Mute ready");
  } else if (typeof p.mute === "string") {
    chip("wait", "🔇 Mute back " + formatDateOnly(p.mute, "short"));
  }

  return chips.children.length ? chips : el("span", "pl-none", "All perks used");
}

export function updatedNote(prefix, dateOnly) {
  return dateOnly ? prefix + " " + formatDateOnly(dateOnly) + "." : "";
}
