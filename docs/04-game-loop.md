# Game Loop — `loop.js`

## Overview

`loop.js` is the engine heartbeat. It drives all gameplay systems on a fixed time-step using `requestAnimationFrame`, ensuring the snake moves at a consistent speed regardless of the monitor's refresh rate.

## Module-Level State

```js
let lastTime    = 0;
let accumulator = 0;
let running     = false;
let rafId       = null;
```

| Variable | Purpose |
|---|---|
| `lastTime` | Timestamp of the previous `rAF` callback (ms) |
| `accumulator` | Elapsed time not yet consumed by ticks (ms) |
| `running` | Guards against double-starting the loop |
| `rafId` | Handle to the pending `requestAnimationFrame` call — used for cancellation |

## Fixed Time-Step (`accumulator` Pattern)

```js
function loop(currentTime) {
  if (!running) return;

  const deltaTime = Math.min(currentTime - lastTime, 200);
  lastTime = currentTime;
  accumulator += deltaTime;

  while (accumulator >= tickRate) {
    tick();
    accumulator -= tickRate;
  }

  rafId = requestAnimationFrame(loop);
}
```

`requestAnimationFrame` fires roughly every 16 ms on a 60 Hz screen, but `tickRate` (the time per game tick) is typically 80–150 ms. The accumulator bridges this gap:

- Real time is added to the accumulator every frame.
- For every complete `tickRate` slice in the accumulator, one game tick is executed.
- The remainder carries over to the next frame.

This means on a fast screen (144 Hz, ~7 ms per frame) the loop runs many frames between ticks without any drift. On a slow screen (30 Hz, ~33 ms per frame) it may run two ticks in one frame to stay on schedule.

The `Math.min(..., 200)` cap prevents a "spiral of death": if the tab is backgrounded, focus is lost, or the CPU spikes, the next frame could have a huge `deltaTime`. Without the cap, the accumulator would fill up and execute hundreds of ticks at once, crashing the snake. 200 ms allows for at most 2–3 ticks at the slowest difficulty.

## `startLoop()` and `stopLoop()`

```js
export function startLoop() {
  if (running) return;          // idempotent — safe to call twice
  if (rafId !== null) cancelAnimationFrame(rafId);  // cancel any zombie rAF
  running = true;
  lastTime = performance.now();
  accumulator = 0;
  rafId = requestAnimationFrame(loop);
}

export function stopLoop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
```

`stopLoop()` is called by:
- `collision.js` on game over
- `loop.js` itself when a stage is won (`checkStageWin`)
- `input.js` / `renderer.js` when navigating back to the menu

## The `tick()` Function

One game tick does four things in order:

```js
function tick() {
  const state = getState();
  if (state.status !== GAME_STATUS.RUNNING) return;

  const newHead = computeNextHead(state);   // 1. Preview next head position
  if (wouldCollide(state, newHead)) {       // 2. Check collision before moving
    gameOver(state);
    return;
  }

  updateMovement();   // 3. Commit the move
  checkFood();        // 4. Handle food pickup
  checkStageWin();    // 5. Check win condition
}
```

### Why Collision Happens Before Movement

The naive approach would be to move first, then check for collisions. The problem: if the snake head lands on a wall or its own body, the state has already been committed with an invalid position, and the renderer would briefly show the snake inside the wall before the game-over overlay appears.

By calling `computeNextHead()` (a read-only preview from `movement.js`) and running `wouldCollide()` against that preview, the game detects a fatal move **before** it's committed. If collision is detected, `gameOver()` is called immediately and `updateMovement()` is never invoked.

## `wouldCollide(state, head)` — Pre-Move Collision

```js
function wouldCollide(state, head) {
  // Self-collision (skip index 0, the current head)
  if (state.snake.some((seg, i) => i > 0 && seg.x === head.x && seg.y === head.y)) return true;

  // Wall collision (only when edges don't wrap)
  if (!state.world.wrapEdges) {
    if (head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows) return true;
  }

  // Obstacle collision (stage walls)
  if (state.world?.walls?.some(w => w.x === head.x && w.y === head.y)) return true;

  return false;
}
```

This mirrors the logic in `collision.js` but operates on the preview head rather than the already-committed state.

## `checkStageWin()`

```js
function checkStageWin() {
  const state = getState();
  if (state.mode !== MODES.STAGE) return;
  if (state.status !== GAME_STATUS.RUNNING) return;
  if (state.score < state.foodTarget) return;

  stopLoop();
  saveStageProgress(state.stageIndex + 1);   // unlock the next stage
  setState({ ...state, status: GAME_STATUS.STAGE_COMPLETE, food: null });
}
```

After `checkFood()` potentially increments `state.score`, this function checks whether the stage's `foodTarget` has been reached. If so:
- The loop is stopped.
- Progress is saved to `localStorage` (the next stage index is written, so reloading the page continues from where the player left off).
- The state is updated to `STAGE_COMPLETE` and `food` is set to `null` so the food tile disappears from the board.

The renderer listens for `STAGE_COMPLETE` status and renders the stage-complete overlay.
