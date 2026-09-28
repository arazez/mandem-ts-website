// Home page: a "donations are open" box while the window is open, so people
// following old donate links find their way to Supporters.
import { loadDonations } from "./data.js";
import { el, fill } from "./ui.js";
import { donationStatus, lastOpenDay } from "./donation-state.js";
import { formatDateOnly, ukToday } from "./time.js";

// Temporary corner card linking to the bot tour. Shows until the end of its
// last day (UK time); closing it hides it for good on that device.
const TOUR_LAST_DAY = "2026-10-31";
const TOUR_KEY = "tourCardClosed";
const tourCard = document.getElementById("tourCard");
let tourClosed = false;
try { tourClosed = localStorage.getItem(TOUR_KEY) === "1"; } catch (err) { /* storage blocked: show it */ }
if (!tourClosed && ukToday() <= TOUR_LAST_DAY) {
  tourCard.hidden = false;
  tourCard.querySelector(".tour-card-close").addEventListener("click", () => {
    tourCard.hidden = true;
    try { localStorage.setItem(TOUR_KEY, "1"); } catch (err) { /* not remembered, that's fine */ }
  });
}

try {
  const res = await loadDonations();
  if (res.status === "ok") {
    const { state, win } = donationStatus(res.data);
    const box = document.getElementById("donationCallout");
    const callout = el("a", "callout");
    callout.href = "supporters";
    if (state === "open") {
      fill(callout, el("strong", null, "Donations are open until " + formatDateOnly(lastOpenDay(win)) + "."),
        " Help keep the server online for another year, and get perks for it. Go to Supporters →");
    } else if (state === "goal") {
      fill(callout, el("strong", null, "🎉 We hit this year's goal."), " Thank you! See everyone who chipped in →");
    }
    if (state !== "closed") {
      fill(box, callout);
      box.hidden = false;
    }
  }
} catch (err) {
  console.error(err); // the box is optional; the page works without it
}
