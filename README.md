# Retro Bomber 💣💥

> **A tiny retro bomber — fast arcade action with pixel vibes, handcrafted by Tharindu.**

---

## 🎮 Live demo

Drop the project files in a static host or open `index.html` in your browser. For best results publish the repo to **GitHub Pages** (instructions below).

---

## ✨ Highlights

* Retro arcade feel: pixel-smooth animations, simple controls, neon HUD.
* Mobile-friendly: on-screen D-pad + bomb button (touchstart optimized).
* Tight, addictive gameplay: plant bombs, avoid explosions, survive waves of enemies.
* Lightweight: single `index.html`, `style.css`, `game.js` — no build step.

---

## 🕹️ Controls

**Keyboard (PC)**

* Move: Arrow keys or W/A/S/D
* Place bomb: Space
* Restart when game over: `R` (or `Alt + R` shown in overlay)

**Mobile (Touch)**

* Use the on-screen D-pad: ⬆️ ⬅️ ⬇️ ➡️
* Bomb button: 💣
* Touch hold repeats movement (tuned step interval for a tight feel)

---

## 🧩 Files in this project

```
index.html    ← game page + mobile controls
style.css     ← styling and responsive tweaks
game.js       ← full game logic: player, bombs, enemies, render loop
assets/       ← (optional) place player/enemy GIFs, sounds, icons here
```

---

## 🧠 About the game (short pitch)

**Retro Bomber** is a small arcade game inspired by classic bomber-style levels. You (the Player) must place bombs, break blocks, and outsmart enemies while keeping your lives. Fast rounds, clear objectives, and an ever-increasing challenge make it easy to learn and hard to put down.

---

## 🧑‍🚀 Player — "Bomber Kid" (Character Description)

**File (suggested):** `assets/player.gif`
**Personality & Motivation:** Bomber Kid is a plucky, determined sprite who tosses bombs to clear a maze of obstacles and stop the creeping enemy waves. He’s quick on his feet, fearless, and always chasing a higher score.
**Why bombs?** The bombs are tools to clear blocked paths and defeat enemies — but they’re also risky: timing and placement matter.
**Behavior (in-game):**

* Grid-based movement (`gx, gy`) — player moves one tile at a time.
* Can place multiple bombs (limited by `maxBombs`).
* Bombs have a set `range` and detonate after a short fuse.

> *Tip:* Player movement is intentionally tile-based for that retro feel — mobile touch handling mirrors keyboard steps for consistent gameplay.

---

## 👾 Enemies — "Bit Fiends" (Description)

**File (suggested):** `assets/enemy.gif`
**Motivation:** Enemies roam the map hunting the player and defending their territory. They try to collide with the player to steal lives.
**Behavior (in-game):**

* Simple path / tile movement that follows the same grid as the player.
* AI can be randomized or follow naive chase behavior depending on difficulty.
* Contact with an enemy costs player lives — bombs can eliminate enemies when explosions overlap them.

---

## 🧩 Gameplay loop & mechanics

1. Player moves across a grid of tiles, places bombs to break blocks and defeat enemies.
2. Bombs explode after a fuse and propagate in four directions up to the current `range` (stopped by solid walls).
3. Survive enemy waves, collect points for kills, and preserve lives.
4. When lives reach 0 (or win condition triggers), the overlay displays **GAME OVER** / **YOU WIN** and the game freezes until restart.

**Freeze behavior (implemented):**

* A global `gameOver` flag is used to halt game updates and the animation loop.
* All repeating timers (e.g., mobile `moveInterval`) are cleared when freezing to prevent inputs from continuing.

---

## ⚙️ How to run locally

1. Clone or copy the repo to your local machine.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
3. (Optional) Host via simple HTTP server for better mobile testing:

   * Python 3: `python -m http.server 8000` then visit `http://localhost:8000`

---

## 🚀 Deploy to GitHub Pages (quick)

1. Create a new GitHub repository and push your project files.
2. In the repo settings, go to **Pages** → source: `main` branch → root (`/`).
3. Save. GitHub will publish at `https://<your-username>.github.io/<repo-name>/`.

---

## 🛠️ Developer notes & suggestions

* Keep the tile system consistent: player uses `gx,gy` and `tx,ty` (target px) for smooth steps.
* Mobile controls: touch listeners use `touchstart` with `{ passive: false }` and `e.preventDefault()` to stop page scroll while holding directions.
* Freezing: set `gameOver = true`, call `stopMoving()` and `cancelAnimationFrame(rafId)` to truly pause the game.
* Tweak `moveInterval` (default \~140ms) to change mobile repeat speed.

---

## 🎨 Assets suggestions

* `assets/player.gif` — small looping GIF (32×32 or 48×48) for README preview and demo.
* `assets/enemy.gif` — small enemy GIF.
* `bomb.png` — favicon already in the project.

Include 1–2 320×180 screenshots or animated GIFs in `/assets/screenshots/` for the repo’s visual appeal.

---

## 📢 Promotional blurb (use for GitHub repo description)

**Retro Bomber — Tiny arcade bomber with pixel vibes.** Plant bombs, outsmart waves of enemies, and chase the high score. Mobile-ready controls & lightweight code — perfect for quick demos and game jam entries. 💣✨

---

## ✅ License

MIT — feel free to reuse and remix. Add a `LICENSE` file with the standard MIT text.

---

## 🤝 Contribute / Contact

Want features or a bug fixed? Open an issue or a PR.
For faster response: message **Tharindu** (project author) or add contact in `package` of your repo.

---

Made with ❤️ by **Tharindu** — Retro games for quick smiles and high scores.

