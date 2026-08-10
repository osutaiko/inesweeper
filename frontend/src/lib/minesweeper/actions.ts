import { Board, BoardConfig } from "../types";
import { getCellNumber } from "./numbers";
import { getCompassAngleIndex, iterateCompassNeighbors, iterateNeighbors } from "./neighbors";

// Shallow copy board helper
const cloneBoard = (board: Board) => board.map(row => [...row]);  

// Click action for reveal
export const handleClick = (board: Board, row: number, col: number, config: BoardConfig, canReveal?: (row: number, col: number) => boolean): Board => {
  let updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];
  if (cell.state.type !== "hidden" || canReveal?.(row, col) === false) return board;

  const cellNumber = getCellNumber(updatedBoard, row, col, config);
  
  // Always reveal cell
  cell.state = { type: "revealed", num: cellNumber };

  // If clicked on a mine, return immediately to face doom
  if (cell.mineNum !== 0) {
    return updatedBoard;
  }

  // If clicked on a safe file, check if num===null (opening)
  // Also treat explicit zeros as an opening for most modes
  const canAutoOpen =
    cell.state.num === null ||
    (cell.state.num === 0 && config.cellNumberDeviant !== "lie") ||
    (config.cellNumberDeviant === "nearest2" &&
      typeof cell.state.num === "object" &&
      cell.state.num.type === "nearest2" &&
      cell.state.num.distances[0] > 1);

  if (canAutoOpen) {
    // Recursively reveal all neighbors of null tiles
    iterateNeighbors(updatedBoard, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.mineNum === 0) {
        updatedBoard = handleClick(updatedBoard, nx, ny, config, canReveal);
      }
    });
  }

  return updatedBoard;
};

// Get neighbor stats for a given cell - helper for chording logic
export const getNeighborCounts = (board: Board, row: number, col: number, config: BoardConfig) => {
  let surroundingFlags = 0;
  let surroundingHiddens = 0;
  let surroundingRedHiddens = 0;
  let surroundingBlueHiddens = 0;
  let surroundingRedFlags = 0;
  let surroundingYellowFlags = 0;
  let surroundingBlueFlags = 0;

  iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
    if (neighbor.state.type === "flagged") {
      // Count considering cell modifications (amplified/contrast) at this step
      // to make chording check as easy as possible

      if (config.mineTypeDeviant === "rgb") {
        surroundingFlags++;
        if (neighbor.state.flagNum === 1) {
          surroundingRedFlags++;
        } else if (neighbor.state.flagNum === 2) {
          surroundingYellowFlags++;
        } else if (neighbor.state.flagNum === 3) {
          surroundingBlueFlags++;
        }
      }
      
      //#region getNeighborCounts::Amplified
      else if (config.cellNumberDeviant === "amplified") {
        if ((nx + ny) % 2 === 1) {
          surroundingFlags += neighbor.state.flagNum * 2;
        } else {
          surroundingFlags += neighbor.state.flagNum;
        }
      }
      //#endregion
      
      //#region getNeighborCounts::Contrast
      else if (config.cellNumberDeviant === "contrast") {
        if ((nx + ny) % 2 === 1) {
          surroundingFlags += neighbor.state.flagNum;
        } else {
          surroundingFlags -= neighbor.state.flagNum;
        }
      }
      //#endregion
      
      else {
        surroundingFlags += neighbor.state.flagNum;
      }
    } else if (neighbor.state.type === "hidden") {
      surroundingHiddens++;
      if (config.cellNumberDeviant === "contrast") {
        if ((nx + ny) % 2 === 1) {
          surroundingRedHiddens++;
        } else {
          surroundingBlueHiddens++;
        }
      }
    }
  });

  if (config.cellNumberDeviant === "contrast") {
    surroundingFlags = Math.abs(surroundingFlags);
  }

  return { flags: surroundingFlags, hiddens: surroundingHiddens, redHiddens: surroundingRedHiddens, blueHiddens: surroundingBlueHiddens, redFlags: surroundingRedFlags, yellowFlags: surroundingYellowFlags, blueFlags: surroundingBlueFlags };
};

// Chord action
export const handleChord = (board: Board, row: number, col: number, config: BoardConfig, canReveal?: (row: number, col: number) => boolean): Board => {
  let updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];
  const revealSurroundingHiddens = () => {
    iterateNeighbors(updatedBoard, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.state.type === "hidden") {
        updatedBoard = handleClick(updatedBoard, nx, ny, config, canReveal);
      }
    });
  };

  if (cell.state.type !== "revealed") return board;

  //#region handleChord::Compass
  // Chord if: out of all possible mine arrangements in neighboring hidden cells,
  // only the case of all-safe results in the same arrow
  if (cell.state.num && typeof cell.state.num === "object" && cell.state.num.type === "compass") {
    let flagX = 0;
    let flagY = 0;
    const hiddenVectors: [number, number][] = [];

    // Calculate vector sum of flags as if they are mines
    iterateCompassNeighbors(board, row, col, config, (x, y, neighbor) => {
      if (neighbor.state.type === "flagged") {
        flagX += x * neighbor.state.flagNum;
        flagY += y * neighbor.state.flagNum;
      } else if (neighbor.state.type === "hidden") {
        hiddenVectors.push([x, y]);
      }
    });

    // Only if angle by flags == displayed angle...
    if (getCompassAngleIndex(flagX, flagY) === cell.state.num.angleIndex) {
      let hiddenMineCouldKeepBin = false;
      
      for (let mask = 1; mask < (1 << hiddenVectors.length); mask++) {
        let x = flagX;
        let y = flagY;

        for (let index = 0; index < hiddenVectors.length; index++) {
          if (mask & (1 << index)) {
            x += hiddenVectors[index][0];
            y += hiddenVectors[index][1];
          }
        }

        // Can't chord if some combination of hidden mines results in the same arrow
        if (getCompassAngleIndex(x, y) === cell.state.num.angleIndex) {
          hiddenMineCouldKeepBin = true;
          break;
        }
      }

      if (!hiddenMineCouldKeepBin) {
        revealSurroundingHiddens();
      }
    }

    return updatedBoard;
  }
  //#endregion

  //#region handleChord::Colors
  if (cell.state.num && typeof cell.state.num === "object" && cell.state.num.type === "colors") {
    const neighborCounts = getNeighborCounts(board, row, col, config);
    const expectedRed = cell.state.num.mask & 1 ? 1 : 0;
    const expectedYellow = cell.state.num.mask & 2 ? 1 : 0;
    const expectedBlue = cell.state.num.mask & 4 ? 1 : 0;

    if (
      neighborCounts.flags === expectedRed + expectedYellow + expectedBlue &&
      neighborCounts.redFlags === expectedRed &&
      neighborCounts.yellowFlags === expectedYellow &&
      neighborCounts.blueFlags === expectedBlue
    ) {
      revealSurroundingHiddens();
    }

    return updatedBoard;
  }
  //#endregion

    if (cell.state.num !== null && typeof cell.state.num !== "number") return updatedBoard;
  //#endregion

  const neighborCounts = getNeighborCounts(board, row, col, config);

  //#region getNeighborCounts::Liar
  // - trivial: number one less than flags
  // - trivial: only one hidden neighbor which is obviously not a mine
  if (config.cellNumberDeviant === "lie") { 
    if (cell.state.num === neighborCounts.flags - 1 || (neighborCounts.hiddens === 1 && cell.state.num === neighborCounts.flags + 1)) {
      revealSurroundingHiddens();
    }
    return updatedBoard;
  }
  //#endregion

  //#region getNeighborCounts::Omega
  // - only when trivial: only one hidden neighbor
  // ...since you can't know for sure if the hidden pair of cells are empty or contain a +/- mine pair
  if (config.negMineCount > 0) {
    if (neighborCounts.hiddens === 1 && neighborCounts.flags === cell.state.num) {
      revealSurroundingHiddens();
    }
    return updatedBoard;
  }
  //#endregion

  //#region getNeighborCounts::Contrast
  // - only when trivial: no cells left hidden for either red or blue group
  // ...since you can't know for sure if the hidden pair of cells are empty or contain a red/blue mine pair
  if (config.cellNumberDeviant === "contrast") { 
    if (neighborCounts.flags === cell.state.num) {
      if (neighborCounts.redHiddens === 0 || neighborCounts.blueHiddens === 0) {
        revealSurroundingHiddens();
      }
    }
    return updatedBoard;
  }
  //#endregion

  // In general, chord when neighboring flags equal the displayed number
  if (neighborCounts.flags === (cell.state.num ?? 0)) {
    revealSurroundingHiddens();
  }
  return updatedBoard;
};

// Flag action
export const handleFlag = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  const updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];

  if (cell.state.type === "revealed") return board;

  if (config.mineTypeDeviant === "rgb") {
    if (cell.state.type === "hidden") {
      cell.state = { type: "flagged", flagNum: 1 };
    } else if (cell.state.type === "flagged") {
      cell.state = cell.state.flagNum === 3 ? { type: "hidden" } : { type: "flagged", flagNum: cell.state.flagNum + 1 };
    }

    return updatedBoard;
  }

  // Most variants: hid -> flag -> hid -> ...
  // * Omega: hid -> + -> - -> hid -> ...
  // * Multimines: hid -> 1 -> 2 -> 3 -> hid -> ...

  if (cell.state.type === "hidden") {
    if (config.posMineCount > 0) {
      cell.state = { type: "flagged", flagNum: 1 };
    } else if (config.negMineCount > 0) {
      cell.state = { type: "flagged", flagNum: -1 };
    }
  } else if (cell.state.type === "flagged") {
    const prevFlagNum = cell.state.flagNum;

    if (prevFlagNum > 0) {
      if (prevFlagNum < config.maxMinesPerCell) {
        cell.state = { type: "flagged", flagNum: prevFlagNum + 1 };
      } else {
        if (config.negMineCount > 0) {
          cell.state = { type: "flagged", flagNum: -1 };
        } else {
          cell.state = { type: "hidden" };
        }
      }
    } else {
      if (-prevFlagNum < config.maxMinesPerCell) {
        cell.state = { type: "flagged", flagNum: prevFlagNum - 1 };
      } else {
        cell.state = { type: "hidden" };
      }
    }
  }

  return updatedBoard;
};
