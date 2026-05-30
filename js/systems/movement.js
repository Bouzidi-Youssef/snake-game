import { getState, setState } from "../game/game.js";
import { OPPOSITE_DIRECTIONS } from "../game/constants.js";

export function computeNextHead(state) {
  let direction = state.direction;
  const queue = state.nextDirection;

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

export function updateMovement() {
  const state = getState();

  if (state.status !== "running") return;

  let direction = state.direction;
  const queue = [...state.nextDirection];

  while (queue.length > 0) {
    const nextDir = queue.shift();
    if (nextDir !== OPPOSITE_DIRECTIONS[direction]) {
      direction = nextDir;
      break;
    }
  }

  const head = state.snake[0];

  let newHead = { x: head.x, y: head.y };

  switch (direction) {
    case "UP":
      newHead.y -= 1;
      break;
    case "DOWN":
      newHead.y += 1;
      break;
    case "LEFT":
      newHead.x -= 1;
      break;
    case "RIGHT":
      newHead.x += 1;
      break;
  }

  // Wrap edges
  if (state.world.wrapEdges) {
    newHead.x = ((newHead.x % state.cols) + state.cols) % state.cols;
    newHead.y = ((newHead.y % state.rows) + state.rows) % state.rows;
  }

  const newSnake = [newHead, ...state.snake];

  if (state.grow > 0) {
    state.grow -= 1;
  } else {
    newSnake.pop();
  }

  setState({
    ...state,
    snake: newSnake,
    direction,
    nextDirection: queue,
  });
}
