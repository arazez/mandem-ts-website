// Perks page: how perks are earned (thresholds from donations.json) and who
// has what right now (perks.json).
import { loadDonations, loadPerks } from "./data.js";
import { el, link, fill, loadFailed, formatMoney, perkChips, updatedNote } from "./ui.js";

function renderEarn(d) {
  const money = (n) => formatMoney(n, d.currency);
  fill(document.getElementById("earnCard"),
    el("ul", "perk-rules",
      el("li", null, el("span", null, el("strong", null, "Every " + money(1)), " you donate gets you 1 week of banner and 1 week of modal.")),
      el("li", null, el("span", null, el("strong", null, money(d.muteMinimum) + " or more"), " also gets you a mute.")),
      el("li", null, el("span", null, el("strong", null, money(d.adminMinimum) + " or more"), " also gets you server admin, the level at the owner's discretion."))
    ),
    el("p", "perk-rules-head", "How weeks work"),
    el("ul", "perk-rules",
      el("li", null, "Your week starts when you send the start command, not when you donate."),
      el("li", null, "Once it starts, nobody can interrupt it, and you can't pause it: it runs the full week, then ends."),
      el("li", null, "The one exception: an important service modal from the owner can interrupt your modal. Your week pauses while it's up and carries on once it's gone, so you lose no time."),
      el("li", null, "One person holds the banner (or modal) at a time. If it's taken, the bot tells you when it's free."),
      el("li", null, "Banner and modal are separate, so you can use each one on its own.")
    ),
    el("p", "perks-foot", "Donations open once a year. ", link("supporters.html", null, "See Supporters for when."))
  );
}

function renderWho(perks) {
  const card = document.getElementById("whoCard");
  if (perks.perks.length === 0) {
    fill(card, el("p", "muted", "Nobody has perks right now."));
    return;
  }
  const now = new Date();
  fill(card,
    el("ul", "donors", ...perks.perks.map((p) => el("li", null, p.name, perkChips(p, now)))),
    el("p", "updated-note", updatedNote("Perks last updated", perks.lastUpdated))
  );
}

try {
  const [donations, perks] = await Promise.all([loadDonations(), loadPerks()]);
  if (donations.status === "ok") renderEarn(donations.data);
  else fill(document.getElementById("earnCard"), loadFailed());
  if (perks.status === "ok") renderWho(perks.data);
  else fill(document.getElementById("whoCard"), loadFailed());
} catch (err) {
  console.error(err);
  fill(document.getElementById("earnCard"), loadFailed());
  fill(document.getElementById("whoCard"), loadFailed());
}
