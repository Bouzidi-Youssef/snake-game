# Full Game Flow Walkthrough

This document traces the complete lifecycle of a game session from page load to game over, connecting every module in sequence.

---

## 1. Page Load

```
Browser loads index.html
  → style.css parsed
  → scale-bootstrap.js runs synchronously
      writes --scale and --scale-margin-v on :root
  → DOM fully parsed
  → main.js (deferred module) executes
      subscribe(render)   ← renderer registered
      initInput()         ← keydown listener on document
      initTouch(#app)     ← touch listeners on #app
      render(app, getState())   ← initial state: screen=MENU
```

`renderer.js` receives `screen: "menu"` and builds the menu DOM inside `#app`.

---

## 2. Classic Mode: Player Presses PLAY

```
Click on .btn-play
  → updateState({ screen: SCREENS.LEVEL_SELECT })
      → notify() → render(app, state)
          → state.screen = "level_select"
          → renderLevelSelect() builds difficulty buttons
```

---

## 3. Player Chooses a Difficulty

```
Click on .btn-level[data-difficulty="PYTHON"]
  → resetGame("PYTHON")
      creates fresh state:
        screen:     SCREENS.GAME
        status:     GAME_STATUS.RUNNING
        tickRate:   80
        difficulty: "PYTHON"
        highScore:  (preserved from previous state)
      → notify() → render(app, state)
          → state.screen = "game", no .game-board in DOM
          → buildGameBoard() creates full board structure
          → applyScale()

  → startLoop()
      running = true
      rafId = requestAnimationFrame(loop)
```

---

## 4. Game Loop Running

Every ~16 ms (60 Hz screen):

```
loop(currentTime)
  deltaTime += since last frame
  accumulator += deltaTime

  while accumulator >= 80ms (tickRate):
    tick()
    accumulator -= 80ms
```

Every ~80 ms, `tick()` executes:

```
tick()
  newHead = computeNextHead(state)   ← preview next position
  if wouldCollide(state, newHead)    ← check before committing
    → gameOver(state)                ← stop loop, set status=gameover
    → return

  updateMovement()
    dequeue next direction
    build newSnake = [newHead, ...snake]
    if grow > 0: grow--  (don't pop tail)
    else: newSnake.pop() (normal move)
    setState(...)
      → notify() → render()
          → updateBoard()
              reposition .snake-segment divs
              update HUD score

  checkFood()
    if head == food:
      generateFood() → new safe position
      setState({ food: new, score: +1, grow: +1 })
        → notify() → render()
            → updateBoard()
                food el removed & recreated (triggers CSS appear animation)
                HUD score updated

  checkStageWin()   ← (skipped in Classic mode)
```

---

## 5. Player Steers the Snake

```
keydown "ArrowLeft"
  handleKeyDown()
    normalizedKey = "ArrowLeft"
    newDirection = DIRECTIONS.LEFT
    lastDirection = last entry in nextDirection queue (or state.direction)
    if LEFT != OPPOSITE_DIRECTIONS[lastDirection]:  (not 180° reversal)
      nextQueue = [...nextDirection, "LEFT"].slice(-4)
      setState({ ...state, nextDirection: nextQueue })
        → notify() → render()  (HUD unchanged, no visual change on direction queue update)

Next tick:
  updateMovement()
    queue.shift() → "LEFT"
    direction = "LEFT"
    newHead moves left
```

---

## 6. Pause and Resume

```
keydown " " (Space)
  state.status === RUNNING →
    setState({ ...state, status: GAME_STATUS.PAUSED })
      → notify() → render() → updateBoard()
          pause-overlay appended to .game-board

  (loop.js continues running rAF, but tick() returns early
   because state.status !== "running")

keydown " " (Space again)
  state.status === PAUSED →
    setState({ ...state, status: GAME_STATUS.RUNNING })
      → notify() → render() → updateBoard()
          pause-overlay removed
```

---

## 7. Collision — Game Over

```
tick()
  newHead = computeNextHead(state)   e.g. head hits wall
  wouldCollide(state, newHead) → true

  gameOver(state)
    newHighScore = { ...highScore, [difficulty]: max(current, score) }
    stopLoop()                        ← cancelAnimationFrame
    setState({ ...state, status: "gameover", highScore: newHighScore })
      → notify() → render() → updateBoard()
          gameover-overlay appended with score, high score, RETRY / MENU buttons
```

---

## 8. Stage Mode Flow

```
Click .btn-stage (on menu)
  idx = getStageProgress()           ← reads localStorage
  loadStage(idx, stages[idx])
    parseWallMap(stageConfig.walls)  ← "#" chars → {x,y} wall objects
    place snake at snakeStart
    generate initial food (not on walls/snake)
    setState({ mode: STAGE, world: { walls, wrapEdges }, foodTarget, ... })
  startLoop()

  Game runs identically to Classic until:

  checkStageWin()
    state.score >= state.foodTarget  ← true
    stopLoop()
    saveStageProgress(stageIndex + 1)  ← write to localStorage
    setState({ status: STAGE_COMPLETE, food: null })
      → updateBoard()
          stage-complete-overlay appended

  Player taps overlay:
    if last stage → updateState({ screen: MENU })
    else:
      container.innerHTML = ""
      loadStage(nextIdx, stages[nextIdx])
      startLoop()
```

---

## 9. High Score Persistence

High scores are stored in the state object under `state.highScore`:

```js
{ SLUG: 12, WORM: 7, PYTHON: 4, null: 2 }
```

The key is the `difficulty` string (`"SLUG"`, `"WORM"`, `"PYTHON"`) or `null` for stage mode. When `resetGame` is called, the previous state's `highScore` object is carried over into the fresh state, so scores survive game resets within the same session.

> High scores are **not** persisted to `localStorage` — only stage progress is. Refreshing the page resets the high score display.

---

## State Transitions Summary

```
IDLE ──startGame──► RUNNING ──collision──► (GAMEOVER overlay)
                      │
                   spacebar
                      │
                   PAUSED ──spacebar──► RUNNING
                      │
                  foodTarget met (Stage)
                      │
                  STAGE_COMPLETE ──tap overlay──► next stage or MENU
```
