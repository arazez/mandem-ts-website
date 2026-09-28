// Leaderboards page: trivia and Uno top 10s from leaderboards.json, shown in
// the file's order (the bot ranks them; never re-sort).
import { loadLeaderboards } from "./data.js";
import { el, fill, loadFailed, comingSoon } from "./ui.js";
import { formatUkMoment } from "./time.js";

const boards = document.getElementById("boards");

function winRate(won, lost) {
  return won + lost === 0 ? "–" : Math.round((won / (won + lost)) * 100) + "%";
}

function table(title, columns, rows) {
  const body = rows.length
    ? el("div", "table-scroll", el("table", "data",
        el("thead", null, el("tr", null, ...columns.map(([label, cls]) => el("th", cls, label)))),
        el("tbody", null, ...rows.map((cells) =>
          el("tr", null, ...cells.map((c, i) => el("td", columns[i][1], c)))))))
    : el("p", "muted", "No games played yet.");
  return el("section", null, el("h2", null, title), el("div", "card", body));
}

try {
  const res = await loadLeaderboards();
  if (res.status === "missing") {
    fill(boards, comingSoon("Trivia and Uno top 10s will show up here soon."));
  } else if (res.status !== "ok") {
    fill(boards, loadFailed());
  } else {
    const { trivia, uno, updatedAt } = res.data;
    fill(boards, el("div", "board-grid",
      table("🧠 Trivia", [["#", "rank"], ["User", "name"], ["Points", "num"]],
        trivia.map((r, i) => [String(i + 1), r.name, String(r.points)])),
      table("🃏 Uno", [["#", "rank"], ["User", "name"], ["Points", "num"], ["Won", "num"], ["Lost", "num"], ["Win rate", "num"]],
        uno.map((r, i) => [String(i + 1), r.name, String(r.points), String(r.won), String(r.lost), winRate(r.won, r.lost)]))
    ));
    if (updatedAt) document.getElementById("boardsUpdated").textContent = "Updated " + formatUkMoment(updatedAt) + ".";
  }
} catch (err) {
  console.error(err);
  fill(boards, loadFailed());
}
