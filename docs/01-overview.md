# Snake Game — Project Overview

## What It Is

A browser-based Snake game built with vanilla JavaScript (ES modules), no frameworks, no bundler. The game runs entirely in the browser and is served as static files.

## Technology Stack

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES Modules) |
| Markup | HTML5 |
| Styling | CSS3 (custom properties, keyframe animations) |
| Build tool | None — native `<script type="module">` |
| Font | Custom `Equilibrium` webfont (woff2) |

## Project Structure

```
/
├── index.html                   Entry point
├── styles/
│   └── style.css                All styles — layout, board, HUD, overlays
├── assets/
│   ├── fonts/
│   │   └── equilibrium.woff2    Display font
│   └── images/
│       └── food.svg             Food icon (used in CSS & canvas)
├── js/
│   ├── main.js                  Bootstrap — wires everything together
│   ├── game/
│   │   ├── constants.js         Enum-like constants (directions, screens, etc.)
│   │   ├── state.js             Initial state factory
│   │   ├── game.js              State store (get / set / subscribe)
│   │   ├── loop.js              requestAnimationFrame game loop
│   │   └── stage-loader.js      Wall-map parser & localStorage progress
│   ├── systems/
│   │   ├── movement.js          Snake movement & direction queue
│   │   ├── collision.js         Collision detection & game-over trigger
│   │   ├── input.js             Keyboard event handler
│   │   └── touch.js             Touch/swipe event handler
│   ├── entities/
│   │   └── food.js              Food collision & respawn
│   └── ui/
│       ├── renderer.js          DOM renderer (menu, board, HUD, overlays)
│       └── scale-bootstrap.js   Pre-paint viewport scale (inline script)
└── stages/
    ├── index.js                 Stage registry
    ├── stage-1.js               Tutorial Meadow
    ├── stage-2.js               The Corridor
    └── stage-3.js               Snake Pit
```

## Two Game Modes

### Classic Mode
The player picks a difficulty (Slug / Worm / Python), which sets the tick rate. The snake wraps edges. No walls. No food target — play until you hit yourself.

### Stage Mode
Three hand-crafted stages with wall layouts, a food target, configurable edge-wrapping, and per-stage tick rates. Completion unlocks the next stage; progress is saved to `localStorage`.

## Data Flow at a Glance

```
User input (keyboard / touch)
        │
        ▼
   input.js / touch.js
        │  setState(nextDirection queue)
        ▼
   game.js (state store)
        │  notify listeners
        ▼
   renderer.js  ←────────────────────────────┐
                                              │
   loop.js  (rAF tick)                        │
        │                                     │
        ├── movement.js  (move snake)         │
        ├── food.js      (eat food)           │
        ├── collision.js (detect death)       │
        └── game.js setState ─────────────────┘
```

Every state mutation calls `setState` or `updateState`, which triggers `notify()`, which calls every subscribed listener. The only subscriber is `renderer.js`, so every state change automatically re-renders the relevant part of the DOM.

## Key Design Decisions

**No framework, no bundler.** The game relies on native ES module `import/export`. The browser resolves all module paths directly.

**Single mutable state object.** All game data lives in one plain JS object. Systems read it with `getState()` and write it with `setState()` / `updateState()`. This makes reasoning about state trivial.

**Incremental DOM updates.** On every game tick only the snake positions, food, and overlays are touched. The board wrapper and walls are never re-created during play, keeping performance smooth.

**CSS custom properties for layout.** `--cell`, `--cols`, `--rows`, `--board-w`, etc. are set on `:root`. The renderer and CSS share the same numbers without duplication.

**Pre-paint scaling.** `scale-bootstrap.js` runs synchronously before the first paint so the viewport scale is already correct before any JS loads.
