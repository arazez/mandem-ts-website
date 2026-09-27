// Commands page: builds the side index ("On this page") from the section
// headings and commands, so it never needs editing by hand, and highlights
// the section you're reading. Everything read here is fixed page text.
import { el } from "./ui.js";

const toc = document.getElementById("toc");
const sections = [...document.querySelectorAll("#commands .cmd-group")];
const slug = (text) => text.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const list = el("ul", "toc-list");
const links = new Map();
sections.forEach((section) => {
  const heading = section.querySelector("h2");
  section.id = slug(heading.textContent);
  const a = el("a", null, heading.textContent);
  a.href = "#" + section.id;
  links.set(section, a);

  const sub = el("ul", "toc-sub");
  const seen = new Set();
  section.querySelectorAll("dt").forEach((dt) => {
    const first = dt.querySelector("code");
    if (!first) return;
    // "!perks <name>" → id "cmd-perks-name". The link shows the command
    // without its arguments, listed once ("!perks" covers "!perks <name>").
    dt.id = "cmd-" + slug(first.textContent);
    const label = first.textContent.replace(/\s*[<[].*$/, "");
    if (seen.has(label)) return;
    seen.add(label);
    const link = el("a", null, label);
    link.href = "#" + dt.id;
    sub.append(el("li", null, link));
  });
  list.append(el("li", null, a, sub));
});

const box = el("details", "toc-box", el("summary", null, "On this page"), list);
// Open on wide screens, where it sits at the side; collapsed on phones.
box.open = window.matchMedia("(min-width: 860px)").matches;
toc.append(box);

// Highlight the section at the top of the screen.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((a) => a.removeAttribute("aria-current"));
    links.get(entry.target).setAttribute("aria-current", "true");
  });
}, { rootMargin: "-80px 0px -70% 0px" });
sections.forEach((s) => observer.observe(s));
