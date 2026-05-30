import { getState } from "./game.js";
import { updateMovement } from "../systems/movement.js";
import { checkCollision } from "../systems/collision.js";
import { checkFood } from "../entities/food.js";

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
  updateMovement();
  checkCollision();
  checkFood();
}
