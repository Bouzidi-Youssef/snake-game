# Renderer — `renderer.js`

## Overview

`renderer.js` is the only module that touches the DOM during gameplay. It is driven entirely by state changes — every call to `setState`/`updateState` in `game.js` triggers `notify()`, which calls `render(container, state)`.

The renderer distinguishes between two rendering paths:

- **Full rebuild** — for menu, level select, and first-time game board construction.
- **Incremental update** — for every subsequent game tick while the board is visible.

---

## Scale Helpers

```js
const NATIVE_W       = 596;
const NATIVE_H       = 428;
const HUD_H          = 50;
const NATIVE_TOTAL_H = NATIVE_H + HUD_H;
const VIEWPORT_PAD   = 12;

function computeScale() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const availW = vw - VIEWPORT_PAD * 2;
  const availH = vh - VIEWPORT_PAD * 2;
  const scale  = Math.min(1, availW / NATIVE_W, availH / NATIVE_TOTAL_H);
  const visualH = NATIVE_TOTAL_H * scale;
  const marginV = ((NATIVE_TOTAL_H - visualH) / 2) * -1;
  return { scale, marginV };
}
```

See `02-entry-point.md` for a full explanation of the scaling and negative margin approach. `applyScale(el)` writes both `--scale` and `--scale-margin-v` onto `:root` and the element directly, then a `window resize` listener re-applies on every viewport change.

---

## `render(container, state)` — Entry Point

```js
export function render(container, state) {
  if (state.screen === SCREENS.GAME) {
    const board = container.querySelector('.game-board');
    if (board) {
      updateBoard(board, container, state);   // incremental
      return;
    }
    // First time: build the full board
    container.innerHTML = "";
    buildGameBoard(container, wrapper, state);
    return;
  }

  // Non-game screens: full rebuild
  container.innerHTML = "";
  // ... renderMenu / renderLevelSelect / renderGameOver
}
```

The check `container.querySelector('.game-board')` is the key branching point. If the board element already exists in the DOM (i.e., the game is already running), only `updateBoard` is called. Otherwise the full DOM structure is built from scratch.

---

## Full Rebuild Functions

### `renderMenu(wrapper, state)`

Injects the title, PLAY button, and STAGE button. Attaches click listeners:
- **PLAY** → `updateState({ screen: SCREENS.LEVEL_SELECT })`
- **STAGE** → loads the current stage progress and calls `loadStage` + `startLoop`

### `renderLevelSelect(wrapper, state)`

Renders one button per entry in `DIFFICULTIES`. Clicking a difficulty button calls `resetGame(difficulty)` + `startLoop()`. The BACK button sets `screen: SCREENS.MENU`.

### `buildGameBoard(container, wrapper, state)` — Initial Board

Creates the complete DOM structure for a new game session:

```
.game-screen
  └── .snake-game-container
        └── .game-board
              ├── .snake-segment  (×n)
              ├── .game-food
              ├── .game-wall      (×n, Stage mode only)
              └── .pause-overlay / .stage-complete-overlay (if applicable)
  └── .game-hud-strip
```

Walls are rendered once here and never touched again during gameplay — they don't move, so there is no need to update them on every tick.

---

## Incremental Update — `updateBoard(board, container, state)`

Called on every state change while the game is active. Updates only what has changed.

### Snake Segments

```js
const segments = board.querySelectorAll('.snake-segment');

// Update positions of existing segments
state.snake.forEach((segment, i) => {
  if (segments[i]) {
    segments[i].style.left = `${segment.x * CELL}px`;
    segments[i].style.top  = `${segment.y * CELL}px`;
  }
});

// Remove excess DOM nodes (when snake shrinks — not currently possible, but safe)
while (board.querySelectorAll('.snake-segment').length > state.snake.length) { ... }

// Add new segments (when snake grows)
const curCount = board.querySelectorAll('.snake-segment').length;
for (let i = curCount; i < state.snake.length; i++) { /* create and append */ }
```

Absolute-positioned `div` elements are repositioned by changing `left` and `top` inline styles. This is cheaper than destroying and recreating elements on every tick.

### Food

```js
const oldFood  = board.querySelector('.game-food');
const newLeft  = `${state.food.x * CELL}px`;
const newTop   = `${state.food.y * CELL}px`;

if (!oldFood || oldFood.style.left !== newLeft || oldFood.style.top !== newTop) {
  if (oldFood) oldFood.remove();
  const foodEl = document.createElement("div");
  foodEl.className = "game-food";
  foodEl.style.left = newLeft;
  foodEl.style.top  = newTop;
  board.appendChild(foodEl);
}
```

Food is **removed and re-created** (rather than repositioned) whenever its coordinates change. This is intentional: the CSS `animation: appear 200ms` keyframe only triggers on element insertion. Re-creating the element replays the animation so each new food item pops in visually.

### Overlays

Each overlay type (pause, game-over, stage-complete) follows the same idempotent pattern:

```js
const overlay = board.querySelector('.pause-overlay');

if (state.status === GAME_STATUS.PAUSED && !overlay) {
  // Create and append overlay
} else if (state.status !== GAME_STATUS.PAUSED && overlay) {
  overlay.remove();
}
```

This ensures overlays are only created when they first become relevant and removed when they're no longer needed. Buttons inside the game-over overlay have their own listeners for retry / menu actions.

### HUD

```js
const hud = container.querySelector('.game-hud-strip');
if (hud) {
  hud.innerHTML = state.mode === MODES.STAGE
    ? `<span class="hud-score">${state.score}</span>
       <span>Stage ${state.stageIndex + 1}/${stages.length}</span>`
    : `<span class="hud-score">${state.score}</span>
       <span>${diffLabel.toUpperCase()}<span class="hud-highscore">
         ${state.highScore[state.difficulty] || 0}
       </span></span>`;
}
```

`innerHTML` is used here because the HUD content is small and fully controlled — no user input is injected into it, so there is no XSS risk.
