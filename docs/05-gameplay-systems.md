# Gameplay Systems — `movement.js`, `collision.js`, `food.js`

## `js/systems/movement.js`

Movement is split into two exported functions: a **read-only preview** and a **commit**.

### `computeNextHead(state)` — Preview

```js
export function computeNextHead(state) {
  let direction = state.direction;
  const queue = state.nextDirection;

  // Advance the direction queue, skipping any 180° reversal
  for (let i = 0; i < queue.length; i++) {
    if (queue[i] !== OPPOSITE_DIRECTIONS[direction]) {
      direction = queue[i];
      break;
    }
  }

  const head = state.snake[0];
  let newHead = { x: head.x, y: head.y };

  switch (direction) {
    case "UP":    newHead.y -= 1; break;
    case "DOWN":  newHead.y += 1; break;
    case "LEFT":  newHead.x -= 1; break;
    case "RIGHT": newHead.x += 1; break;
  }

  if (state.world.wrapEdges) {
    newHead.x = ((newHead.x % state.cols) + state.cols) % state.cols;
    newHead.y = ((newHead.y % state.rows) + state.rows) % state.rows;
  }

  return newHead;
}
```

This function is **pure** — it takes state and returns a coordinate object without modifying anything. It is called by `loop.js` to check collisions before committing.

The double-modulo wrap formula `((n % size) + size) % size` handles negative values correctly. If `n = -1` and `size = 21`, JavaScript's `%` gives `-1` (not `20`), so the `+ size` step corrects it.

### `updateMovement()` — Commit

```js
export function updateMovement() {
  const state = getState();
  if (state.status !== "running") return;

  // Resolve direction from queue
  let direction = state.direction;
  const queue = [...state.nextDirection];
  while (queue.length > 0) {
    const nextDir = queue.shift();
    if (nextDir !== OPPOSITE_DIRECTIONS[direction]) {
      direction = nextDir;
      break;
    }
  }

  // Compute new head
  const head = state.snake[0];
  let newHead = { x: head.x, y: head.y };
  // ... switch(direction) ...
  // ... wrap if needed ...

  // Build new snake array
  const newSnake = [newHead, ...state.snake];

  if (state.grow > 0) {
    state.grow -= 1;   // do NOT pop — snake grows
  } else {
    newSnake.pop();    // remove tail — normal move
  }

  setState({ ...state, snake: newSnake, direction, nextDirection: queue });
}
```

**Growth mechanism:** When the snake eats food, `food.js` increments `state.grow`. On each subsequent tick, `updateMovement` checks `grow > 0`. If true, the tail is not popped (the snake becomes one segment longer), and `grow` is decremented. This allows multiple food items to be queued — if `grow = 3`, the snake will grow for the next three ticks.

**Direction queue:** The queue is consumed by `shift()` — only the first valid (non-reversing) direction is used per tick. The rest of the queue is preserved in state for future ticks.

---

## `js/systems/collision.js`

`collision.js` provides both the pre-move check used in `loop.js` (see `wouldCollide`) and a post-move check path via the exported functions — though the primary collision detection in practice runs through `loop.js`'s `wouldCollide`.

### `gameOver(state)` — Exported

```js
export function gameOver(state) {
  const diff = state.difficulty;
  const currentHigh = state.highScore[diff] || 0;
  const newHighScore = {
    ...state.highScore,
    [diff]: Math.max(currentHigh, state.score),
  };
  stopLoop();
  setState({
    ...state,
    status: "gameover",
    highScore: newHighScore,
  });
}
```

`gameOver` is called by `loop.js` when `wouldCollide` returns true. It:

1. Computes the new high score. `state.difficulty` is the key — `null` in Stage mode, a difficulty string in Classic mode.
2. Stops the game loop.
3. Commits the final state with `status: "gameover"` and the updated high score.

The renderer reacts to `status === "gameover"` by injecting a game-over overlay into the board.

### Individual Collision Checks

These are still exported for standalone use or testing:

```js
function isSelfCollision(state, head) {
  return state.snake.some((segment, index) => {
    if (index === 0) return false;     // skip head itself
    return segment.x === head.x && segment.y === head.y;
  });
}

function isWallCollision(state, head) {
  return head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows;
}

function isObstacleCollision(state, head) {
  if (!state.world?.walls?.length) return false;
  return state.world.walls.some(wall => wall.x === head.x && wall.y === head.y);
}
```

---

## `js/entities/food.js`

### `checkFood()`

```js
export function checkFood() {
  const state = getState();
  if (state.status !== "running") return;

  const head = state.snake[0];
  if (head.x === state.food.x && head.y === state.food.y) {
    eatFood(state);
  }
}
```

Called once per tick after `updateMovement()`. It compares the (now committed) head position against the food position.

### `eatFood(state)`

```js
function eatFood(state) {
  const newFood = generateFood(state);
  setState({
    ...state,
    food:  newFood,
    score: state.score + 1,
    grow:  state.grow + 1,
  });
}
```

On a food pickup:
- A new food position is generated and committed atomically with the score increment.
- `grow` is incremented so the snake's tail won't be removed on the next tick.

### `generateFood(state)` — Safe Placement

```js
function generateFood(state) {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * state.cols),
      y: Math.floor(Math.random() * state.rows),
    };
    if (isValidFoodCell(state, candidate)) return candidate;
  }
}

function isValidFoodCell(state, cell) {
  if (isOnSnake(state, cell)) return false;
  if (isOnWall(state, cell))  return false;
  return true;
}
```

The generator uses a rejection-sampling loop — it picks a random cell and retries if it overlaps the snake or any wall. This is simple and correct for a board that is mostly empty. In the extreme case where the snake fills the entire board (a perfect game), this loop would spin forever — but that is an academic edge case for a 21 × 15 = 315 cell board.
