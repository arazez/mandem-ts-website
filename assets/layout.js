// Builds the navbar and footer on every page, so they live in one place.
// A page marks itself with <body data-page="home"> and holds empty
// <nav id="site-nav"> and <footer id="site-footer"> elements.
// To add a page: add it to PAGES below.

import { el, link } from "./ui.js";

const PAGES = [
  { id: "home", href: "index.html", label: "Home" },
  { id: "commands", href: "commands.html", label: "Commands" },
  { id: "supporters", href: "supporters.html", label: "Supporters" },
  { id: "perks", href: "perks.html", label: "Perks" },
  { id: "live", href: "live.html", label: "Live now" },
  { id: "leaderboards", href: "leaderboards.html", label: "Leaderboards" },
  { id: "faq", href: "faq.html", label: "FAQ" }
];

const current = document.body.dataset.page;

const nav = document.getElementById("site-nav");
if (nav) {
  nav.className = "site-nav";
  nav.setAttribute("aria-label", "Main");
  const brand = link("index.html", "nav-brand", "🎧 Mandem ", el("span", null, "Server"));
  const list = el("ul", "nav-links");
  PAGES.forEach((p) => {
    const a = link(p.href, null, p.label);
    if (p.id === current) a.setAttribute("aria-current", "page");
    list.append(el("li", null, a));
  });
  nav.replaceChildren(el("div", "wrap", brand, list));
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
