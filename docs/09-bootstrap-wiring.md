# Bootstrap & Wiring — `main.js`

## Role

`main.js` is the composition root. It does not contain any game logic — its only job is to wire together the modules that do: the state store, the input systems, and the renderer.

```js
import { subscribe, getState } from "./game/game.js";
import { initInput }           from "./systems/input.js";
import { initTouch }           from "./systems/touch.js";
import { render }              from "./ui/renderer.js";

document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById("app");
  if (!appContainer) return;

  // 1. Subscribe the renderer to all state changes
  subscribe((state) => {
    render(appContainer, state);
  });

  // 2. Activate input systems
  initInput();
  initTouch(appContainer);

  // 3. Draw the initial screen (Menu)
  render(appContainer, getState());
});
```

## Step-by-Step

### 1. Subscribe the renderer

```js
subscribe((state) => render(appContainer, state));
```

Every future call to `setState` or `updateState` in any module will automatically invoke `render`. There is no other wiring needed — no event bus, no polling.

### 2. Activate input systems

```js
initInput();             // attaches document-level keydown listener
initTouch(appContainer); // attaches touchstart/touchmove/touchend to #app
```

`initInput` listens on `document` (so keyboard events fire regardless of focus). `initTouch` listens on `appContainer` (the `#app` div) to scope touch events to the game area.

### 3. Initial render

```js
render(appContainer, getState());
```

`getState()` returns the initial state created by `createInitialState()`, which has `screen: SCREENS.MENU`. The renderer draws the main menu. After this point all rendering is driven by state changes.

## Why `DOMContentLoaded`?

Although `<script type="module">` is deferred by default and runs after HTML parsing, the `DOMContentLoaded` guard is kept for explicitness and to ensure `#app` exists before the renderer tries to query it.

## Module Dependency Graph

```
main.js
  ├── game/game.js          (subscribe, getState)
  ├── systems/input.js      (initInput)
  ├── systems/touch.js      (initTouch)
  └── ui/renderer.js        (render)
        ├── game/game.js    (resetGame, updateState, loadStage)
        ├── game/loop.js    (startLoop, stopLoop)
        ├── game/constants.js
        ├── game/stage-loader.js
        └── stages/index.js

game/loop.js
  ├── game/game.js
  ├── game/constants.js
  ├── systems/movement.js
  ├── systems/collision.js
  ├── entities/food.js
  └── game/stage-loader.js

systems/movement.js  → game/game.js, game/constants.js
systems/collision.js → game/game.js, game/loop.js, game/constants.js
systems/input.js     → game/game.js, game/constants.js, game/loop.js
systems/touch.js     → game/game.js, game/constants.js
entities/food.js     → game/game.js
```

There are no circular dependencies. `game/game.js` is the only shared dependency — all systems read from and write to it, but it never imports from them.
