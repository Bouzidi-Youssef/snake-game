import { getState, setState } from "../game/game.js";
import { stopLoop } from "../game/loop.js";
import { SCREENS } from "../game/constants.js";

export function checkCollision() {
  const state = getState();

  if (state.status !== "running") return;

  const head = state.snake[0];

  if (isSelfCollision(state, head)) {
    return gameOver(state);
  }

  if (!state.world.wrapEdges) {
    if (isWallCollision(state, head)) {
      return gameOver(state);
    }
  }

  if (isObstacleCollision(state, head)) {
    return gameOver(state);
  }
}

function isSelfCollision(state, head) {
  return state.snake.some((segment, index) => {
    if (index === 0) return false;
    return segment.x === head.x && segment.y === head.y;
  });
}

function isWallCollision(state, head) {
  return head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows;
}

function isObstacleCollision(state, head) {
  if (!state.world?.walls?.length) return false;
  return state.world.walls.some(
    (wall) => wall.x === head.x && wall.y === head.y
  );
}

export function gameOver(state) {
  const diff = state.difficulty;
  const currentHigh = state.highScore[diff] || 0;
  const newHighScore = {
    ...state.highScore,
    [diff]: Math.max(currentHigh, state.score),
  };
  stopLoop();
  setState({
    ...state,
    status: "gameover",
    highScore: newHighScore,
  });
}
