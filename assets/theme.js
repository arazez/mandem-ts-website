// Applies a saved light/dark choice before the page draws, so it doesn't
// flash the wrong colours. Loaded as a plain (blocking) script in <head>.
// No saved choice: dark, whatever the device setting (owner's choice).
// The toggle button is built in assets/layout.js.
try {
  var saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
} catch (e) { /* storage blocked: stay dark */ }
