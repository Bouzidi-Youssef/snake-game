const STORAGE_KEY = 'snake_stage_progress';

export function parseWallMap(rows) {
  const walls = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        walls.push({ x, y });
      }
    }
  });
  return walls;
}

export function getStageProgress() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    const n = parseInt(val, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveStageProgress(index) {
  try {
    localStorage.setItem(STORAGE_KEY, String(index));
  } catch {}
}

export function clearStageProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
