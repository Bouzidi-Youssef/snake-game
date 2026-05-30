# Input Systems — `input.js` & `touch.js`

## `js/systems/input.js`

Handles all keyboard input. Registered once in `main.js` via `initInput()`.

### Key Mapping

```js
const keyMap = {
  ArrowUp:    DIRECTIONS.UP,
  ArrowDown:  DIRECTIONS.DOWN,
  ArrowLeft:  DIRECTIONS.LEFT,
  ArrowRight: DIRECTIONS.RIGHT,
  w: DIRECTIONS.UP,
  s: DIRECTIONS.DOWN,
  a: DIRECTIONS.LEFT,
  d: DIRECTIONS.RIGHT,
};
```

Both WASD and arrow keys are supported. The map is consulted after normalising letter keys to lowercase.

### `handleKeyDown(e)`

The handler runs on every `keydown` event document-wide. It is structured as a series of guarded early-returns:

#### 1. Spacebar — pause / resume / advance

```js
if (key === " " || key === "Spacebar") {
  if (state.screen === SCREENS.GAME) {
    e.preventDefault();
    if (state.status === GAME_STATUS.RUNNING)        → PAUSED
    else if (state.status === GAME_STATUS.PAUSED)    → RUNNING
    else if (state.status === GAME_STATUS.STAGE_COMPLETE) → click overlay
    else if (state.status === GAME_STATUS.GAMEOVER)  → click retry button
  }
  return;
}
```

When a stage is complete or the game is over, the handler finds the relevant overlay / button in the DOM and programmatically clicks it, so the keyboard mirrors the on-screen UI.

#### 2. Escape — navigate back

```js
if (key === "Escape") {
  if (state.screen === SCREENS.LEVEL_SELECT) → MENU
  else if (state.screen === SCREENS.GAME)    → MENU + stop loop
  return;
}
```

#### 3. Prevent scroll

```js
if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
  e.preventDefault();
}
```

Without this, arrow keys scroll the page, which creates a poor experience on keyboards.

#### 4. Ignore key-repeat

```js
if (e.repeat) return;
```

When a key is held down, the browser fires repeated `keydown` events after an initial delay. Repeated events are ignored — only genuine new keypresses contribute to the direction queue.

#### 5. Direction change

```js
const newDirection = keyMap[normalizedKey];
if (!newDirection) return;
if (state.status !== GAME_STATUS.RUNNING) return;

const lastDirection = state.nextDirection.length > 0
  ? state.nextDirection[state.nextDirection.length - 1]
  : state.direction;

if (newDirection === OPPOSITE_DIRECTIONS[lastDirection]) return;

const nextQueue = [...state.nextDirection, newDirection].slice(-4);
setState({ ...state, nextDirection: nextQueue });
```

The last buffered direction (not the currently executing direction) is checked for reversal. This allows queuing a turn sequence like RIGHT → DOWN without the DOWN being rejected because the snake is still moving RIGHT at queue-time.

The queue is capped at 4 entries with `.slice(-4)` to prevent the buffer filling up if the player hammers keys during a pause.

---

## `js/systems/touch.js`

Handles touch input for mobile and tablet players. Registered in `main.js` via `initTouch(appContainer)`.

### Constants

```js
const MIN_SWIPE  = 30;    // pixels — minimum distance to register as swipe
const TAP_TIMEOUT = 300;  // ms — maximum duration to register as tap
```

### Touch Tracking State

```js
let startX = 0, startY = 0, startTime = 0, tracking = false;
```

These are module-level variables (closure over the registered event listeners). `tracking` is used as a guard — it is set to `false` when the game is in an overlay state so that swipes on overlays don't accidentally steer the snake.

### Event Flow

```
touchstart → record start position + time, set tracking = true
touchmove  → prevent default scroll (if tracking)
touchend   → classify gesture (tap or swipe)
```

All three events call `e.preventDefault()` when appropriate to suppress native browser scroll and zoom behaviour on the game canvas.

### Gesture Classification

```js
const deltaX  = t.clientX - startX;
const deltaY  = t.clientY - startY;
const absDx   = Math.abs(deltaX);
const absDy   = Math.abs(deltaY);
const elapsed = Date.now() - startTime;

// Tap: small movement, short duration
if (absDx < MIN_SWIPE && absDy < MIN_SWIPE && elapsed < TAP_TIMEOUT) {
  // Toggle pause
  return;
}

// Too small but slow — ignore (accidental touch)
if (absDx < MIN_SWIPE && absDy < MIN_SWIPE) return;

// Swipe direction: dominant axis wins
if (absDx > absDy) {
  newDirection = deltaX > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
} else {
  newDirection = deltaY > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
}
```

The **dominant axis** rule means the gesture is always classified as purely horizontal or purely vertical, regardless of diagonal drag. This matches the player's intent — a slight diagonal swipe should turn the snake in the intended cardinal direction.

### Anti-Reversal Check

Identical to `input.js`:

```js
const lastDirection = state.nextDirection.length > 0
  ? state.nextDirection[state.nextDirection.length - 1]
  : state.direction;

if (newDirection === OPPOSITE_DIRECTIONS[lastDirection]) return;
```

The direction queue is updated identically to the keyboard handler, ensuring touch and keyboard are functionally equivalent.
