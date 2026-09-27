// Easter egg: the Konami code (up up down down left right left right B A).
// On phones: swipe up, up, down, down, left, right, left, right, then tap
// twice. Turns on "Lémön mode" until the page reloads: a chiptune fanfare, a
// banner, lemon-yellow accents, and a shower of lemons with simple physics
// that pile up and can be batted around with the pointer. Visitors who ask
// for reduced motion get the colours and banner without the lemon rain.
// Loaded by layout.js on every page.
import { el } from "./ui.js";

const CODE = "up up down down left right left right b a";
const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", b: "b", B: "b", a: "a", A: "a" };
const history = [];

function feed(step) {
  history.push(step);
  if (history.length > 10) history.shift();
  if (history.join(" ") === CODE) {
    history.length = 0;
    activate();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input, textarea, [contenteditable], #game")) return;
  if (KEYS[e.key]) feed(KEYS[e.key]);
});

// Swipes and taps for phones.
let touch = null;
document.addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY };
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!touch || e.target.closest("#game")) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) {
    feed(history[history.length - 1] === "b" ? "a" : "b"); // taps count as B, then A
  } else if (Math.abs(dx) > Math.abs(dy)) {
    feed(dx > 0 ? "right" : "left");
  } else {
    feed(dy > 0 ? "down" : "up"); // finger moving up = swipe up
  }
}, { passive: true });

console.log("%c🍋 Psst. ↑ ↑ ↓ ↓ ← → ← → B A", "font-size:14px;color:#ffd21f");

// --- Lémön mode -------------------------------------------------------------
function activate() {
  document.documentElement.classList.add("lemon-mode");
  const brand = document.querySelector(".nav-brand span");
  if (brand) brand.textContent = "Lémöns";
  fanfare();
  banner();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) lemonRain();
}

function fanfare() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]; // C E G C' G C'
    const lengths = [0.09, 0.09, 0.09, 0.16, 0.09, 0.45];
    let t = audio.currentTime + 0.02;
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + lengths[i]);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + lengths[i]);
      t += lengths[i] * 0.9;
    });
    setTimeout(() => audio.close(), 2000);
  } catch (err) { /* no sound, that's fine */ }
}

function banner() {
  document.querySelector(".lemon-banner")?.remove();
  const box = el("div", "lemon-banner",
    el("strong", null, "🍋 LÉMÖN MODE UNLOCKED 🍋"),
    el("span", null, "Home of the Lémöns."));
  box.setAttribute("role", "status");
  box.addEventListener("click", () => box.remove());
  document.body.append(box);
  setTimeout(() => box.classList.add("leaving"), 4500);
  setTimeout(() => box.remove(), 5200);
}

function lemonRain() {
  document.querySelector(".lemon-rain")?.remove();
  const canvas = el("canvas", "lemon-rain");
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  let W, H;
  const size = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener("resize", size);

  // Draw the lemon once, then stamp copies of it (much faster than text).
  const R = W < 600 ? 14 : 17;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = R * 2 * dpr * 1.4;
  const sctx = sprite.getContext("2d");
  sctx.scale(dpr, dpr);
  sctx.font = `${R * 2}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  sctx.textAlign = "center";
  sctx.textBaseline = "middle";
  sctx.fillText("🍋", R * 1.4, R * 1.4);

  const count = W < 600 ? 70 : 140;
  const lemons = Array.from({ length: count }, (_, i) => ({
    x: R + Math.random() * (W - 2 * R),
    y: -R - Math.random() * 200,
    vx: (Math.random() - 0.5) * 300,
    vy: Math.random() * 150,
    angle: Math.random() * 6.28,
    startAt: i * (2600 / count) // stagger over ~2.6 s
  }));

  let pointer = { x: -9999, y: -9999 };
  const onMove = (e) => { pointer = { x: e.clientX, y: e.clientY }; };
  window.addEventListener("pointermove", onMove);

  const GRAVITY = 1500, BOUNCE = 0.45, PUSH = 130, LIFE = 14000, FADE = 1500;
  const born = performance.now();
  let last = born;

  function physics(dt, now) {
    const live = lemons.filter((l) => now - born >= l.startAt);
    for (const l of live) {
      l.vy += GRAVITY * dt;
      const dx = l.x - pointer.x, dy = l.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < PUSH * PUSH && d2 > 1) {
        const d = Math.sqrt(d2), f = (1 - d / PUSH) * 5000 * dt;
        l.vx += (dx / d) * f;
        l.vy += (dy / d) * f;
      }
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.angle += (l.vx * dt) / R;
      if (l.y > H - R) { l.y = H - R; l.vy *= -BOUNCE; l.vx *= 0.92; }
      if (l.x < R) { l.x = R; l.vx = Math.abs(l.vx) * 0.6; }
      if (l.x > W - R) { l.x = W - R; l.vx = -Math.abs(l.vx) * 0.6; }
    }
    // Lemons push each other apart so they pile up instead of overlapping.
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = 2 * R;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, overlap = (min - d) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap;
        b.x += nx * overlap; b.y += ny * overlap;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn < 0) {
          const j2 = -(1 + BOUNCE) * vn / 2;
          a.vx -= j2 * nx; a.vy -= j2 * ny;
          b.vx += j2 * nx; b.vy += j2 * ny;
        }
      }
    }
    return live;
  }

  let stopped = false;
  const stop = () => {
    stopped = true;
    canvas.remove();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", size);
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape") stop(); };
  document.addEventListener("keydown", onKey);

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(1 / 30, (now - last) / 1000) / 2;
    last = now;
    physics(dt, now);
    const live = physics(dt, now); // two small steps per frame keep piles stable
    const age = now - born;
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = age > LIFE ? Math.max(0, 1 - (age - LIFE) / FADE) : 1;
    const s = R * 1.4;
    for (const l of live) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);
      ctx.drawImage(sprite, -s, -s, s * 2, s * 2);
      ctx.restore();
    }
    if (age > LIFE + FADE) stop(); else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
