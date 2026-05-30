import { createInitialState } from "./state.js";
import { SCREENS, GAME_STATUS, DIRECTIONS, DEFAULTS, DIFFICULTIES, MODES } from "./constants.js";
import { parseWallMap } from "./stage-loader.js";

let state = createInitialState();
let listeners = [];

export const getState = () => {
  return state;
};

export const resetGame = (difficulty) => {
  const prev = state;
  const tickRate = difficulty
    ? (DIFFICULTIES[difficulty]?.TICK_RATE ?? DEFAULTS.TICK_RATE)
    : DEFAULTS.TICK_RATE;
  state = {
    ...createInitialState(),
    screen: SCREENS.GAME,
    status: GAME_STATUS.RUNNING,
    highScore: prev.highScore,
    difficulty: difficulty || null,
    tickRate,
  };
  notify();
};

export const loadStage = (stageIndex, stageConfig) => {
  const prev = state;
  const walls = parseWallMap(stageConfig.walls);
  const snake = [
    { x: stageConfig.snakeStart.x, y: stageConfig.snakeStart.y },
    { x: stageConfig.snakeStart.x - 1, y: stageConfig.snakeStart.y },
    { x: stageConfig.snakeStart.x - 2, y: stageConfig.snakeStart.y },
  ];

  const base = createInitialState();
  let food = base.food;
  while (
    walls.some(w => w.x === food.x && w.y === food.y) ||
    snake.some(s => s.x === food.x && s.y === food.y)
  ) {
    food = {
      x: Math.floor(Math.random() * DEFAULTS.COLS),
      y: Math.floor(Math.random() * DEFAULTS.ROWS),
    };
  }

  state = {
    ...base,
    screen: SCREENS.GAME,
    status: GAME_STATUS.RUNNING,
    mode: MODES.STAGE,
    stageIndex,
    foodTarget: stageConfig.foodTarget,
    tickRate: stageConfig.tickRate,
    food,
    world: { wrapEdges: stageConfig.wrapEdges, walls },
    snake,
    direction: DIRECTIONS.RIGHT,
    nextDirection: [DIRECTIONS.RIGHT],
    highScore: prev.highScore,
  };
  notify();
};

export const updateState = (partial) => {
  state = {
    ...state,
    ...partial,
  };
  notify();
};

export const setState = (newState) => {
  state = newState;
  notify();
};

export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

function notify() {
  listeners.forEach((listener) => listener(state));
}
