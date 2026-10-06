// Trivia page: one player's view of a game the bot runs, like the Uno page.
// The bot sends each player a link, mandem.arazez.com/trivia#<token>; the
// token after # never reaches GitHub. The page asks the bot for the game
// (waiting for the next change each time) and sends answers, both with the
// token. All the rules live in the bot: this page only shows what it's told
// and passes clicks on. Names are inserted as text, never HTML.
// Owner's rulings: green marks the right answer and red a miss, and the
// words always say so too. A sound and a flashing tab say a new question is
// up; nothing is sent in TeamSpeak for it.
// Keys: 1 to 4 answer.
// Play again (as for Uno): a finished game's page opens or joins the next
// game in its channel, and moves to that game by itself once it starts.
// Local testing: ?api=http://localhost:39365/uno/trivia/api (the bot's
// UNO_WEB_ORIGINS must then include this page's address).
import { el, fill, notice, queryParam, toggleSwitch } from "./ui.js";
import { UK, formatUkTime } from "./time.js";

// Trivia rides on the Uno page's address at the seedbox, under /uno/trivia/.
const API = queryParam("api") || "https://breakfastchief.baron.usbx.me/uno/trivia/api";
// Whose page this is. Play again swaps in the new game's token without a reload,
// so the sound the player has already allowed keeps working.
let token = /^#[A-Za-z0-9_-]{24}$/.test(window.location.hash) ? window.location.hash.slice(1) : null;
const BASE_TITLE = "Trivia | Mandem Server";

const root = document.getElementById("trivia");
const title = document.getElementById("triviaTitle");
const lead = document.getElementById("triviaLead");

let view = null;        // the latest game from the bot
let deadline = null;    // when the question closes, or the next one comes, by this page's clock
let busy = false;       // an answer is on its way
let message = "";       // the bot's answer to the last click
let leaveArmed = false; // Leave pressed once: press again to confirm
let lostTouch = false;  // the bot can't be reached right now
let flashTimer = null;  // the tab title blinking while a new question waits elsewhere
let audio = null;       // made on the first click or key press, as browsers require
let soundOn = readSoundSetting();
let lobbyDeadline = null; // when Play again's new game closes if nobody starts it

// "Football trivia · Tue 6 Oct, 21.15": the topic and when the game started, UK time.
function gameTitle(game) {
  const name = game.topic ? game.topic.charAt(0).toUpperCase() + game.topic.slice(1) + " trivia" : "Trivia";
  if (!game.startedAt) return name;
  const at = new Date(game.startedAt);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: UK, weekday: "short", day: "numeric", month: "short" }).format(at);
  return name + " · " + day + ", " + formatUkTime(at);
}

// --- New-question alert: a short two-note chime and a blinking tab -------------
function readSoundSetting() {
  try {
    return localStorage.getItem("triviaSound") !== "off";
  } catch {
    return true;
  }
}

function setSound(on) {
  soundOn = on;
  try {
    localStorage.setItem("triviaSound", on ? "on" : "off");
  } catch { /* storage blocked: the choice lasts until the page closes */ }
  render();
}

// Browsers only allow sound once someone has clicked or pressed a key on the page.
function unlockAudio() {
  if (!audio) {
    try {
      audio = new AudioContext();
    } catch {
      return;
    }
  }
  if (audio.state === "suspended") audio.resume();
}
document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("keydown", unlockAudio);

function chime() {
  if (!soundOn || !audio || audio.state !== "running") return;
  const now = audio.currentTime;
  [[660, 0], [880, 0.16]].forEach(([frequency, at]) => {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = frequency;
    volume.gain.setValueAtTime(0.0001, now + at);
    volume.gain.exponentialRampToValueAtTime(0.25, now + at + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.15);
    tone.connect(volume).connect(audio.destination);
    tone.start(now + at);
    tone.stop(now + at + 0.16);
  });
}

function canAnswer() {
  return Boolean(view && !view.locked && view.phase === "question" && view.playing && view.yourChoice === null && !view.waiting);
}

function questionAlert() {
  chime();
  if (!document.hidden || flashTimer) return;
  let lit = false;
  flashTimer = setInterval(() => {
    if (!document.hidden || !canAnswer()) return stopFlash();
    lit = !lit;
    document.title = lit ? "▶ NEW QUESTION ◀" : "New question · " + BASE_TITLE;
  }, 1000);
}

function stopFlash() {
  clearInterval(flashTimer);
  flashTimer = null;
  document.title = (canAnswer() ? "New question · " : "") + BASE_TITLE;
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) stopFlash();
});

async function call(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    cache: "no-store",
    headers: { Authorization: "Bearer " + token, ...(options.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (res.status === 404) return { gone: true };
  if (!res.ok) throw new Error("The bot answered " + res.status);
  return res.json();
}

// Waits for each change in turn. A dropped connection tries again, more slowly
// each time; a link the bot no longer knows ends it.
async function follow() {
  let failures = 0;
  for (;;) {
    try {
      const asked = token;
      const answer = await call("/state" + (view ? "?since=" + view.version : ""));
      if (asked !== token) continue; // an answer about the game this page has left
      if (answer.gone) return gone();
      failures = 0;
      lostTouch = false;
      show(answer);
    } catch {
      failures += 1;
      lostTouch = true;
      render();
      await new Promise((resolve) => setTimeout(resolve, Math.min(10_000, 1_000 * failures)));
    }
  }
}

function show(next) {
  const before = view && !view.locked ? view : null;
  if (!next.locked && next.phase === "question" && next.playing && (!before || before.number !== next.number || before.phase !== "question")) {
    // A new question: the last answer's note no longer applies.
    message = "";
    if (before) questionAlert();
  }
  if (!view || next.version !== view.version) leaveArmed = false;
  view = next;
  deadline = typeof next.leftMs === "number" ? performance.now() + next.leftMs : null;
  lobbyDeadline = next.next && next.next.phase === "lobby" ? performance.now() + next.next.closesInMs : null;
  if (next.next && next.next.phase === "playing" && next.next.token) return switchTo(next.next.token);
  render();
}

// Play again's game has started with this player in it: follow it here.
function switchTo(newToken) {
  token = newToken;
  history.replaceState(null, "", "#" + newToken);
  view = null;
  message = "";
  leaveArmed = false;
  fill(root, el("p", "muted", "Loading the new game…"));
}

async function move(body) {
  if (busy) return;
  busy = true;
  message = "";
  render();
  try {
    const asked = token;
    const answer = await call("/move", { method: "POST", body: JSON.stringify(body) });
    if (asked !== token) return;
    if (answer.gone) return gone();
    message = answer.message || "";
    if (answer.view) show(answer.view);
  } catch {
    message = "Couldn't reach the bot. Try again in a moment.";
  } finally {
    busy = false;
    render();
  }
}

function gone() {
  // A game that has ended stays on screen; anything else gets the old-link note.
  if (view && !view.locked && view.over) {
    deadline = null;
    render();
    return;
  }
  title.textContent = "Trivia";
  lead.textContent = "";
  document.title = BASE_TITLE;
  fill(root, notice("This game is over, or the link is old", "Start a new game in TeamSpeak: type !trivia in your channel."));
}

function secondsLeft() {
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
}

function clockText() {
  const left = secondsLeft();
  if (left === null || !view || view.locked) return "";
  if (view.phase === "ready") return "Question 1 in " + left + "s";
  if (view.phase === "between") return "Next question in " + left + "s";
  return left + "s";
}

// How much of the answer time is left, as a share for the bar under the status.
function barShare() {
  if (deadline === null || !view || view.phase !== "question") return 0;
  return Math.max(0, Math.min(1, (deadline - performance.now()) / view.answerMs));
}

// What happened to the open or last question, in words.
function feedback() {
  if (view.waiting) return "You joined during this question. You'll get the next one.";
  // While the question is open, an answer given is wrong: a right one closes it.
  if (view.phase === "question") return view.yourChoice !== null ? "Wrong, wait for the next one." : "";
  const r = view.reveal;
  if (!r) return "";
  if (r.how === "got") return view.yourChoice === view.correct ? "You got it!" : r.name + " got it.";
  if (r.how === "nobody") return "Nobody got it.";
  return "Time's up.";
}

function render() {
  if (!view) return;
  if (view.locked) {
    title.textContent = "Trivia";
    lead.textContent = "";
    document.title = BASE_TITLE;
    fill(root, notice("You're in a locked channel", "Games are off while you're there, so you're out of this game. Your points so far still count."));
    return;
  }

  title.textContent = gameTitle(view);
  lead.textContent = view.over ? "This game is over."
    : !view.playing ? "You've left this game, but you can still watch."
    : view.phase === "ready" ? "Get ready: the first question is on its way."
    : "Click an answer, or press its number.";
  if (!flashTimer) document.title = (canAnswer() ? "New question · " : "") + BASE_TITLE;

  const parts = [];
  if (lostTouch) parts.push(el("p", "uno-alert", "Lost touch with the bot. Trying again…"));

  // The question number, and the clock.
  const status = el("div", "uno-status" + (canAnswer() ? " mine" : ""));
  status.setAttribute("aria-live", "polite");
  status.append(el("strong", null, view.over ? "Game over" : view.phase === "ready" ? "Get ready" : "Question " + view.number + " of " + view.count));
  if (!view.over) {
    const clock = el("span", "uno-clock", clockText());
    clock.id = "triviaClock";
    const sound = toggleSwitch("🔔 Sound", soundOn, setSound, "A chime when a new question comes up. It plays once you've clicked anywhere on this page.");
    status.append(el("span", "uno-status-side", clock, sound));
  }
  parts.push(status);

  if (view.over && view.result) {
    // A gold outline for the winner, red for everyone else; plain when nobody scored.
    const outcome = view.outcome === "won" ? " won" : view.outcome === "lost" ? " lost" : "";
    parts.push(el("div", "card uno-result" + outcome,
      ...view.result.map((line) => el("p", null, line)),
      playAgain()));
  }

  // The question and its four answers.
  const bar = el("div", "trivia-bar", el("span", null));
  bar.id = "triviaBar";
  bar.hidden = view.phase !== "question";
  bar.setAttribute("aria-hidden", "true");
  const answers = el("ol", "trivia-answers", ...view.choices.map((choice, i) => {
    const right = view.correct === i;
    const mine = view.yourChoice === i;
    // While the question is open, your answer can only be a wrong one: a right one closes it.
    const wrong = mine && !right;
    const button = el("button", "trivia-answer" + (right ? " right" : "") + (wrong ? " wrong" : ""),
      el("span", "trivia-number", String(i + 1)),
      el("span", "trivia-choice", choice),
      right ? el("span", "trivia-tag", mine ? "✓ Right: your answer" : "✓ Right answer") : wrong ? el("span", "trivia-tag", "✗ Your answer") : null);
    button.type = "button";
    button.disabled = !canAnswer() || busy;
    button.addEventListener("click", () => move({ action: "answer", choice: i }));
    return el("li", null, button);
  }));
  // Before question 1 (owner ruling: time for everyone to open their page), a countdown instead.
  const count = el("span", null, String(secondsLeft() ?? ""));
  count.id = "triviaReady";
  const card = view.phase === "ready"
    ? el("div", "card trivia-card trivia-ready",
      el("p", "trivia-ready-count", count),
      el("p", "muted", "The first question comes up when this reaches 0, so everyone has time to open their page. " + view.count + " questions, " + Math.round(view.answerMs / 1000) + " seconds each."))
    : el("div", "card trivia-card",
      el("p", "muted small trivia-category", view.category),
      el("h2", "trivia-question", view.question),
      bar,
      answers);
  const said = feedback();
  if (said) card.append(el("p", "uno-message", said));
  if (message) card.append(el("p", "uno-message", message));
  if (view.playing && !view.over) {
    const leave = el("button", "btn btn-outline uno-quit", leaveArmed ? "Press again to leave" : "Leave");
    leave.type = "button";
    leave.disabled = busy;
    leave.addEventListener("click", () => {
      if (!leaveArmed) {
        leaveArmed = true;
        render();
        return;
      }
      leaveArmed = false;
      move({ action: "quit" });
    });
    card.append(el("div", "uno-actions trivia-actions", el("p", "muted small uno-keys", "Keys: 1, 2, 3 or 4 to answer."), leave));
    if (leaveArmed) card.append(el("p", "muted small", "Your points so far still count, and the others play on."));
  }
  // A game everyone left before question 1 has no question to show.
  if (view.number > 0 || !view.over) parts.push(card);

  // Everyone's score, highest first, with a tick for who has answered the open question.
  parts.push(el("section", "trivia-scores", el("h2", null, "Scores"),
    el("ol", "card", ...view.players.map((p) =>
      el("li", p.you ? "you" : null,
        el("span", "trivia-player-name", p.name + (p.you ? " (you)" : "") + (p.left ? " (left)" : "")),
        el("span", "trivia-player-side",
          p.answered ? el("span", "trivia-answered", "✓ answered") : null,
          el("span", "trivia-player-score", p.score + (p.score === 1 ? " point" : " points"))))))));

  fill(root, ...parts);
}

function button(label, className, action, disabled) {
  const b = el("button", className, label);
  b.type = "button";
  b.disabled = Boolean(disabled) || busy;
  b.addEventListener("click", () => move({ action }));
  return b;
}

// Under the result: open the next game, or join the one someone else opened.
function playAgain() {
  const next = view.next;
  const box = el("div", "uno-again");
  if (!next) {
    box.append(button("Play again", "btn uno-again-btn", "again"),
      el("p", "muted small", "Opens a new game on the same topic in the same channel. Everyone there is invited, and this game's players can join from here."));
    return box;
  }
  if (next.phase === "playing") {
    // Trivia takes late joiners, so this game's players can still hop in.
    box.append(el("p", null, el("strong", null, "A new game has started. "), "You can still join: you'll start from the next question."),
      el("div", "uno-actions", button("Join", "btn uno-again-btn", "join")));
    return box;
  }
  box.append(el("p", null, el("strong", null, (next.hosting ? "You" : next.host) + " opened a new game. "), "In it: " + next.players.join(", ") + "."));
  const row = el("div", "uno-actions");
  if (!next.joined) row.append(button("Join", "btn uno-again-btn", "join"));
  else {
    if (next.hosting) row.append(button("Start", "btn uno-again-btn", "start"));
    row.append(button("Leave", "btn btn-outline", "leave"));
  }
  box.append(row);
  const waiting = next.hosting ? "Press Start once everyone's in." : next.joined ? "Waiting for " + next.host + " to start it." : "";
  const closes = el("span", null, lobbyText());
  closes.id = "triviaLobbyClock";
  box.append(el("p", "muted small", waiting ? waiting + " " : "", closes));
  return box;
}

function lobbyText() {
  if (lobbyDeadline === null) return "";
  const left = Math.max(0, Math.ceil((lobbyDeadline - performance.now()) / 1000));
  return "It closes in " + left + "s if nobody starts it.";
}

// The clock and the bar tick on their own; everything else redraws only when something changes.
setInterval(() => {
  const ready = document.getElementById("triviaReady");
  if (ready) ready.textContent = String(secondsLeft() ?? "");
  const lobbyClock = document.getElementById("triviaLobbyClock");
  if (lobbyClock) lobbyClock.textContent = lobbyText();
  const clock = document.getElementById("triviaClock");
  if (!clock || !view || view.locked) return;
  clock.textContent = clockText();
  const left = secondsLeft();
  clock.classList.toggle("warn", view.phase === "question" && left !== null && left <= 5);
  const bar = document.querySelector("#triviaBar span");
  if (bar) bar.style.width = (barShare() * 100).toFixed(1) + "%";
}, 100);

// 1 to 4 answer.
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (!canAnswer() || busy) return;
  const choice = ["1", "2", "3", "4"].indexOf(e.key);
  if (choice === -1 || choice >= view.choices.length) return;
  e.preventDefault();
  move({ action: "answer", choice });
});

// A new game's link opened over this one changes only the part after #, which
// doesn't reload the page by itself.
window.addEventListener("hashchange", () => window.location.reload());

if (!token) {
  fill(root, notice("Open this page from your link", "Start a game in TeamSpeak with !trivia. When it starts, the bot sends everyone their own link to this page."));
} else {
  follow();
}
