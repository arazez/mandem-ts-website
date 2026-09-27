// Click (or Enter/Space on) any command, like !perks, to copy it.
// Placeholders such as <name> or [link] aren't copied: "!perks <name>"
// copies "!perks " so the user only types the name. Loaded by layout.js on
// every page; commands are fixed page text.
import { el } from "./ui.js";

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => copyFallback(text));
  return copyFallback(text);
}

// For older browsers, plain-http previews, or when the browser refuses the above.
function copyFallback(text) {
  return new Promise((resolve, reject) => {
    const area = el("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) resolve(); else reject(new Error("copy failed"));
  });
}

function textToCopy(shown) {
  const cut = shown.search(/\s*[<[]/);
  return cut === -1 ? shown.trim() : shown.slice(0, cut) + " ";
}

const toast = el("div", "copy-toast");
toast.setAttribute("role", "status");
toast.setAttribute("aria-live", "polite");
document.body.append(toast);
let hideTimer;

function tell(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function copy(code) {
  const text = textToCopy(code.textContent);
  copyText(text)
    .then(() => tell("Copied " + text.trim()))
    .catch(() => tell("Couldn't copy. Select it and copy by hand."));
}

document.querySelectorAll("code.cmd").forEach((code) => {
  code.classList.add("copyable");
  code.tabIndex = 0;
  code.setAttribute("role", "button");
  code.title = "Click to copy";
});

document.addEventListener("click", (e) => {
  const code = e.target.closest && e.target.closest("code.copyable");
  if (code) copy(code);
});

document.addEventListener("keydown", (e) => {
  const code = e.target.closest && e.target.closest("code.copyable");
  if (code && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    copy(code);
  }
});
