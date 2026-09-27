// Builds the navbar and footer on every page, so they live in one place.
// A page marks itself with <body data-page="home"> and holds empty
// <nav id="site-nav"> and <footer id="site-footer"> elements.
// To add a page: add it to PAGES below.

import { el, link } from "./ui.js";
import "./copy.js";

const PAGES = [
  { id: "home", href: "./", label: "Home" },
  { id: "commands", href: "commands", label: "Commands" },
  { id: "supporters", href: "supporters", label: "Supporters" },
  { id: "perks", href: "perks", label: "Perks" },
  { id: "live", href: "live", label: "Live now" },
  { id: "leaderboards", href: "leaderboards", label: "Leaderboards" },
  { id: "rules", href: "rules", label: "Rules" },
  { id: "faq", href: "faq", label: "FAQ" }
];

const current = document.body.dataset.page;

const nav = document.getElementById("site-nav");
if (nav) {
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Main");
  const brand = link("./", "nav-brand", "🎧 Mandem ", el("span", null, "Server"));
  const list = el("ul", "nav-links");
  PAGES.forEach((p) => {
    const a = link(p.href, null, p.label);
    if (p.id === current) a.setAttribute("aria-current", "page");
    list.append(el("li", null, a));
  });
  nav.replaceChildren(el("div", "wrap", brand, list, themeToggle()));
}

// Light/dark switch. The choice is saved in this browser (assets/theme.js
// applies it on the next page before it draws).
function themeToggle() {
  const root = document.documentElement;
  const current = () => (root.getAttribute("data-theme") === "light" ? "light" : "dark");
  const button = el("button", "theme-toggle");
  button.type = "button";
  const label = () => {
    const next = current() === "light" ? "dark" : "light";
    button.textContent = next === "light" ? "☀️ Light" : "🌙 Dark";
    button.setAttribute("aria-label", "Switch to " + next + " mode");
  };
  button.addEventListener("click", () => {
    const next = current() === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (err) { /* not remembered, that's fine */ }
    label();
  });
  label();
  return button;
}

const footer = document.getElementById("site-footer");
if (footer) {
  footer.className = "site-footer";
  footer.replaceChildren(
    el("div", "wrap",
      el("p", "contact-lead", "Questions? Reach out:"),
      el("div", "contact-links",
        el("span", "contact-chip", "💬 Discord: ", el("strong", null, "arazez")),
        link("https://twitter.com/arazez", "contact-chip", "🐦 Twitter: ", el("strong", null, "@arazez")),
        link("https://steamcommunity.com/profiles/76561198033745228/", "contact-chip", "🎮 Steam")
      ),
      el("p", null, "Mandem Server · ", el("code", "addr", "ts.arazez.com"))
    )
  );
}
