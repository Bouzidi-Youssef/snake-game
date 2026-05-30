import { resetGame, updateState, loadStage } from "../game/game.js";
import { startLoop, stopLoop } from "../game/loop.js";
import { SCREENS, GAME_STATUS, DIFFICULTIES, MODES } from "../game/constants.js";
import { stages } from "../../stages/index.js";
import { getStageProgress } from "../game/stage-loader.js";

const CELL = 28;
const COLS = 21;
const ROWS = 15;

// Native dimensions of the full game-screen block (container + HUD strip below)
const NATIVE_W = 596;   // container width  (588 board + 4px border × 2)
const NATIVE_H = 428;   // container height (420 board + 4px border × 2)
const HUD_H    = 50;    // approx height of .game-hud-strip + its gap
const NATIVE_TOTAL_H = NATIVE_H + HUD_H;

// Padding kept clear on every edge of the viewport (px)
const VIEWPORT_PAD = 12;

/* ── Scale helper ────────────────────────────────────────────────────────────
   Computes the uniform scale that fits .game-screen inside the current
   viewport, capped at 1 (never upscale on large screens).
   Returns { scale, marginV } where marginV is the negative vertical margin
   (px) needed to collapse the whitespace the un-scaled layout-box would
   otherwise reserve.                                                        */
function computeScale() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const availW = vw - VIEWPORT_PAD * 2;
  const availH = vh - VIEWPORT_PAD * 2;

  const scale = Math.min(1, availW / NATIVE_W, availH / NATIVE_TOTAL_H);

  // When scaled < 1 the element's layout box is still NATIVE size.
  // The visual height becomes NATIVE_TOTAL_H * scale, so we need to
  // pull neighbouring elements up by the invisible remainder.
  const visualH  = NATIVE_TOTAL_H * scale;
  const marginV  = ((NATIVE_TOTAL_H - visualH) / 2) * -1;

  return { scale, marginV };
}

/* Apply scale to both :root (so CSS picks it up before JS renders)
   and directly to the element for immediate effect.               */
function applyScale(el) {
  const { scale, marginV } = computeScale();
  const mv = `${marginV}px`;
  // :root keeps the value available across screen transitions
  document.documentElement.style.setProperty('--scale',          scale);
  document.documentElement.style.setProperty('--scale-margin-v', mv);
  // Also set on the element directly (specificity insurance)
  if (el) {
    el.style.setProperty('--scale',          scale);
    el.style.setProperty('--scale-margin-v', mv);
  }
}

// Re-apply on resize / orientation change
let _activeScreen = null;
window.addEventListener('resize', () => {
  applyScale(_activeScreen); // null-safe: sets :root even without an element
});

/* ── Main render entry ───────────────────────────────────────────────────── */
export function render(container, state) {
  if (state.screen === SCREENS.GAME) {
    const board = container.querySelector('.game-board');
    if (board) {
      updateBoard(board, container, state);
      // Re-apply scale in case orientation changed between screens
      const screen = container.querySelector('.game-screen');
      if (screen) applyScale(screen);
      return;
    }
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "snake-game-container";
    buildGameBoard(container, wrapper, state);
    return;
  }

  container.innerHTML = "";

  const screenWrap = document.createElement("div");
  screenWrap.className = "game-screen";

  const wrapper = document.createElement("div");
  wrapper.className = "snake-game-container";

  if (state.screen === SCREENS.MENU) {
    renderMenu(wrapper, state);
  } else if (state.screen === SCREENS.LEVEL_SELECT) {
    renderLevelSelect(wrapper, state);
  } else if (state.screen === SCREENS.GAMEOVER) {
    renderGameOver(wrapper, state);
  }

  screenWrap.appendChild(wrapper);

  const spacer = document.createElement("div");
  spacer.className = "hud-spacer";
  screenWrap.appendChild(spacer);

  container.appendChild(screenWrap);

  // Scale after the element is in the DOM
  _activeScreen = screenWrap;
  applyScale(screenWrap);
}

/* ── Menu ─────────────────────────────────────────── */
function renderMenu(wrapper, state) {
  wrapper.innerHTML = `
    <div class="screen-inner">
      <div class="game-title"><span class="game-title-text">snake</span></div>
      <button class="btn btn-play">PLAY</button>
      <button class="btn btn-stage">STAGE</button>
    </div>
  `;

  wrapper.querySelector(".btn-play").addEventListener("click", () => {
    updateState({ screen: SCREENS.LEVEL_SELECT });
  });

  wrapper.querySelector(".btn-stage").addEventListener("click", () => {
    let idx = getStageProgress();
    if (idx >= stages.length) idx = 0;
    loadStage(idx, stages[idx]);
    startLoop();
  });
}

/* ── Level Select ─────────────────────────────────── */
function renderLevelSelect(wrapper, state) {
  wrapper.innerHTML = `
    <div class="screen-inner">
      <div class="game-title"><span class="game-title-text">snake</span></div>
      <div class="choose-label">CHOOSE LEVEL:</div>
      <div class="level-row">
        ${Object.entries(DIFFICULTIES).map(([key, diff]) => `
          <div class="level-cell">
            <button class="btn btn-level" data-difficulty="${key}">${diff.LABEL}</button>
          </div>
        `).join("")}
      </div>
      <button class="btn btn-back">← BACK</button>
    </div>
  `;

  wrapper.querySelectorAll(".btn-level").forEach((btn) => {
    btn.addEventListener("click", () => {
      resetGame(btn.dataset.difficulty);
      startLoop();
    });
  });

  wrapper.querySelector(".btn-back").addEventListener("click", () => {
    updateState({ screen: SCREENS.MENU });
  });
}

/* ── Game (initial build) ─────────────────────────── */
function buildGameBoard(container, wrapper, state) {
  const diffLabel = state.difficulty
    ? (DIFFICULTIES[state.difficulty]?.LABEL || "---")
    : "---";

  const board = document.createElement("div");
  board.className = "game-board";

  state.snake.forEach((segment) => {
    const el = document.createElement("div");
    el.className = "snake-segment";
    el.style.left = `${segment.x * CELL}px`;
    el.style.top  = `${segment.y * CELL}px`;
    board.appendChild(el);
  });

  if (state.food) {
    const foodEl = document.createElement("div");
    foodEl.className = "game-food";
    foodEl.style.left = `${state.food.x * CELL}px`;
    foodEl.style.top  = `${state.food.y * CELL}px`;
    board.appendChild(foodEl);
  }

  if (state.world?.walls) {
    state.world.walls.forEach((wall) => {
      const wallEl = document.createElement("div");
      wallEl.className = "game-wall";
      wallEl.style.left = `${wall.x * CELL}px`;
      wallEl.style.top  = `${wall.y * CELL}px`;
      board.appendChild(wallEl);
    });
  }

  if (state.status === GAME_STATUS.PAUSED) {
    const overlay = document.createElement("div");
    overlay.className = "pause-overlay";
    overlay.innerHTML = `
      <div class="pause-text">PAUSED</div>
      <div class="pause-hint">Press SPACE to Resume</div>
    `;
    board.appendChild(overlay);
  }

  if (state.status === GAME_STATUS.STAGE_COMPLETE) {
    const isLast = state.stageIndex >= stages.length - 1;
    const overlay = document.createElement("div");
    overlay.className = "stage-complete-overlay";
    overlay.innerHTML = isLast
      ? `<div class="stage-complete-title">ALL STAGES CLEARED!</div>
         <div class="stage-complete-hint">Tap to return to menu</div>`
      : `<div class="stage-complete-title">STAGE COMPLETE!</div>
         <div class="stage-complete-hint">Tap to continue</div>`;
    overlay.addEventListener("click", () => {
      stopLoop();
      if (isLast) {
        updateState({ screen: SCREENS.MENU, status: GAME_STATUS.IDLE });
      } else {
        container.innerHTML = "";
        const nextIdx = state.stageIndex + 1;
        loadStage(nextIdx, stages[nextIdx]);
        startLoop();
      }
    });
    board.appendChild(overlay);
  }

  wrapper.appendChild(board);

  const screenWrap = document.createElement("div");
  screenWrap.className = "game-screen";
  screenWrap.appendChild(wrapper);

  const hud = document.createElement("div");
  hud.className = "game-hud-strip";
  hud.innerHTML = state.mode === MODES.STAGE
    ? `<span class="hud-score">${state.score}</span>
       <span>Stage ${state.stageIndex + 1}/${stages.length}</span>`
    : `<span class="hud-score">${state.score}</span>
       <span>${diffLabel.toUpperCase()}<span class="hud-highscore">${state.highScore[state.difficulty] || 0}</span></span>`;
  screenWrap.appendChild(hud);
  container.appendChild(screenWrap);

  _activeScreen = screenWrap;
  applyScale(screenWrap);
}

/* ── Game (incremental update) ────────────────────── */
function updateBoard(board, container, state) {
  const diffLabel = state.difficulty
    ? (DIFFICULTIES[state.difficulty]?.LABEL || "---")
    : "---";

  // --- Snake segments ---
  const segments = board.querySelectorAll('.snake-segment');
  state.snake.forEach((segment, i) => {
    if (segments[i]) {
      segments[i].style.left = `${segment.x * CELL}px`;
      segments[i].style.top  = `${segment.y * CELL}px`;
    }
  });

  // Remove excess segments
  while (board.querySelectorAll('.snake-segment').length > state.snake.length) {
    const segs = board.querySelectorAll('.snake-segment');
    segs[segs.length - 1].remove();
  }

  // Add new segments
  const curCount = board.querySelectorAll('.snake-segment').length;
  for (let i = curCount; i < state.snake.length; i++) {
    const el = document.createElement("div");
    el.className = "snake-segment";
    el.style.left = `${state.snake[i].x * CELL}px`;
    el.style.top  = `${state.snake[i].y * CELL}px`;
    board.appendChild(el);
  }

  // --- Food ---
  const oldFood = board.querySelector('.game-food');
  if (!state.food) {
    if (oldFood) oldFood.remove();
  } else {
    const newLeft = `${state.food.x * CELL}px`;
    const newTop  = `${state.food.y * CELL}px`;
    if (!oldFood || oldFood.style.left !== newLeft || oldFood.style.top !== newTop) {
      if (oldFood) oldFood.remove();
      const foodEl = document.createElement("div");
      foodEl.className = "game-food";
      foodEl.style.left = newLeft;
      foodEl.style.top  = newTop;
      board.appendChild(foodEl);
    }
  }

  // --- Pause overlay ---
  const overlay = board.querySelector('.pause-overlay');
  if (state.status === GAME_STATUS.PAUSED && !overlay) {
    const el = document.createElement("div");
    el.className = "pause-overlay";
    el.innerHTML = `
      <div class="pause-text">PAUSED</div>
      <div class="pause-hint">Press SPACE to Resume</div>
    `;
    board.appendChild(el);
  } else if (state.status !== GAME_STATUS.PAUSED && overlay) {
    overlay.remove();
  }

  // --- Game-over overlay ---
  const goOverlay = board.querySelector('.gameover-overlay');
  if (state.status === GAME_STATUS.GAMEOVER && !goOverlay) {
    const el = document.createElement("div");
    el.className = "gameover-overlay";
    el.innerHTML = `
      <div class="gameover-title">GAME OVER</div>
      <div class="gameover-score">SCORE: <span class="gameover-score-value">${state.score}</span></div>
      <div class="gameover-highscore">HIGH SCORE: ${state.highScore[state.difficulty] || 0}</div>
      <div class="gameover-btns">
        <button class="btn btn-replay">RETRY</button>
        <button class="btn btn-menu">MENU</button>
      </div>
    `;
    el.querySelector(".btn-replay").addEventListener("click", () => {
      stopLoop();
      if (state.mode === MODES.STAGE) {
        loadStage(state.stageIndex, stages[state.stageIndex]);
      } else {
        resetGame(state.difficulty);
      }
      startLoop();
    });
    el.querySelector(".btn-menu").addEventListener("click", () => {
      stopLoop();
      updateState({ screen: SCREENS.MENU, status: GAME_STATUS.IDLE });
    });
    board.appendChild(el);
  } else if (state.status !== GAME_STATUS.GAMEOVER && goOverlay) {
    goOverlay.remove();
  }

  // --- Stage-complete overlay ---
  const scOverlay = board.querySelector('.stage-complete-overlay');
  if (state.status === GAME_STATUS.STAGE_COMPLETE && !scOverlay) {
    const isLast = state.stageIndex >= stages.length - 1;
    const el = document.createElement("div");
    el.className = "stage-complete-overlay";
    el.innerHTML = isLast
      ? `<div class="stage-complete-title">ALL STAGES CLEARED!</div>
         <div class="stage-complete-hint">Tap to return to menu</div>`
      : `<div class="stage-complete-title">STAGE COMPLETE!</div>
         <div class="stage-complete-hint">Tap to continue</div>`;
    el.addEventListener("click", () => {
      stopLoop();
      if (isLast) {
        updateState({ screen: SCREENS.MENU, status: GAME_STATUS.IDLE });
      } else {
        container.innerHTML = "";
        const nextIdx = state.stageIndex + 1;
        loadStage(nextIdx, stages[nextIdx]);
        startLoop();
      }
    });
    board.appendChild(el);
  } else if (state.status !== GAME_STATUS.STAGE_COMPLETE && scOverlay) {
    scOverlay.remove();
  }

  // --- HUD ---
  const hud = container.querySelector('.game-hud-strip');
  if (hud) {
    hud.innerHTML = state.mode === MODES.STAGE
      ? `<span class="hud-score">${state.score}</span>
         <span>Stage ${state.stageIndex + 1}/${stages.length}</span>`
      : `<span class="hud-score">${state.score}</span>
         <span>${diffLabel.toUpperCase()}<span class="hud-highscore">${state.highScore[state.difficulty] || 0}</span></span>`;
  }
}

/* ── Game Over screen ─────────────────────────────── */
function renderGameOver(wrapper, state) {
  wrapper.innerHTML = `
    <div class="screen-inner">
      <div class="gameover-title">GAME OVER</div>
      <div class="gameover-score">SCORE: <span class="gameover-score-value">${state.score}</span></div>
      <div class="gameover-highscore">HIGH SCORE: ${state.highScore[state.difficulty] || 0}</div>
      <div class="gameover-btns">
        <button class="btn btn-replay">RETRY</button>
        <button class="btn btn-menu">MENU</button>
      </div>
    </div>
  `;

  wrapper.querySelector(".btn-replay").addEventListener("click", () => {
    stopLoop();
    resetGame(state.difficulty);
    startLoop();
  });

  wrapper.querySelector(".btn-menu").addEventListener("click", () => {
    stopLoop();
    updateState({ screen: SCREENS.MENU, status: GAME_STATUS.IDLE });
  });
}
