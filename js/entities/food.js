import { getState, setState } from "../game/game.js";

export function checkFood() {
  const state = getState();

  if (state.status !== "running") return;

  const head = state.snake[0];

  if (head.x === state.food.x && head.y === state.food.y) {
    eatFood(state);
  }
}

function eatFood(state) {
  const newFood = generateFood(state);

  setState({
    ...state,
    food: newFood,
    score: state.score + 1,
    grow: state.grow + 1,
  });
}

function generateFood(state) {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * state.cols),
      y: Math.floor(Math.random() * state.rows),
    };

    if (isValidFoodCell(state, candidate)) {
      return candidate;
    }
  }
}

function isValidFoodCell(state, cell) {
  if (isOnSnake(state, cell)) return false;
  if (isOnWall(state, cell)) return false;
  return true;
}

function isOnSnake(state, cell) {
  return state.snake.some(
    (segment) => segment.x === cell.x && segment.y === cell.y
  );
}

function isOnWall(state, cell) {
  if (!state.world?.walls?.length) return false;

  return state.world.walls.some(
    (wall) => wall.x === cell.x && wall.y === cell.y
  );
}
