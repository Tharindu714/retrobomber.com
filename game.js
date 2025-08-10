// game.js - Full updated Retro Bomber
// Features implemented per your requests:
// - enemies shoot and reduce 1 life
// - crates (destructible) give 10 points when destroyed
// - enemies give 100 points when killed
// - enemy count = 5, smarter (BFS path) AI
// - shooting sound and life-decrease sound
// - bomb wave: player can place up to 3 bombs, wave recharges after all bombs explode
// - optional sprites in /assets/ (player.gif, enemy.gif, crate.png, heart.png)

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const heartsEl = document.getElementById("hearts");
const bombsAvailableEl = document.getElementById("bombs-available");
const bombsMaxEl = document.getElementById("bombs-max");
const bombRangeEl = document.getElementById("bomb-range");
const overlay = document.getElementById("overlay");

// Grid
const COLS = 13,
  ROWS = 11,
  TILE = 48;
const LOGICAL_WIDTH = COLS * TILE,
  LOGICAL_HEIGHT = ROWS * TILE;

// Map codes: 0 empty, 1 indestructible, 2 destructible
const map = [];
for (let r = 0; r < ROWS; r++) {
  map[r] = [];
  for (let c = 0; c < COLS; c++) {
    if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) map[r][c] = 1;
    else if (r % 2 === 0 && c % 2 === 0) map[r][c] = 1;
    else if ((r > 1 || c > 1) && Math.random() < 0.28) map[r][c] = 2;
    else map[r][c] = 0;
  }
}
map[1][1] = 0;
map[1][2] = 0;
map[2][1] = 0;

// Player
const playerStart = { gx: 1, gy: 1 };
const player = {
  gx: playerStart.gx,
  gy: playerStart.gy,
  x: playerStart.gx * TILE,
  y: playerStart.gy * TILE,
  size: TILE * 0.9,
  speed: 220,
  moving: false,
  tx: playerStart.gx * TILE,
  ty: playerStart.gy * TILE,
  lives: 7,
  score: 0,
  bombRange: 2,
  maxBombs: 3,
};

// Bombs/Explosions
let bombs = []; // {gx,gy,timer,range}
let explosions = []; // {cells, timer}
let bombsPlacedSinceWave = 0; // track wave
let bombWaveActive = false;
const BOMB_FUSE = 2.0,
  EXPLOSION_DURATION = 0.45;

// Enemies & bullets
const ENEMY_COUNT = 5;
const enemies = []; // {gx,gy,x,y,tx,ty,speed,moving,mode,moveTimer,shootTimer}
const bullets = []; // {x,y,vx,vy,ttl,owner}

// Assets (optional)
const assets = { player: null, enemy: null, crate: null, heart: null };
(function loadAssets() {
  const p = new Image();
  p.src = "assets/player.gif";
  p.onload = () => (assets.player = p);
  p.onerror = () => (assets.player = null);
  const e = new Image();
  e.src = "assets/enemy.gif";
  e.onload = () => (assets.enemy = e);
  e.onerror = () => (assets.enemy = null);
  const c = new Image();
  c.src = "assets/crate.png";
  c.onload = () => (assets.crate = c);
  c.onerror = () => (assets.crate = null);
  const h = new Image();
  h.src = "assets/heart.png";
  h.onload = () => (assets.heart = h);
  h.onerror = () => (assets.heart = null);
})();

// spawn enemies
function spawnEnemies(n) {
  let tries = 0;
  while (enemies.length < n && tries < 2000) {
    tries++;
    const gx = 2 + Math.floor(Math.random() * (COLS - 4));
    const gy = 2 + Math.floor(Math.random() * (ROWS - 4));
    if (map[gy][gx] === 0 && !(gx === player.gx && gy === player.gy)) {
      if (Math.hypot(gx - playerStart.gx, gy - playerStart.gy) < 3) continue;
      enemies.push({
        gx,
        gy,
        x: gx * TILE,
        y: gy * TILE,
        tx: gx * TILE,
        ty: gy * TILE,
        speed: 110 + Math.random() * 60,
        moving: false,
        mode: "wander",
        moveTimer: Math.random() * 0.7,
        shootTimer: 0.6 + Math.random() * 1.4,
      });
    }
  }
}
spawnEnemies(ENEMY_COUNT);

// ---------- Replace old touch/moveInterval + pixel-movePlayer area with this ----------

let moveInterval = null;
let moveDirection = { dx: 0, dy: 0 };

function touchMoveStep(dx, dy) {
  // attempt one grid step like keyboard logic (if not already moving)
  if (!player.moving) {
    const nx = player.gx + dx;
    const ny = player.gy + dy;
    if (canMoveTo(nx, ny)) {
      player.gx = nx;
      player.gy = ny;
      player.tx = nx * TILE;
      player.ty = ny * TILE;
      player.moving = true;
    }
  }
}

function startMoving(dx, dy) {
  moveDirection = { dx, dy };
  // immediate first move, then repeat while touch held
  touchMoveStep(dx, dy);
  if (moveInterval === null) {
    // grid-step interval (feel free to tune delay; 120-180ms works well)
    moveInterval = setInterval(() => {
      touchMoveStep(moveDirection.dx, moveDirection.dy);
    }, 140);
  }
}

function stopMoving() {
  if (moveInterval !== null) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
}

// Input
const keys = {};
let lastSpaceDown = false;

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  // Prevent default scrolling on arrow keys & space
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
  ) {
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
  if (e.key === " ") lastSpaceDown = false;
});

document.getElementById("btn-up").addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startMoving(0, -1);
  },
  { passive: false }
);
document.getElementById("btn-up").addEventListener("touchend", stopMoving);
document.getElementById("btn-up").addEventListener("touchcancel", stopMoving);

document.getElementById("btn-down").addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startMoving(0, 1);
  },
  { passive: false }
);
document.getElementById("btn-down").addEventListener("touchend", stopMoving);
document.getElementById("btn-down").addEventListener("touchcancel", stopMoving);

document.getElementById("btn-left").addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startMoving(-1, 0);
  },
  { passive: false }
);
document.getElementById("btn-left").addEventListener("touchend", stopMoving);
document.getElementById("btn-left").addEventListener("touchcancel", stopMoving);

document.getElementById("btn-right").addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    startMoving(1, 0);
  },
  { passive: false }
);
document.getElementById("btn-right").addEventListener("touchend", stopMoving);
document
  .getElementById("btn-right")
  .addEventListener("touchcancel", stopMoving);

// Bomb button stays the same (single tap)
document.getElementById("btn-bomb").addEventListener("touchstart", placeBomb);

// Audio (resume on first gesture)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioResumed = false;
function resumeAudioOnGesture() {
  if (audioResumed) return;
  if (audioCtx.state === "suspended")
    audioCtx.resume().then(() => (audioResumed = true));
  else audioResumed = true;
  window.removeEventListener("mousedown", resumeAudioOnGesture);
  window.removeEventListener("touchstart", resumeAudioOnGesture);
  window.removeEventListener("keydown", resumeAudioOnGesture);
}
window.addEventListener("mousedown", resumeAudioOnGesture);
window.addEventListener("touchstart", resumeAudioOnGesture, { passive: true });
window.addEventListener("keydown", resumeAudioOnGesture);

function playBeep(freq, duration = 0.06, volume = 0.06, type = "square") {
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.stop(now + duration + 0.02);
  } catch (e) {}
}
function playShoot() {
  playBeep(1200, 0.06, 0.06, "sine");
}
function playExplosion() {
  playBeep(140, 0.18, 0.12, "triangle");
}
function playLifeLost() {
  playBeep(160, 0.12, 0.12, "sawtooth");
}

// Resize
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.round(rect.width * dpr),
    h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Helpers
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function canMoveTo(gx, gy) {
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
  if (map[gy][gx] !== 0) return false;
  for (const b of bombs) if (b.gx === gx && b.gy === gy) return false;
  for (const e of enemies) if (e.gx === gx && e.gy === gy) return false;
  return true;
}
function worldToPixel(gx, gy) {
  return { x: gx * TILE, y: gy * TILE };
}

// HUD
function updateHUD() {
  scoreEl.textContent = String(player.score);
  heartsEl.innerHTML = "";
  if (assets.heart) {
    for (let i = 0; i < player.lives; i++) {
      const img = document.createElement("img");
      img.src = "assets/heart.png";
      img.className = "heart-img";
      heartsEl.appendChild(img);
    }
  } else {
    for (let i = 0; i < player.lives; i++) {
      const el = document.createElement("div");
      el.className = "heart-fallback";
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.background = "linear-gradient(180deg,#ff6b6b,#ff3b3b)";
      el.style.borderRadius = "4px";
      heartsEl.appendChild(el);
    }
  }
  bombsAvailableEl.textContent = String(
    Math.max(0, player.maxBombs - bombsPlacedSinceWave)
  );
  bombsMaxEl.textContent = String(player.maxBombs);
  bombRangeEl.textContent = String(player.bombRange);
}

// Bombs
function placeBomb() {
  resumeAudioOnGesture();
  if (bombWaveActive) return;
  if (bombsPlacedSinceWave >= player.maxBombs) return;
  if (bombs.some((b) => b.gx === player.gx && b.gy === player.gy)) return;
  if (map[player.gy][player.gx] !== 0) return;
  bombs.push({
    gx: player.gx,
    gy: player.gy,
    timer: BOMB_FUSE,
    range: player.bombRange,
  });
  bombsPlacedSinceWave++;
  playBeep(220, 0.08, 0.05);
  if (bombsPlacedSinceWave >= player.maxBombs) bombWaveActive = true;
}

function computeExplosionCells(bomb) {
  const cells = [{ gx: bomb.gx, gy: bomb.gy }];
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  for (const d of dirs) {
    for (let i = 1; i <= bomb.range; i++) {
      const nx = bomb.gx + d.dx * i,
        ny = bomb.gy + d.dy * i;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;
      if (map[ny][nx] === 1) break;
      cells.push({ gx: nx, gy: ny });
      if (map[ny][nx] === 2) break;
    }
  }
  return cells;
}

// Bullets and shooting
function enemyShoot(e) {
  const dx = player.gx - e.gx,
    dy = player.gy - e.gy;
  let vx = 0,
    vy = 0;
  if (Math.abs(dx) > Math.abs(dy)) vx = Math.sign(dx);
  else vy = Math.sign(dy);
  const bx = e.gx * TILE + TILE / 2,
    by = e.gy * TILE + TILE / 2,
    speed = 320;
  bullets.push({
    x: bx,
    y: by,
    vx: vx * speed,
    vy: vy * speed,
    ttl: 2.5,
    owner: "enemy",
  });
  playShoot();
}
function bulletHitsPlayer(b) {
  const px = player.gx * TILE + TILE / 2,
    py = player.gy * TILE + TILE / 2;
  return Math.hypot(b.x - px, b.y - py) < TILE * 0.42;
}

function enemyDieAt(gx, gy) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].gx === gx && enemies[i].gy === gy) {
      enemies.splice(i, 1);
      player.score += 100;
      playBeep(900, 0.1, 0.07);
    }
  }
}

// Reset
function resetGame() {
  player.lives = 7;
  player.score = 0;
  player.bombRange = 2;
  player.maxBombs = 3;
  bombs = [];
  explosions = [];
  enemies.length = 0;
  bullets.length = 0;
  spawnEnemies(ENEMY_COUNT);
  overlay.classList.add("hidden");
  player.gx = playerStart.gx;
  player.gy = playerStart.gy;
  player.x = player.gx * TILE;
  player.y = player.gy * TILE;
  bombsPlacedSinceWave = 0;
  bombWaveActive = false;
  gameOver = false;
  last = performance.now(); // reset timing so dt doesn't spike
  if (!rafId) rafId = requestAnimationFrame(loop);
}

// Spawn helper
function spawnEnemies(n) {
  let tries = 0;
  while (enemies.length < n && tries < 2000) {
    tries++;
    const gx = 2 + Math.floor(Math.random() * (COLS - 4));
    const gy = 2 + Math.floor(Math.random() * (ROWS - 4));
    if (map[gy][gx] === 0 && !(gx === player.gx && gy === player.gy)) {
      if (Math.hypot(gx - playerStart.gx, gy - playerStart.gy) < 3) continue;
      enemies.push({
        gx,
        gy,
        x: gx * TILE,
        y: gy * TILE,
        tx: gx * TILE,
        ty: gy * TILE,
        speed: 110 + Math.random() * 60,
        moving: false,
        mode: "wander",
        moveTimer: Math.random() * 0.7,
        shootTimer: 0.6 + Math.random() * 1.4,
      });
    }
  }
}

spawnEnemies(ENEMY_COUNT);

// Pathfinding (BFS) to plan next step
function bfsNextStep(sx, sy, tx, ty) {
  // quick guard: if start === target, there's no "next step"
  if (sx === tx && sy === ty) return null;

  const q = [];
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const parent = {};
  q.push({ x: sx, y: sy });
  vis[sy][sx] = true;
  let found = false;

  while (q.length) {
    const cur = q.shift();
    if (cur.x === tx && cur.y === ty) {
      found = true;
      break;
    }
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    for (const d of dirs) {
      const nx = cur.x + d.dx,
        ny = cur.y + d.dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
      if (vis[ny][nx]) continue;
      if (map[ny][nx] !== 0) continue;
      vis[ny][nx] = true;
      parent[`${nx},${ny}`] = `${cur.x},${cur.y}`;
      q.push({ x: nx, y: ny });
    }
  }

  if (!found) return null;

  // reconstruct path — this is safe now because start !== target
  let curKey = `${tx},${ty}`;
  const path = [];
  while (curKey !== `${sx},${sy}`) {
    path.push(curKey);
    curKey = parent[curKey];
    if (!curKey) return null; // no path
  }
  // path contains at least one cell now, last is the first step from start
  const last = path[path.length - 1];
  const [nx, ny] = last.split(",").map(Number);
  return { nx, ny };
}

// Enemy movement helper
function tryMoveEnemy(e, nx, ny) {
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
  if (map[ny][nx] !== 0) return false;
  for (const o of enemies)
    if (o !== e && o.gx === nx && o.gy === ny) return false;

  // if enemy moves into player's tile, damage player immediately:
  if (nx === player.gx && ny === player.gy) {
    player.lives--;
    playLifeLost();
    // respawn player
    player.gx = playerStart.gx;
    player.gy = playerStart.gy;
    player.tx = player.gx * TILE;
    player.ty = player.gy * TILE;
    player.x = player.tx;
    player.y = player.ty;
    player.moving = false;
    // you may still let enemy occupy the tile (or not). For now we block the step:
    return false;
  }

  e.gx = nx;
  e.gy = ny;
  e.tx = nx * TILE;
  e.ty = ny * TILE;
  e.moving = true;
  return true;
}

// Shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Main loop
let last = performance.now();
let gameOver = false;   // <--- add this
let rafId = null;       // <--- and this
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  resizeCanvas();
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / LOGICAL_WIDTH;
  const scaleY = rect.height / LOGICAL_HEIGHT;
  ctx.save();
  ctx.scale(scaleX, scaleY);
  if (!gameOver) {
    try {
      update(dt);
    } catch (err) {
      console.error("Game update error:", err);
    }
  }
  draw();
  ctx.restore();
  updateHUD();
  if (!gameOver) {
    rafId = requestAnimationFrame(loop);
  }
}

// Update
function update(dt) {
  // place bomb
  if ((keys[" "] || keys["Spacebar"]) && !lastSpaceDown) {
    placeBomb();
    lastSpaceDown = true;
  }
if ((keys["r"] || keys["R"]) && gameOver) {
  resetGame();
}

  // player movement
  if (!player.moving) {
    let nx = player.gx,
      ny = player.gy;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) ny = player.gy - 1;
    else if (keys["ArrowDown"] || keys["s"] || keys["S"]) ny = player.gy + 1;
    else if (keys["ArrowLeft"] || keys["a"] || keys["A"]) nx = player.gx - 1;
    else if (keys["ArrowRight"] || keys["d"] || keys["D"]) nx = player.gx + 1;
    if ((nx !== player.gx || ny !== player.gy) && canMoveTo(nx, ny)) {
      player.gx = nx;
      player.gy = ny;
      player.tx = nx * TILE;
      player.ty = ny * TILE;
      player.moving = true;
    }
  }
  if (player.moving) {
    const dx = player.tx - player.x,
      dy = player.ty - player.y,
      dist = Math.hypot(dx, dy),
      step = player.speed * dt;
    if (dist <= step) {
      player.x = player.tx;
      player.y = player.ty;
      player.moving = false;
    } else {
      player.x += (dx / dist) * step;
      player.y += (dy / dist) * step;
    }
  }
  // bombs countdown
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.timer -= dt;
    if (b.timer <= 0) {
      bombs.splice(i, 1);
      const cells = computeExplosionCells(b);
      for (const c of cells) {
        if (map[c.gy][c.gx] === 2) {
          map[c.gy][c.gx] = 0;
          player.score += 10;
        }
      }
      explosions.push({ cells, timer: EXPLOSION_DURATION });
      for (const c of cells) enemyDieAt(c.gx, c.gy);
      playExplosion();
    }
  }
  // explosions update
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ex.timer -= dt;
    for (const c of ex.cells) {
      if (c.gx === player.gx && c.gy === player.gy) {
        player.lives--;
        playLifeLost();
        if (player.lives <= 0) {
          overlay.textContent = "GAME OVER — Refresh to Restart";
          overlay.classList.remove("hidden");
          gameOver = true;
          stopMoving();
          if (rafId) cancelAnimationFrame(rafId);
        }

        player.gx = playerStart.gx;
        player.gy = playerStart.gy;
        player.tx = player.gx * TILE;
        player.ty = player.gy * TILE;
        player.x = player.tx;
        player.y = player.ty;
        player.moving = false;
        break;
      }
    }
    if (ex.timer <= 0) explosions.splice(i, 1);
  }
  // reset bomb wave when everything cleared
  if (bombWaveActive && bombs.length === 0 && explosions.length === 0) {
    bombWaveActive = false;
    bombsPlacedSinceWave = 0;
  }
  // bullets update
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bl = bullets[i];
    bl.ttl -= dt;
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    const tgx = Math.floor(bl.x / TILE),
      tgy = Math.floor(bl.y / TILE);
    if (tgx < 0 || tgx >= COLS || tgy < 0 || tgy >= ROWS) {
      bullets.splice(i, 1);
      continue;
    }
    if (map[tgy][tgx] === 1) {
      bullets.splice(i, 1);
      continue;
    }
    if (bl.owner === "enemy" && bulletHitsPlayer(bl)) {
      bullets.splice(i, 1);
      player.lives--;
      playLifeLost();
      if (player.lives <= 0) {
        overlay.textContent = "GAME OVER — Refresh to Restart";
        overlay.classList.remove("hidden");
      }
      player.gx = playerStart.gx;
      player.gy = playerStart.gy;
      player.tx = player.gx * TILE;
      player.ty = player.gy * TILE;
      player.x = player.tx;
      player.y = player.ty;
      player.moving = false;
      continue;
    }
    if (bl.ttl <= 0) bullets.splice(i, 1);
  }
  // enemies update
  for (const e of enemies) {
    if (e.moving) {
      const dx = e.tx - e.x,
        dy = e.ty - e.y,
        dist = Math.hypot(dx, dy),
        step = e.speed * dt;
      if (dist <= step) {
        e.x = e.tx;
        e.y = e.ty;
        e.moving = false;
      } else {
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      }
      continue;
    }
    const dTiles = Math.hypot(e.gx - player.gx, e.gy - player.gy);
    if (dTiles <= 6) e.mode = "chase";
    else e.mode = "wander";
    e.moveTimer -= dt;
    e.shootTimer -= dt;
    if (e.mode === "chase") {
      const next = bfsNextStep(e.gx, e.gy, player.gx, player.gy);
      if (next) {
        if (canMoveTo(next.nx, next.ny)) tryMoveEnemy(e, next.nx, next.ny);
      }
      if (e.shootTimer <= 0) {
        e.shootTimer = 0.8 + Math.random() * 1.2;
        enemyShoot(e);
      }
    } else {
      if (e.moveTimer > 0) continue;
      e.moveTimer = 0.4 + Math.random() * 0.9;
      if (Math.random() < 0.12 && e.shootTimer <= 0) {
        e.shootTimer = 0.8 + Math.random() * 1.5;
        enemyShoot(e);
      }
      const dirs = shuffle([
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ]);
      let moved = false;
      for (const o of dirs) {
        if (tryMoveEnemy(e, e.gx + o.dx, e.gy + o.dy)) {
          moved = true;
          break;
        }
      }
      if (!moved) e.moveTimer = 0.2 + Math.random() * 0.6;
    }
  }
  // win
  if (enemies.length === 0 && player.lives > 0) {
    overlay.textContent = "YOU WIN! — Refresh to Play Again";
    overlay.classList.remove("hidden");
  }
}

// Draw
function draw() {
  ctx.fillStyle = "#0b0d0f";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.01)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  // tiles
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE,
        y = r * TILE;
      if (map[r][c] === 1) {
        ctx.fillStyle = "#1f2933";
        roundRect(ctx, x + 4, y + 4, TILE - 8, TILE - 8, 6, true, false);
        ctx.strokeStyle = "rgba(255,255,255,0.02)";
        ctx.strokeRect(x + 6, y + 6, TILE - 12, TILE - 12);
      } else if (map[r][c] === 2) {
        if (assets.crate)
          ctx.drawImage(assets.crate, x + 6, y + 6, TILE - 12, TILE - 12);
        else {
          ctx.fillStyle = "#8b5e3c";
          roundRect(ctx, x + 6, y + 6, TILE - 12, TILE - 12, 4, true, false);
        }
      } else {
        ctx.fillStyle =
          (r + c) % 2 === 0 ? "rgba(255,255,255,0.006)" : "transparent";
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // bombs
  for (const b of bombs) {
    const px = b.gx * TILE + TILE / 2,
      py = b.gy * TILE + TILE / 2;
    ctx.beginPath();
    ctx.fillStyle = "#0e1012";
    ctx.arc(px, py, TILE * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#222";
    ctx.arc(px - 4, py - 4, TILE * 0.08, 0, Math.PI * 2);
    ctx.fill();
    const fuseProgress = Math.max(0, Math.min(1, b.timer / BOMB_FUSE));
    ctx.fillStyle = `rgba(255,200,40,${0.6 + 0.4 * (1 - fuseProgress)})`;
    ctx.fillRect(px - TILE * 0.08, py - TILE * 0.4, TILE * 0.16, TILE * 0.06);
  }
  // explosions
  for (const ex of explosions) {
    for (const c of ex.cells) {
      const wx = c.gx * TILE,
        wy = c.gy * TILE;
      const t = Math.max(0, Math.min(1, ex.timer / EXPLOSION_DURATION));
      const alpha = 0.9 * t;
      ctx.fillStyle = `rgba(255,120,40,${alpha})`;
      roundRect(ctx, wx + 6, wy + 6, TILE - 12, TILE - 12, 6, true, false);
    }
  }
  // bullets
  for (const bl of bullets) {
    ctx.fillStyle = "#ffd966";
    ctx.fillRect(bl.x - 4, bl.y - 4, 8, 8);
  }
  // enemies
  for (const e of enemies) {
    if (assets.enemy)
      ctx.drawImage(assets.enemy, e.x + 6, e.y + 6, TILE - 12, TILE - 12);
    else {
      const px = e.x + TILE * 0.05,
        py = e.y + TILE * 0.05;
      ctx.fillStyle = "rgba(255,90,90,0.08)";
      ctx.fillRect(px - 2, py - 2, TILE * 0.9 + 4, TILE * 0.9 + 4);
      ctx.fillStyle = "#ff6b6b";
      roundRect(ctx, px, py, TILE * 0.9, TILE * 0.9, 6, true, false);
    }
  }
  // player
  if (assets.player)
    ctx.drawImage(
      assets.player,
      player.x + 6,
      player.y + 6,
      TILE - 12,
      TILE - 12
    );
  else {
    const px = player.x + TILE * 0.05,
      py = player.y + TILE * 0.05,
      pSize = player.size;
    ctx.fillStyle = "rgba(0,212,255,0.06)";
    ctx.fillRect(px - 2, py - 2, pSize + 4, pSize + 4);
    ctx.fillStyle = "#00d4ff";
    roundRect(ctx, px, py, pSize, pSize, 6, true, false);
  }
}

// utils
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// start
requestAnimationFrame(function t(now) {
  last = now;
  requestAnimationFrame(loop);
});
