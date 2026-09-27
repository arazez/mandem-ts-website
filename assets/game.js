// "Lemon Drop", the 404 page's mini-game. Catch falling lemons in the basket
// and dodge the bombs; a missed lemon or a caught bomb costs a life.
// Move: arrow keys / A-D, mouse or touch. Start: Space, Enter, click or tap.
// The best score is kept in this browser only.

const W = 640;
const H = 360;
const BASKET_Y = H - 46;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const BEST_KEY = "lemon-drop-best";

let scale = 1;
let state = "ready"; // "ready" | "playing" | "over"
let basket, items, lives, score, spawnIn, clock, targetX, last;
const keys = new Set();

let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { /* not saved, that's fine */ }

function resize() {
  const width = Math.min(W, canvas.parentElement.clientWidth);
  const dpr = window.devicePixelRatio || 1;
  scale = width / W;
  canvas.style.width = width + "px";
  canvas.style.height = H * scale + "px";
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(H * scale * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}

function reset() {
  basket = { x: W / 2, w: 72 };
  items = [];
  lives = 3;
  score = 0;
  spawnIn = 0.6;
  clock = 0;
  targetX = null;
}

function start() {
  reset();
  state = "playing";
  canvas.focus();
}

function spawn() {
  const bomb = score >= 5 && Math.random() < 0.2;
  items.push({ x: 24 + Math.random() * (W - 48), y: -20, bomb, spin: Math.random() * 6 });
}

function update(dt) {
  clock += dt;
  // Move the basket: keys push it; mouse/touch pull it toward the pointer.
  const speed = 460;
  if (keys.has("left")) basket.x -= speed * dt;
  if (keys.has("right")) basket.x += speed * dt;
  if (targetX !== null && !keys.size) basket.x += (targetX - basket.x) * Math.min(1, dt * 14);
  basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));

  // Things fall faster and more often as the score climbs.
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawn();
    spawnIn = Math.max(0.32, 1.05 - score * 0.02);
  }
  const fall = 130 + score * 6;

  items = items.filter((it) => {
    it.y += fall * dt;
    it.spin += dt * 3;
    const caught = it.y >= BASKET_Y - 18 && it.y <= BASKET_Y + 10 && Math.abs(it.x - basket.x) < basket.w / 2 + 6;
    if (caught) {
      if (it.bomb) lives -= 1; else score += 1;
      return false;
    }
    if (it.y > H + 20) {
      if (!it.bomb) lives -= 1;
      return false;
    }
    return true;
  });

  if (lives <= 0) {
    state = "over";
    if (score > best) {
      best = score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* not saved, that's fine */ }
    }
  }
}

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function emoji(char, x, y, size, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, 0, 0);
  ctx.restore();
}

function text(str, x, y, size, color, weight = 600) {
  ctx.font = `${weight} ${size}px Rubik, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

function draw() {
  const bg = css("--bg-card"), textColor = css("--text"), dim = css("--text-dim"), orange = css("--orange");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = css("--border");
  ctx.fillRect(0, H - 14, W, 2);

  if (state === "ready") {
    emoji("🍋", W / 2, 110, 64, Math.sin(performance.now() / 400) * 0.3);
    text("Lemon Drop", W / 2, 185, 34, textColor, 800);
    text("Catch the lemons, dodge the bombs.", W / 2, 225, 17, dim, 400);
    text("Press Space or tap to play", W / 2, 265, 18, orange);
    return;
  }

  items.forEach((it) => emoji(it.bomb ? "💣" : "🍋", it.x, it.y, 34, it.bomb ? 0 : Math.sin(it.spin) * 0.4));
  emoji("🧺", basket.x, BASKET_Y, 52);

  text("🍋 " + score, 44, 24, 18, textColor);
  text("❤️".repeat(Math.max(0, lives)), W - 60, 24, 16, textColor);
  text("Best " + Math.max(best, score), W / 2, 24, 15, dim, 400);

  if (state === "over") {
    ctx.fillStyle = bg + "e6";
    ctx.fillRect(0, 0, W, H);
    text("Squeezed!", W / 2, 130, 38, textColor, 800);
    text(`You caught ${score} lemon${score === 1 ? "" : "s"}.` + (score > 0 && score >= best ? " New best!" : ""), W / 2, 180, 18, dim, 400);
    text("Press Space or tap to play again", W / 2, 230, 18, orange);
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  if (state === "playing") update(dt);
  draw();
  requestAnimationFrame(frame);
}

// --- Controls ---------------------------------------------------------------
const KEYMAP = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };

canvas.addEventListener("keydown", (e) => {
  if (KEYMAP[e.key]) {
    keys.add(KEYMAP[e.key]);
    targetX = null; // keys take over from the mouse until it moves again
    e.preventDefault();
  } else if (e.key === " " || e.key === "Enter") {
    if (state !== "playing") start();
    e.preventDefault();
  }
});
canvas.addEventListener("keyup", (e) => { if (KEYMAP[e.key]) keys.delete(KEYMAP[e.key]); });
canvas.addEventListener("blur", () => keys.clear());

function pointerX(e) {
  const rect = canvas.getBoundingClientRect();
  return (e.clientX - rect.left) / scale;
}
canvas.addEventListener("pointermove", (e) => { if (state === "playing") targetX = pointerX(e); });
canvas.addEventListener("pointerdown", (e) => {
  if (state !== "playing") start();
  targetX = pointerX(e);
});

reset();
resize();
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
