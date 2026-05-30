# Stages — `stage-loader.js` & Stage Configs

## `js/game/stage-loader.js`

Handles two concerns: parsing wall maps from ASCII strings, and persisting stage progress to `localStorage`.

### `parseWallMap(rows)`

```js
export function parseWallMap(rows) {
  const walls = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        walls.push({ x, y });
      }
    }
  });
  return walls;
}
```

Stage configs store walls as an array of strings — one string per row, 21 characters wide (matching `DEFAULTS.COLS`). Each `#` character becomes an `{x, y}` wall object. Any character other than `#` is treated as open space (`.` is used by convention for readability).

This approach makes stages human-readable and easy to design visually:

```
'#####################',  ← top border
'#...................#',  ← open interior
'#....####....####...#',  ← interior obstacle
```

### Progress Persistence

```js
const STORAGE_KEY = 'snake_stage_progress';

export function getStageProgress() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    const n   = parseInt(val, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveStageProgress(index) {
  try { localStorage.setItem(STORAGE_KEY, String(index)); } catch {}
}

export function clearStageProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
```

Progress is the **index of the next unlocked stage**. When stage 0 is completed, `saveStageProgress(1)` is called. When stage 2 (the last) is completed, `saveStageProgress(3)` is called — and `renderer.js` treats `index >= stages.length` as "all stages done, restart from 0."

All `localStorage` calls are wrapped in try/catch because `localStorage` can throw in private browsing modes or when storage is full.

---

## Stage Configuration Files

### `stages/index.js`

```js
import stage1 from './stage-1.js';
import stage2 from './stage-2.js';
import stage3 from './stage-3.js';

export const stages = [stage1, stage2, stage3];
```

A simple registry. Adding a new stage requires only creating the config file and adding it here.

### Stage Config Schema

Each stage file exports a plain object:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier |
| `label` | string | Display name |
| `tickRate` | number | ms per tick (lower = faster) |
| `wrapEdges` | boolean | Whether snake wraps at board edges |
| `foodTarget` | number | Foods to collect to complete the stage |
| `snakeStart` | `{x, y}` | Initial head position |
| `walls` | string[] | ASCII wall map (21 chars × 15 rows) |

### Stage 1 — Tutorial Meadow

```js
tickRate:   150,    // slowest speed
wrapEdges:  true,   // snake teleports at edges
foodTarget: 3,      // only 3 foods needed
```

The wall map is simply a border of `#` with an open interior. Combined with edge wrapping, this is the most forgiving stage — the snake wraps around without dying and only needs to collect 3 foods.

### Stage 2 — The Corridor

```js
tickRate:   110,    // medium speed
wrapEdges:  false,  // walls kill
foodTarget: 5,
```

Interior obstacle blocks create corridor patterns. Edge wrapping is disabled, raising the stakes. Row 7 (the middle) is an open corridor with no side walls — a deliberate gap that creates a risky shortcut.

### Stage 3 — Snake Pit

```js
tickRate:   80,     // Python speed (fastest)
wrapEdges:  false,
foodTarget: 4,
```

Dense interior obstacles in a cross pattern with narrow gaps. No edge wrapping. The combination of maximum speed and tight corridors makes this the hardest stage despite requiring only 4 foods.

---

# Styles — `style.css`

## CSS Custom Properties

```css
:root {
  --green-bg:    #9bba5a;   /* main background green */
  --green-dark:  #272f16;   /* dark green for text and snake */
  --cell:        28px;      /* size of one board cell */
  --cols:        21;
  --rows:        15;
  --board-w:     588px;     /* 21 × 28 */
  --board-h:     420px;     /* 15 × 28 */
  --container-w: 596px;     /* board + 4px border × 2 */
  --container-h: 428px;     /* board + 4px border × 2 */
}
```

The `--cell` variable is the single source of truth for grid sizing. All element positions in `renderer.js` are computed as `segment.x * CELL` (28 in JS) and applied as inline `left`/`top` styles, which match the CSS `--cell: 28px`.

## Board Vignette

```css
.snake-game-container::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 71% 60% at 50% 50%,
    #aacc66 0%,
    #aacc66 40%,
    #9bba5a 100%
  );
  pointer-events: none;
  z-index: 0;
}
```

A pseudo-element creates a radial vignette: lighter green at the centre of the board, darkening toward the edges. This adds depth without any images. `pointer-events: none` ensures it never blocks click or touch events.

All direct children of `.snake-game-container` are given `position: relative; z-index: 1` to sit above the vignette layer.

## Food Animations

```css
@keyframes appear {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 0.75; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.game-food {
  animation:
    appear 200ms cubic-bezier(0.5, 1, 0, 1.6),
    spin   3.5s  cubic-bezier(0.2, 0.6, 0.4, 1) 200ms;
}
```

Two chained animations: the food pops in with an overshoot bounce (`cubic-bezier(0.5, 1, 0, 1.6)` reaches `scale > 1` briefly), then slowly spins once. The spin starts 200 ms after insertion, after the pop completes.

The title screen food icons also use `spin` with `animation: spin 2s linear infinite`, providing ambient motion on the menu.

## Viewport Scaling

```css
.game-screen {
  transform-origin: center center;
  transform: scale(var(--scale, 1));
  margin-top:    var(--scale-margin-v, 0px);
  margin-bottom: var(--scale-margin-v, 0px);
}
```

`--scale` and `--scale-margin-v` are set by `scale-bootstrap.js` and `renderer.js`. The CSS fallback values (`1` and `0px`) ensure the layout is correct even if JS has not run yet.
