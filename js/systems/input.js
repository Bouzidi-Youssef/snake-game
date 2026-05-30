import { setState, getState, updateState } from "../game/game.js";
import { DIRECTIONS, OPPOSITE_DIRECTIONS, GAME_STATUS, SCREENS } from "../game/constants.js";
import { stopLoop } from "../game/loop.js";

const keyMap = {
  ArrowUp: DIRECTIONS.UP,
  ArrowDown: DIRECTIONS.DOWN,
  ArrowLeft: DIRECTIONS.LEFT,
  ArrowRight: DIRECTIONS.RIGHT,
  w: DIRECTIONS.UP,
  s: DIRECTIONS.DOWN,
  a: DIRECTIONS.LEFT,
  d: DIRECTIONS.RIGHT,
};

export function initInput() {
  document.addEventListener("keydown", handleKeyDown);
}

function handleKeyDown(e) {
  const state = getState();

  const key = e.key;

  // Toggle Pause on Spacebar, or advance on stage-complete
  if (key === " " || key === "Spacebar") {
    if (state.screen === SCREENS.GAME) {
      e.preventDefault();
      if (state.status === GAME_STATUS.RUNNING) {
        setState({
          ...state,
          status: GAME_STATUS.PAUSED,
        });
      } else if (state.status === GAME_STATUS.PAUSED) {
        setState({
          ...state,
          status: GAME_STATUS.RUNNING,
        });
      } else if (state.status === GAME_STATUS.STAGE_COMPLETE) {
        const overlay = document.querySelector('.stage-complete-overlay');
        if (overlay) overlay.click();
      } else if (state.status === GAME_STATUS.GAMEOVER) {
        const replay = document.querySelector('.btn-replay');
        if (replay) replay.click();
      }
    }
    return;
  }

  // Go back on Escape
  if (key === "Escape") {
    if (state.screen === SCREENS.LEVEL_SELECT) {
      e.preventDefault();
      updateState({ screen: SCREENS.MENU });
    } else if (state.screen === SCREENS.GAME || state.screen === SCREENS.GAMEOVER) {
      e.preventDefault();
      stopLoop();
      updateState({
        screen: SCREENS.MENU,
        status: GAME_STATUS.IDLE,
      });
    }
    return;
  }

  // Prevent arrow keys from scrolling the page
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
    e.preventDefault();
  }

  // Ignore browser-generated key repeats (holding a key down)
  if (e.repeat) return;

  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;

  const newDirection = keyMap[normalizedKey];

  if (!newDirection) return;

  if (state.status !== GAME_STATUS.RUNNING) return;

  const lastDirection = state.nextDirection.length > 0
    ? state.nextDirection[state.nextDirection.length - 1]
    : state.direction;

  if (newDirection === OPPOSITE_DIRECTIONS[lastDirection]) return;

  const nextQueue = [...state.nextDirection, newDirection].slice(-4);
  setState({
    ...state,
    nextDirection: nextQueue,
  });
}
