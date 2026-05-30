import { getState, setState } from "./game.js";
import { MODES, GAME_STATUS } from "./constants.js";
import { updateMovement, computeNextHead } from "../systems/movement.js";
import { gameOver } from "../systems/collision.js";
import { checkFood } from "../entities/food.js";
import { saveStageProgress } from "./stage-loader.js";

let lastTime = 0;
let accumulator = 0;
let running = false;
let rafId = null;

export function startLoop() {
  if (running) return;

  if (rafId !== null) cancelAnimationFrame(rafId);

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

function loop(currentTime) {
  if (!running) return;

  const state = getState();

  const deltaTime = Math.min(currentTime - lastTime, 200);
  lastTime = currentTime;

  accumulator += deltaTime;

  const tickRate = state.tickRate;

  while (accumulator >= tickRate) {
    tick();
    accumulator -= tickRate;
  }

  rafId = requestAnimationFrame(loop);
}

function tick() {
  const state = getState();
  if (state.status !== GAME_STATUS.RUNNING) return;

  const newHead = computeNextHead(state);
  if (wouldCollide(state, newHead)) {
    gameOver(state);
    return;
  }

  updateMovement();
  checkFood();
  checkStageWin();
}

function wouldCollide(state, head) {
  if (state.snake.some((seg, i) => i > 0 && seg.x === head.x && seg.y === head.y)) return true;
  if (!state.world.wrapEdges) {
    if (head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows) return true;
  }
  if (state.world?.walls?.some(w => w.x === head.x && w.y === head.y)) return true;
  return false;
}

function checkStageWin() {
  const state = getState();
  if (state.mode !== MODES.STAGE) return;
  if (state.status !== GAME_STATUS.RUNNING) return;
  if (state.score < state.foodTarget) return;

  stopLoop();
  saveStageProgress(state.stageIndex + 1);
  setState({ ...state, status: GAME_STATUS.STAGE_COMPLETE, food: null });
}
