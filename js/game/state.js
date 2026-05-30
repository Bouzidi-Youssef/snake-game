import {
  DIRECTIONS,
  GAME_STATUS,
  SCREENS,
  MODES,
  DEFAULTS,
} from "./constants.js";

export const createInitialState = () => {
  return {
    screen: SCREENS.MENU,

    status: GAME_STATUS.IDLE,

    mode: MODES.CLASSIC,

    world: {
      wrapEdges: true,
      walls: [],
    },

    cols: DEFAULTS.COLS,
    rows: DEFAULTS.ROWS,

    tickRate: DEFAULTS.TICK_RATE,

    direction: DIRECTIONS.RIGHT,
    nextDirection: [DIRECTIONS.RIGHT],

    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ],

    food: {
      x: 5,
      y: 5,
    },

    score: 0,

    highScore: {},

    grow: 0,

    difficulty: null,
  };
};
