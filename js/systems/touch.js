import { getState, setState } from "../game/game.js";
import { DIRECTIONS, OPPOSITE_DIRECTIONS, GAME_STATUS, SCREENS } from "../game/constants.js";

const MIN_SWIPE = 30;
const TAP_TIMEOUT = 300;

export function initTouch(container) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;

  container.addEventListener("touchstart", (e) => {
    const state = getState();
    if (state.screen !== SCREENS.GAME || state.status === GAME_STATUS.GAMEOVER) return;

    tracking = true;
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
    e.preventDefault();
  }, { passive: false });

  container.addEventListener("touchmove", (e) => {
    if (!tracking) return;
    e.preventDefault();
  }, { passive: false });

  container.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;

    const state = getState();
    if (state.screen !== SCREENS.GAME) return;

    const t = e.changedTouches[0];
    const deltaX = t.clientX - startX;
    const deltaY = t.clientY - startY;
    const absDx = Math.abs(deltaX);
    const absDy = Math.abs(deltaY);
    const elapsed = Date.now() - startTime;

    // Tap → toggle pause (same as Space)
    if (absDx < MIN_SWIPE && absDy < MIN_SWIPE && elapsed < TAP_TIMEOUT) {
      if (state.status === GAME_STATUS.RUNNING) {
        setState({ ...state, status: GAME_STATUS.PAUSED });
      } else if (state.status === GAME_STATUS.PAUSED) {
        setState({ ...state, status: GAME_STATUS.RUNNING });
      }
      return;
    }

    if (absDx < MIN_SWIPE && absDy < MIN_SWIPE) return;

    // Swipe → direction
    if (state.status !== GAME_STATUS.RUNNING) return;

    let newDirection;
    if (absDx > absDy) {
      newDirection = deltaX > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
    } else {
      newDirection = deltaY > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
    }

    const lastDirection = state.nextDirection.length > 0
      ? state.nextDirection[state.nextDirection.length - 1]
      : state.direction;

    if (newDirection === OPPOSITE_DIRECTIONS[lastDirection]) return;

    const nextQueue = [...state.nextDirection, newDirection].slice(-4);
    setState({ ...state, nextDirection: nextQueue });
  }, { passive: false });
}
