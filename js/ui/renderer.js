import { resetGame, updateState } from "../game/game.js";
import { startLoop, stopLoop } from "../game/loop.js";
import { SCREENS, GAME_STATUS, DIFFICULTIES } from "../game/constants.js";

const CELL = 28;
const COLS = 21;
const ROWS = 15;

export function render(container, state) {
  if (state.screen === SCREENS.GAME) {
    const board = container.querySelector('.game-board');
    if (board) {
      updateBoard(board, container, state);
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
}

/* ── Menu ────────────────────────────────────────── */
function renderMenu(wrapper, state) {
  wrapper.innerHTML = `
    <div class="screen-inner">
      <div class="game-title"><span class="game-title-text">snake</span></div>
      <button class="btn btn-play">PLAY</button>
      <button class="btn btn-stage" disabled>STAGE</button>
    </div>
  `;

  wrapper.querySelector(".btn-play").addEventListener("click", () => {
    updateState({ screen: SCREENS.LEVEL_SELECT });
  });
}

/* ── Level Select ────────────────────────────────── */
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

/* ── Game ─────────────────────────────────────────── */
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

  wrapper.appendChild(board);

  const screenWrap = document.createElement("div");
  screenWrap.className = "game-screen";
  screenWrap.appendChild(wrapper);

  const hud = document.createElement("div");
  hud.className = "game-hud-strip";
  hud.innerHTML = `
    <span class="hud-score">${state.score}</span>
    <span>${diffLabel.toUpperCase()}<span class="hud-highscore">${state.highScore[state.difficulty] || 0}</span></span>
  `;
  screenWrap.appendChild(hud);
  container.appendChild(screenWrap);
}

function updateBoard(board, container, state) {
  const diffLabel = state.difficulty
    ? (DIFFICULTIES[state.difficulty]?.LABEL || "---")
    : "---";

  const segments = board.querySelectorAll('.snake-segment');
  state.snake.forEach((segment, i) => {
    if (segments[i]) {
      segments[i].style.left = `${segment.x * CELL}px`;
      segments[i].style.top  = `${segment.y * CELL}px`;
    }
  });

  while (board.querySelectorAll('.snake-segment').length > state.snake.length) {
    const segs = board.querySelectorAll('.snake-segment');
    segs[segs.length - 1].remove();
  }

  const curCount = board.querySelectorAll('.snake-segment').length;
  for (let i = curCount; i < state.snake.length; i++) {
    const el = document.createElement("div");
    el.className = "snake-segment";
    el.style.left = `${state.snake[i].x * CELL}px`;
    el.style.top  = `${state.snake[i].y * CELL}px`;
    board.appendChild(el);
  }

  const oldFood = board.querySelector('.game-food');
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
      resetGame(state.difficulty);
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

  const hud = container.querySelector('.game-hud-strip');
  if (hud) {
    hud.innerHTML = `
      <span class="hud-score">${state.score}</span>
      <span>${diffLabel.toUpperCase()}<span class="hud-highscore">${state.highScore[state.difficulty] || 0}</span></span>
    `;
  }
}

/* ── Game Over ───────────────────────────────────── */
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
