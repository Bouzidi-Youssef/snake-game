# State Management — `constants.js`, `state.js`, `game.js`

## `js/game/constants.js`

All magic values and string literals used across the codebase are centralised here as plain objects. No enums exist in JavaScript, so this pattern uses `Object.freeze`-like immutable-by-convention objects.

### Directions

```js
export const DIRECTIONS = {
  UP: "UP", DOWN: "DOWN", LEFT: "LEFT", RIGHT: "RIGHT"
};

export const OPPOSITE_DIRECTIONS = {
  UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT"
};
```

`OPPOSITE_DIRECTIONS` is a lookup table used by `movement.js` and `input.js` to prevent the snake reversing directly into itself. Given the current direction, the opposite is an O(1) property access instead of a switch statement.

### Game Status

```js
export const GAME_STATUS = {
  IDLE:           "idle",
  RUNNING:        "running",
  PAUSED:         "paused",
  GAMEOVER:       "gameover",
  STAGE_COMPLETE: "stage_complete",
};
```

The `status` field on the state object is always one of these values. Systems like `movement.js`, `collision.js`, and `food.js` guard their logic with `if (state.status !== "running") return;` so they only execute during active play.

### Screens

```js
export const SCREENS = {
  MENU:         "menu",
  LEVEL_SELECT: "level_select",
  GAME:         "game",
  GAMEOVER:     "gameover",
};
```

The `screen` field on the state object drives which top-level UI `renderer.js` renders. The game board is only shown when `screen === "game"`.

### Modes

```js
export const MODES = {
  CLASSIC: "classic",
  STAGE:   "stage",
};
```

Separates Classic (infinite, difficulty-based) from Stage (finite, wall-based) gameplay.

### Defaults & Difficulties

```js
export const DEFAULTS = {
  COLS:                21,
  ROWS:                15,
  TICK_RATE:           80,    // ms per tick (Python speed)
  INITIAL_SNAKE_LENGTH: 3,
};

export const DIFFICULTIES = {
  SLUG:   { TICK_RATE: 150, LABEL: "Slug"   },
  WORM:   { TICK_RATE: 110, LABEL: "Worm"   },
  PYTHON: { TICK_RATE:  80, LABEL: "Python" },
};
```

`TICK_RATE` is in milliseconds. A lower number means faster ticks — Python (80 ms) is three times faster than Slug (150 ms). Stage configs set their own tick rate independent of this table.

---

## `js/game/state.js`

```js
export const createInitialState = () => {
  return {
    screen:      SCREENS.MENU,
    status:      GAME_STATUS.IDLE,
    mode:        MODES.CLASSIC,
    stageIndex:  null,
    foodTarget:  null,
    world:       { wrapEdges: true, walls: [] },
    cols:        DEFAULTS.COLS,    // 21
    rows:        DEFAULTS.ROWS,    // 15
    tickRate:    DEFAULTS.TICK_RATE,
    direction:   DIRECTIONS.RIGHT,
    nextDirection: [DIRECTIONS.RIGHT],
    snake: [
      { x: 10, y: 10 },
      { x:  9, y: 10 },
      { x:  8, y: 10 },
    ],
    food:      { x: 5, y: 5 },
    score:     0,
    highScore: {},
    grow:      0,
    difficulty: null,
  };
};
```

`createInitialState` is a **factory function**, not a singleton. This is deliberate — calling it produces a fresh copy of the default state with no shared references between calls.

### Notable Fields

| Field | Type | Purpose |
|---|---|---|
| `screen` | string | Which UI screen is active |
| `status` | string | Running / paused / game-over / etc. |
| `mode` | string | Classic or Stage |
| `world.wrapEdges` | boolean | Whether the snake teleports at edges |
| `world.walls` | array | `{x, y}` objects for obstacle tiles |
| `nextDirection` | array | Queue of up to 4 buffered direction inputs |
| `grow` | number | Pending segments to add (incremented on eat, decremented on tick) |
| `highScore` | object | `{ [difficulty]: number }` — keyed by difficulty string or `null` for stages |
| `stageIndex` | number\|null | Which stage is active in Stage mode |
| `foodTarget` | number\|null | How many food items to collect to complete a stage |

### The `nextDirection` Queue

Rather than storing a single next direction, the state holds a queue. This allows the player to buffer up to 4 direction changes between ticks — important at high tick rates where two quick turns (e.g., right then down) could be missed if only the last keypress was kept.

---

## `js/game/game.js`

This is the **state store** — the single source of truth for all game data.

```js
let state = createInitialState();
let listeners = [];
```

The module-level `state` variable holds the current game state. `listeners` is an array of callback functions subscribed to state changes.

### API

#### `getState()`
Returns the current state object. All systems call this at the start of each operation.

```js
export const getState = () => state;
```

> The returned object is a direct reference, not a copy. Systems must treat it as read-only and never mutate it directly.

#### `setState(newState)`
Replaces the entire state and notifies all listeners.

```js
export const setState = (newState) => {
  state = newState;
  notify();
};
```

Used by systems that need to replace most of the state (movement, collision, food).

#### `updateState(partial)`
Shallow-merges a partial object into the current state and notifies.

```js
export const updateState = (partial) => {
  state = { ...state, ...partial };
  notify();
};
```

Used by the UI / renderer when only a single field needs changing (e.g., `screen`, `status`).

#### `resetGame(difficulty)`
Calls `createInitialState()`, then overrides specific fields to start a fresh Classic game while preserving the high score.

```js
export const resetGame = (difficulty) => {
  const prev = state;
  const tickRate = DIFFICULTIES[difficulty]?.TICK_RATE ?? DEFAULTS.TICK_RATE;
  state = {
    ...createInitialState(),
    screen:     SCREENS.GAME,
    status:     GAME_STATUS.RUNNING,
    highScore:  prev.highScore,   // carry over
    difficulty: difficulty || null,
    tickRate,
  };
  notify();
};
```

#### `loadStage(stageIndex, stageConfig)`
Similar to `resetGame` but configures a Stage-mode game. It parses the wall map, places the snake at the configured start position, then generates an initial food position that avoids walls and snake segments.

#### `subscribe(listener)`
Registers a listener function that is called with the new state after every mutation. Returns an unsubscribe function.

```js
export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
```

Only `main.js` calls `subscribe`, passing in `renderer.js`'s `render` function. Every state change therefore triggers a re-render automatically.

### Notification

```js
function notify() {
  listeners.forEach((listener) => listener(state));
}
```

Synchronous fan-out to all subscribers. There is currently only one subscriber (the renderer), so this is effectively a direct call.
