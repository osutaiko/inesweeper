import { Board, BoardConfig, Cell } from "../types";

// Snapped angles to display for compass mode
export const COMPASS_ANGLES = Array.from({ length: 32 }, (_, index) => {
  // Although the mathematically accurate angles include ~9.7356°
  // just display it as 360/32 = 11.25° for clarity
  return index * Math.PI / 16;
});

// Chebyshev distance helper for Nearest-2 mode
const getChebyshevDistance = (fromRow: number, fromCol: number, toRow: number, toCol: number) =>
  Math.max(Math.abs(fromRow - toRow), Math.abs(fromCol - toCol));

// List of distances helper for Nearest-2 mode
export const getNearestMineDistances = (board: Board, row: number, col: number): [number, number] | null => {
  const distances: number[] = [];

  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j].mineNum !== 0) {
        distances.push(getChebyshevDistance(row, col, i, j));
      }
    }
  }

  distances.sort((a, b) => a - b);

  if (distances.length < 2) {
    return null;
  }

  return [distances[0], distances[1]];
};

// Helper for iterating neighbors around a cell
// Usage: iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => { stuff with (side) effects })
export const iterateNeighbors = (
  board: Board,
  row: number,
  col: number,
  config: BoardConfig,
  callback: (nx: number, ny: number, neighbor: Cell) => void
) => {
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (config.cellNumberDeviant === "cross" && dx * dy !== 0) continue;
      if (config.cellNumberDeviant === "knight" && !(dx * dy === -2 || dx * dy === 2)) continue;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 1 && config.cellNumberDeviant !== "knight" && config.cellNumberDeviant !== "cross") continue;

      const nx = row + dx;
      const ny = col + dy;

      if (nx >= 0 && nx < config.height && ny >= 0 && ny < config.width) {
        callback(nx, ny, board[nx][ny]);
      }
    }
  }
};

// Helper to convert given vector sum to arrow index
export const getCompassAngleIndex = (x: number, y: number): number | null => {
  const EPSILON = 1e-8
  if (Math.abs(x) < EPSILON && Math.abs(y) < EPSILON) return null;

  // Vector to angle
  const angle = Math.atan2(y, x);

  // Convert negative inclusive angles to [0, 2pi)
  const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);

  // Angle to bin
  return Math.round(normalizedAngle / (Math.PI / 16)) % 32;
};

// Helper to iterate neighbors in compass mode considering normalization
export const iterateCompassNeighbors = (
  board: Board,
  row: number,
  col: number,
  config: BoardConfig,
  callback: (x: number, y: number, neighbor: Cell) => void
) => {
  iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
    const dx = nx - row;
    const dy = ny - col;
    const weight = dx === 0 || dy === 0 ? 1 : Math.SQRT1_2;

    callback(-dx * weight, dy * weight, neighbor);
  });
};
