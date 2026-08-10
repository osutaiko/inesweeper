import { Board, BoardConfig } from "../types";
import { getCompassAngleIndex, getNearestMineDistances, iterateCompassNeighbors, iterateNeighbors } from "./neighbors";

// Calculate cell number by looking up neighbor mines
export const getCellNumber = (board: Board, row: number, col: number, config: BoardConfig): number | { type: "compass"; angleIndex: number | null } | { type: "nearest2"; distances: [number, number] } | null => {
  //#region getCellNumber::Colors
  if (config.mineTypeDeviant === "rgb") {
    let colorMask = 0;

    iterateNeighbors(board, row, col, config, (_, __, neighbor) => {
      if (neighbor.mineNum === 1) colorMask |= 1;
      else if (neighbor.mineNum === 2) colorMask |= 2;
      else if (neighbor.mineNum === 3) colorMask |= 4;
    });

    return colorMask ? { type: "colors", mask: colorMask } : null;
  }
  //#endregion

  //#region getCellNumber::Compass
  // Vector sum of neighboring mines
  // Treat all neighbors with equal weight - normalize with *SQRT1_2 for diagonals
  if (config.cellNumberDeviant === "compass") {
    let x = 0;
    let y = 0;
    let mineCount = 0;

    iterateCompassNeighbors(board, row, col, config, (vectorX, vectorY, neighbor) => {
      if (neighbor.mineNum) {
        x += vectorX;
        y += vectorY;
        mineCount++;
      }
    });

    // Return blank
    if (mineCount === 0) {
      return null;
    }

    // If vector sum is (0, 0) return dot (index=null)
    if (x === 0 && y === 0) {
      return { type: "compass", angleIndex: null };
    }
    
    // Compass angle bins as indices, from vector sum
    // 0 = 0Â°, 1 = 9.74Â°, ..., 4 = 45Â°, ..., 8 = 90Â°, ..., 31 = 348.75Â°
    return { type: "compass", angleIndex: getCompassAngleIndex(x, y) };
  }
  //#endregion

  //#region getCellNumber::Nearest-2
  if (config.cellNumberDeviant === "nearest2") {
    const distances = getNearestMineDistances(board, row, col);
    return distances ? { type: "nearest2", distances } : null;
  }
  //#endregion

  let cellNumber: number | null = null;

  iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
    if (neighbor.mineNum) {
      if (cellNumber === null) {
        cellNumber = 0;
      }
      
      //#region getCellNumber::Amplified
      if (config.cellNumberDeviant === "amplified") {
        // Double count red cells
        cellNumber += (nx + ny) % 2 === 1 ? neighbor.mineNum * 2 : neighbor.mineNum;
      }
      //#endregion
      
      //#region getCellNumber::Contrast
      else if (config.cellNumberDeviant === "contrast") {
        // Decrement blue cells
        cellNumber += (nx + ny) % 2 === 1 ? neighbor.mineNum : -neighbor.mineNum;
      }
      //#endregion
      
      else {
        cellNumber += neighbor.mineNum;
      }
    }
  });

  //#region getCellNumber::Lie
  if (config.cellNumberDeviant === "lie" && cellNumber !== null) {
    // Randomly +/-1 true number
    cellNumber = Math.random() < 0.5 ? cellNumber - 1 : cellNumber + 1;
  }
  //#endregion

  //#region getCellNumber::Contrast
  if (config.cellNumberDeviant === "contrast" && cellNumber !== null) {
    cellNumber = Math.abs(cellNumber);
  }
  //#endregion

  return cellNumber;
};
