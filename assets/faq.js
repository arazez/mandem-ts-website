// FAQ page: the TeamSpeak 3 / 6 switch. Shows one version's steps at a time
// and remembers the choice in this browser. Without this script both show.
const KEY = "faq-ts-version";
const buttons = document.querySelectorAll(".version-switch button");

function show(version) {
  document.querySelectorAll(".v").forEach((block) => { block.hidden = block.dataset.v !== version; });
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === version)));
}

let saved = null;
try { saved = localStorage.getItem(KEY); } catch (err) { /* storage blocked: use the default */ }
show(saved === "ts6" ? "ts6" : "ts3");
document.querySelector(".version-switch").hidden = false;

buttons.forEach((b) => b.addEventListener("click", () => {
  show(b.dataset.v);
  try { localStorage.setItem(KEY, b.dataset.v); } catch (err) { /* not remembered, that's fine */ }
}));
