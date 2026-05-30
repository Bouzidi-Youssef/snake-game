import { createInitialState } from "./state.js";
import { SCREENS, GAME_STATUS, DIRECTIONS, DEFAULTS, DIFFICULTIES } from "./constants.js";

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
