// Uno page: one player's view of a game the bot runs. The bot sends each
// player a link, mandem.arazez.com/uno#<token>; the token after # never
// reaches GitHub. The page asks the bot for the table (waiting for the next
// move each time) and sends moves, both with the token. All the rules live
// in the bot: this page only shows what it's told and passes clicks on.
// Owner's rulings: every card looks the same whether it can go or not
// (no hints), and names are inserted as text, never HTML. A sound and a
// flashing tab say it's your turn; nothing is sent in TeamSpeak for it.
// Keys: D draws, P passes; while picking a Wild's colour, R, Y, G or B, and Esc.
// Play again (owner ruling): a finished game's page opens or joins the next
// game in its channel, and moves to that game by itself once it starts.
// Local testing: ?api=http://localhost:39365/uno/api (the bot's
// UNO_WEB_ORIGINS must then include this page's address).
import { el, fill, notice, queryParam } from "./ui.js";
import { UK, formatUkTime } from "./time.js";

const API = queryParam("api") || "https://breakfastchief.baron.usbx.me/uno/api";
// Whose page this is. Play again swaps in the new game's token without a reload,
// so the sound the player has already allowed keeps working.
let token = /^#[A-Za-z0-9_-]{24}$/.test(window.location.hash) ? window.location.hash.slice(1) : null;
const BASE_TITLE = "Uno | Mandem Server";

const root = document.getElementById("uno");
const title = document.getElementById("unoTitle");
const lead = document.getElementById("unoLead");

const COLOUR_NAMES = { red: "Red", yellow: "Yellow", green: "Green", blue: "Blue" };
const SYMBOLS = { skip: "⊘", reverse: "⇄", "+2": "+2", wild: "★", "wild+4": "+4" };

let view = null;        // the latest table from the bot
let deadline = null;    // when the turn runs out, by this page's clock
let busy = false;       // a move is on its way
let picking = null;     // the wild waiting for a colour
let message = "";       // the bot's answer to the last move
let quitArmed = false;  // Quit pressed once: press again to confirm
let lostTouch = false;  // the bot can't be reached right now
let animateTop = false; // a new top card: it pops in once
let unoBanner = null;   // { text, until }: someone just got down to one card
let flashTimer = null;  // the tab title blinking while it's your turn elsewhere
let audio = null;       // made on the first click or key press, as browsers require
let soundOn = readSoundSetting();
let lobbyDeadline = null; // when Play again's new game closes if nobody starts it

// "Uno · Tue 6 Oct, 21.15": when the game started, UK time (owner's choice over the game number).
function gameTitle(game) {
  if (!game.startedAt) return "Uno";
  const at = new Date(game.startedAt);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: UK, weekday: "short", day: "numeric", month: "short" }).format(at);
  return "Uno · " + day + ", " + formatUkTime(at);
}

function sameCard(a, b) {
  return a.value === b.value && a.colour === b.colour;
}

function cardName(card) {
  if (card.value === "wild") return "Wild";
  if (card.value === "wild+4") return "Wild +4";
  const value = { skip: "Skip", reverse: "Reverse" }[card.value] || card.value;
  return COLOUR_NAMES[card.colour] + " " + value;
}

// A card face. The colour's name is printed on it too, so the colour never
// carries meaning on its own.
function cardFace(card, extraClass) {
  const face = el("span", "uno-card " + (card.colour ? "uno-" + card.colour : "uno-wild") + (extraClass ? " " + extraClass : ""),
    el("span", "uno-card-value", SYMBOLS[card.value] || card.value),
    el("span", "uno-card-colour", card.colour ? COLOUR_NAMES[card.colour] : card.value === "wild" ? "Wild" : "Wild +4"));
  face.setAttribute("aria-hidden", "true");
  return face;
}

// --- Turn alert: a short two-note chime and a blinking tab -------------------
function readSoundSetting() {
  try {
    return localStorage.getItem("unoSound") !== "off";
  } catch {
    return true;
  }
}

function setSound(on) {
  soundOn = on;
  try {
    localStorage.setItem("unoSound", on ? "on" : "off");
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

function turnAlert() {
  chime();
  if (!document.hidden || flashTimer) return;
  let lit = false;
  flashTimer = setInterval(() => {
    if (!document.hidden || !view || !view.yourTurn) return stopFlash();
    lit = !lit;
    document.title = lit ? "▶ YOUR TURN ◀" : "Your turn · " + BASE_TITLE;
  }, 1000);
}

function stopFlash() {
  clearInterval(flashTimer);
  flashTimer = null;
  if (view) document.title = (view.yourTurn ? "Your turn · " : "") + BASE_TITLE;
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) stopFlash();
});

function showUno(text) {
  unoBanner = { text, until: Date.now() + 3000 };
  setTimeout(() => {
    if (unoBanner && Date.now() >= unoBanner.until) {
      unoBanner = null;
      render();
    }
  }, 3100);
}

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
  if (before && !next.locked) {
    if (!sameCard(before.top, next.top) || before.colour !== next.colour) animateTop = true;
    const uno = next.players.find((p) => p.cards === 1 && before.players.find((q) => q.name === p.name)?.cards !== 1);
    if (uno && !next.over) showUno(uno.you ? "Uno! You have one card left." : "Uno! " + uno.name + " has one card left.");
    if (next.yourTurn && !before.yourTurn && !next.over) turnAlert();
  }
  if (!view || next.version !== view.version) {
    // A new turn or a new card: anything half done no longer applies.
    if (view && !next.yourTurn) picking = null;
    quitArmed = false;
  }
  view = next;
  deadline = typeof next.turnLeftMs === "number" ? performance.now() + next.turnLeftMs : null;
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
  picking = null;
  quitArmed = false;
  unoBanner = null;
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
    picking = null;
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
  title.textContent = "Uno";
  lead.textContent = "";
  document.title = BASE_TITLE;
  fill(root, notice("This game is over, or the link is old", "Start a new game in TeamSpeak: type !uno in your channel."));
}

function secondsLeft() {
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
}

function countdownText() {
  const left = secondsLeft();
  if (left === null) return "";
  const warn = left * 1000 <= view.warnMs;
  if (!warn) return left + "s";
  if (!view.yourTurn) return left + "s left";
  return left + "s left, or " + (view.drawn ? "your turn ends" : "you draw a card");
}

function render() {
  if (!view) return;
  if (view.locked) {
    title.textContent = "Uno";
    lead.textContent = "";
    document.title = BASE_TITLE;
    fill(root, notice("You're in a locked channel", "Games are off while you're there. Your turns run out until you leave it, and miss 3 in a row and you're out."));
    return;
  }

  const current = view.players.find((p) => p.turn);
  title.textContent = gameTitle(view);
  // The number is what !uno games and !uno void go by.
  lead.textContent = "Game " + view.game + " · " + (view.over ? "This game is over." : view.playing ? "Click a card to play it." : "You're out of this game, but you can still watch.");
  document.title = (view.yourTurn ? "Your turn · " : "") + BASE_TITLE;

  const parts = [];
  if (lostTouch) parts.push(el("p", "uno-alert", "Lost touch with the bot. Trying again…"));

  // Whose turn, and the clock.
  const status = el("div", "uno-status" + (view.yourTurn ? " mine" : ""));
  status.setAttribute("aria-live", "polite");
  if (view.over) status.append(el("strong", null, "Game over"));
  else if (current) {
    status.append(el("strong", null, view.yourTurn ? "Your turn" : current.name + "'s turn"));
    const clock = el("span", "uno-clock", countdownText());
    clock.id = "unoClock";
    const sound = el("button", "uno-sound", soundOn ? "🔔 Sound on" : "🔕 Sound off");
    sound.type = "button";
    sound.title = "A chime when it's your turn. It plays once you've clicked anywhere on this page.";
    sound.setAttribute("aria-pressed", String(soundOn));
    sound.addEventListener("click", () => setSound(!soundOn));
    status.append(el("span", "uno-status-side", clock, sound));
  }
  parts.push(status);
  if (unoBanner && Date.now() < unoBanner.until && !view.over) parts.push(el("div", "uno-banner", unoBanner.text));

  if (view.over && view.result) {
    parts.push(el("div", "card uno-result",
      ...view.result.map((line) => el("p", null, line)),
      playAgain()));
  }

  if (view.playing && !view.over && view.missed > 0 && view.missed === view.dropAfter - 1) {
    parts.push(el("p", "uno-alert", "You've missed " + view.missed + " turns in a row. Miss one more and you're out of the game."));
  }

  // The table: the top card and the colour in play, then everyone in seat order.
  const colourNote = view.colour ? "Colour: " + COLOUR_NAMES[view.colour] : "Any colour";
  const top = el("div", "uno-top", cardFace(view.top, "big" + (animateTop ? " just-played" : "")), el("div", "uno-top-info",
    el("span", "muted small", "Top card"),
    el("strong", null, cardName(view.top)),
    el("span", "uno-colour-note" + (view.colour ? " uno-text-" + view.colour : ""), colourNote),
    el("span", "muted small", view.direction === 1 ? "Play goes down the list ↓" : "Play goes up the list ↑")));
  top.setAttribute("aria-label", "Top card: " + cardName(view.top) + ". " + colourNote + ".");
  const players = el("ol", "uno-players", ...view.players.map((p) =>
    el("li", (p.turn ? "turn" : "") + (p.you ? " you" : ""),
      el("span", "uno-player-name", p.name + (p.you ? " (you)" : "")),
      el("span", "uno-player-cards", p.cards + (p.cards === 1 ? " card · Uno!" : " cards")))));
  parts.push(el("div", "card uno-table", top, players));
  animateTop = false;

  // Your hand, and what you can do.
  if (view.playing && !view.over) {
    const canAct = view.yourTurn && !busy;
    let drawnMarked = false;
    const hand = el("div", "uno-hand", ...view.hand.map((card) => {
      const isDrawn = !drawnMarked && view.drawn && card.value === view.drawn.value && card.colour === view.drawn.colour;
      if (isDrawn) drawnMarked = true;
      const button = el("button", "uno-card-btn" + (isDrawn ? " drawn" : ""), cardFace(card), isDrawn ? el("span", "uno-drawn-tag", "Just drawn") : null);
      button.type = "button";
      button.disabled = !canAct;
      button.setAttribute("aria-label", cardName(card) + (isDrawn ? ", just drawn" : ""));
      button.addEventListener("click", () => {
        if (card.value === "wild" || card.value === "wild+4") {
          picking = card;
          message = "";
          render();
        } else {
          move({ action: "play", card });
        }
      });
      return button;
    }));

    const actions = el("div", "uno-actions");
    const draw = el("button", "btn btn-outline", "Draw");
    draw.type = "button";
    draw.disabled = !canAct || Boolean(view.drawn);
    draw.addEventListener("click", () => move({ action: "draw" }));
    const pass = el("button", "btn btn-outline", "Pass");
    pass.type = "button";
    pass.disabled = !canAct || !view.drawn;
    pass.addEventListener("click", () => move({ action: "pass" }));
    const quit = el("button", "btn btn-outline uno-quit", quitArmed ? "Press again to quit" : "Quit");
    quit.type = "button";
    quit.disabled = busy;
    quit.addEventListener("click", () => {
      if (!quitArmed) {
        quitArmed = true;
        render();
        return;
      }
      quitArmed = false;
      move({ action: "quit" });
    });
    actions.append(draw, pass, quit);

    const handCard = el("div", "card uno-hand-card", el("h2", null, "Your cards"), hand, actions,
      el("p", "muted small uno-keys", "Keys: D to draw, P to pass."));
    if (message) handCard.append(el("p", "uno-message", message));
    if (quitArmed) handCard.append(el("p", "muted small", "Quitting counts as giving up, and your cards still count for whoever wins."));
    if (picking) handCard.append(colourPicker(picking));
    parts.push(handCard);
  } else if (message) {
    parts.push(el("p", "uno-message", message));
  }

  if (view.log.length) {
    parts.push(el("section", "uno-log", el("h2", null, "Latest moves"),
      el("ol", "card", ...view.log.slice().reverse().map((line, i) => el("li", i === 0 ? "newest" : null, line)))));
  }

  fill(root, ...parts);
}

function button(label, className, action, disabled) {
  const b = el("button", className, label);
  b.type = "button";
  b.disabled = Boolean(disabled) || busy;
  b.addEventListener("click", () => move({ action }));
  return b;
}

// Under the result: open the next game, or the one someone else opened.
function playAgain() {
  const next = view.next;
  const box = el("div", "uno-again");
  if (!next) {
    box.append(button("Play again", "btn uno-again-btn", "again"),
      el("p", "muted small", "Opens a new game in the same channel. Everyone there is invited, and this game's players can join from here."));
    return box;
  }
  if (next.phase === "playing") {
    box.append(el("p", "muted", "A new game has started without you. Type !uno in your channel in TeamSpeak for the next one."));
    return box;
  }
  box.append(el("p", null, el("strong", null, (next.hosting ? "You" : next.host) + " opened a new game. "), "In it: " + next.players.join(", ") + "."));
  const row = el("div", "uno-actions");
  if (!next.joined) row.append(button("Join", "btn uno-again-btn", "join"));
  else {
    if (next.hosting) row.append(button("Start", "btn uno-again-btn", "start", next.players.length < 2));
    row.append(button("Leave", "btn btn-outline", "leave"));
  }
  box.append(row);
  const waiting = next.hosting
    ? next.players.length < 2 ? "Waiting for at least one more player." : "Press Start once everyone's in."
    : next.joined ? "Waiting for " + next.host + " to start it." : "";
  const closes = el("span", null, lobbyText());
  closes.id = "unoLobbyClock";
  box.append(el("p", "muted small", waiting ? waiting + " " : "", closes));
  return box;
}

function lobbyText() {
  if (lobbyDeadline === null) return "";
  const left = Math.max(0, Math.ceil((lobbyDeadline - performance.now()) / 1000));
  return "It closes in " + left + "s if nobody starts it.";
}

function colourPicker(card) {
  const box = el("div", "uno-picker", el("p", null, "Pick a colour for your " + cardName(card) + ":"));
  const row = el("div", "uno-picker-row");
  Object.entries(COLOUR_NAMES).forEach(([colour, name]) => {
    const button = el("button", "uno-pick uno-" + colour, name);
    button.type = "button";
    button.disabled = busy;
    button.addEventListener("click", () => move({ action: "play", card, choose: colour }));
    row.append(button);
  });
  const cancel = el("button", "btn btn-outline", "Cancel");
  cancel.type = "button";
  cancel.addEventListener("click", () => {
    picking = null;
    render();
  });
  row.append(cancel);
  box.append(row, el("p", "muted small uno-keys", "Or press R, Y, G or B. Esc cancels."));
  return box;
}

// The clock ticks on its own; everything else redraws only when something changes.
setInterval(() => {
  const lobbyClock = document.getElementById("unoLobbyClock");
  if (lobbyClock) lobbyClock.textContent = lobbyText();
  const clock = document.getElementById("unoClock");
  if (!clock || !view || view.locked) return;
  clock.textContent = countdownText();
  const left = secondsLeft();
  clock.classList.toggle("warn", left !== null && left * 1000 <= view.warnMs);
}, 250);

// D draws, P passes; R, Y, G or B picks a Wild's colour, and Esc cancels.
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (!view || view.locked || view.over || !view.playing || !view.yourTurn || busy) return;
  const key = e.key.toLowerCase();
  if (picking) {
    const colour = { r: "red", y: "yellow", g: "green", b: "blue" }[key];
    if (colour) {
      e.preventDefault();
      move({ action: "play", card: picking, choose: colour });
    } else if (key === "escape") {
      picking = null;
      render();
    }
    return;
  }
  if (key === "d" && !view.drawn) {
    e.preventDefault();
    move({ action: "draw" });
  } else if (key === "p" && view.drawn) {
    e.preventDefault();
    move({ action: "pass" });
  }
});

// A new game's link opened over this one changes only the part after #, which
// doesn't reload the page by itself.
window.addEventListener("hashchange", () => window.location.reload());

if (!token) {
  fill(root, notice("Open this page from your link", "Start a game in TeamSpeak with !uno. When it starts, the bot sends everyone their own link to this page."));
} else {
  follow();
}
