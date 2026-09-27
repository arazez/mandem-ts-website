// Admin page: the rank switch. Shows only the commands the chosen rank can
// use, going by the role pills in each command's "who" row (fixed page
// text), and hides side-index links to anything hidden. The choice is
// remembered in this browser, and a link like admin?for=super-admin opens
// with that rank picked. Without this script, everything shows.
const KEY = "admin-rank";
const commands = document.getElementById("commands");
const buttons = document.querySelectorAll(".version-switch button");
const ranks = [...buttons].map((b) => b.dataset.rank);
const count = document.getElementById("rank-count");
const empty = commands.querySelector(".role-empty");

// Each command is a <dt> and the <dd> after it.
const pairs = [...commands.querySelectorAll("dt")].map((dt) => {
  const dd = dt.nextElementSibling;
  return { dt, dd, ranks: [...dd.querySelectorAll(".role-pill")].map((r) => r.dataset.rank) };
});

function show(rank) {
  const fits = (list) => rank === "all" || list.includes(rank);
  pairs.forEach((p) => { p.dt.hidden = p.dd.hidden = !fits(p.ranks); });
  commands.querySelectorAll("[data-ranks]").forEach((note) => {
    note.hidden = !fits(note.dataset.ranks.split(" "));
  });
  commands.querySelectorAll(".cmd-group").forEach((section) => {
    const shown = [...section.querySelectorAll("dt")].filter((dt) => !dt.hidden);
    section.hidden = shown.length === 0;
    // No divider line above the first command left showing.
    section.querySelectorAll("dt").forEach((dt) => dt.classList.toggle("first-shown", dt === shown[0]));
  });
  // Side index, built by assets/commands.js (it runs first).
  document.querySelectorAll("#toc a[href^='#']").forEach((a) => {
    const target = document.getElementById(a.getAttribute("href").slice(1));
    a.parentElement.hidden = !target || target.hidden;
  });

  const visible = pairs.filter((p) => !p.dt.hidden).length;
  empty.hidden = visible > 0;
  count.textContent = rank === "all" ? `${pairs.length} commands` : `${visible} of ${pairs.length} commands`;
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rank === rank)));
}

let start = new URLSearchParams(location.search).get("for");
if (!ranks.includes(start)) {
  try { start = localStorage.getItem(KEY); } catch (err) { /* storage blocked: use the default */ }
}
show(ranks.includes(start) ? start : "all");
document.querySelector(".version-switch").hidden = false;

buttons.forEach((b) => b.addEventListener("click", () => {
  const rank = b.dataset.rank;
  show(rank);
  try { localStorage.setItem(KEY, rank); } catch (err) { /* not remembered, that's fine */ }
  const url = new URL(location.href);
  if (rank === "all") url.searchParams.delete("for");
  else url.searchParams.set("for", rank);
  history.replaceState(null, "", url);
}));
