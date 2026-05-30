# Entry Point — `index.html` & `scale-bootstrap.js`

## `index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Snake</title>
  <link rel="stylesheet" href="./styles/style.css" />
  <script src="./js/ui/scale-bootstrap.js"></script>
</head>
<body>
  <main id="app"></main>
  <script type="module" src="./js/main.js"></script>
</body>
</html>
```

The HTML file is intentionally minimal. It has two responsibilities:

1. **Load CSS** — `style.css` is linked in `<head>` so styles are available before any content renders (no flash of unstyled content).
2. **Mount the app** — `<main id="app">` is the single DOM root that `renderer.js` writes into. Everything the player sees — menus, the game board, HUD — is injected here by JavaScript.

### Load Order

```
<head>
  style.css              ← parsed before body renders
  scale-bootstrap.js     ← runs synchronously, sets --scale on :root
</head>
<body>
  #app                   ← empty shell; JS fills it
  main.js (module)       ← deferred by default; runs after DOM is ready
</body>
```

`<script type="module">` is **deferred by default** — it executes after the HTML is parsed, so `document.getElementById("app")` always succeeds without an explicit `DOMContentLoaded` guard (though `main.js` adds one anyway for clarity).

---

## `js/ui/scale-bootstrap.js`

```js
(function () {
  var NATIVE_W       = 596;
  var NATIVE_TOTAL_H = 478;
  var PAD            = 12;

  var vw    = window.innerWidth;
  var vh    = window.innerHeight;
  var scale = Math.min(1, (vw - PAD * 2) / NATIVE_W, (vh - PAD * 2) / NATIVE_TOTAL_H);

  var visualH = NATIVE_TOTAL_H * scale;
  var marginV = ((NATIVE_TOTAL_H - visualH) / 2) * -1;

  document.documentElement.style.setProperty('--scale',          scale);
  document.documentElement.style.setProperty('--scale-margin-v', marginV + 'px');
})();
```

### Why It Exists

The game board has fixed native dimensions (596 × 428 px container, plus ~50 px HUD strip). On small screens or phones the board would overflow the viewport. The solution is a CSS `transform: scale()` applied to `.game-screen`.

The problem is that if scaling is handled only by `renderer.js` (which runs after `DOMContentLoaded`), there is a **visible layout jump** on first load: the page first renders at full size, then snaps to the scaled size a moment later.

`scale-bootstrap.js` solves this by running **synchronously inside `<head>`**, before the browser has painted anything. It computes the same scale formula as `renderer.js` and writes `--scale` and `--scale-margin-v` onto `:root` so the CSS picks them up on the very first paint.

### Scale Formula

```
scale = min(1, availableWidth / NATIVE_W, availableHeight / NATIVE_TOTAL_H)
```

- Never exceeds `1` — the game is never upscaled on large screens.
- Uses both axes — whichever axis is tighter wins.
- `PAD = 12` keeps 12 px of breathing room on all four sides.

### Negative Margin Trick

When `scale < 1`, the element's **layout box** is still `NATIVE_TOTAL_H` pixels tall (CSS `transform` does not affect layout). The visual height is `NATIVE_TOTAL_H × scale`. This leaves `NATIVE_TOTAL_H × (1 - scale)` px of invisible whitespace around the element, pushing the page content apart.

The fix:

```
marginV = -((NATIVE_TOTAL_H - visualH) / 2)
```

This negative margin collapses exactly the invisible remainder, so neighbouring elements sit flush against the visible edge of the scaled game.

### Relationship to `renderer.js`

`renderer.js` contains an identical `computeScale()` function and calls `applyScale()` after every screen transition and on `window resize`. The bootstrap script and renderer stay in sync by using the same constants (`NATIVE_W`, `NATIVE_TOTAL_H`, `PAD`).

> **Note:** `scale-bootstrap.js` uses `var` (not `const`/`let`) and an IIFE wrapper because it targets maximum browser compatibility and runs before any module tooling.
