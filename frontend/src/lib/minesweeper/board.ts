import { Board, Cell } from "../types";

// Win condition
// check: all non-mine cells should be revealed
export const isWin = (board: Board): boolean => {
  return board.every(row =>
    row.every(cell =>
      (cell.mineNum === 0 && cell.state.type === "revealed") || 
      cell.mineNum !== 0
    )
  );
};

// Loss condition
// check: a mine cell is revealed
export const isLoss = (board: Board): { row: number; col: number } | null => {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col];
      if (cell.mineNum !== 0 && cell.state.type === "revealed") {
        return { row, col };
      }
    }
  }
  return null;
};

// Flag all mines (usually after win)
export const flagAllMines = (
  board: Board,
  isInArea: (row: number, col: number) => boolean = () => true,
): Board =>
  board.map((row, rowIndex) =>
    row.map((cell, colIndex) =>
      isInArea(rowIndex, colIndex) && cell.mineNum !== 0
        ? {
            state: { type: "flagged", flagNum: cell.mineNum },
            mineNum: cell.mineNum,
          } as Cell
        : cell,
    ),
  );

// Get remaining unflagged tile (mine) stats for display in GameBoard header
export const countRemainingFlags = (board: Board): {
  remainingPosFlags: number;
  remainingNegFlags: number;
  remainingFlagTiles: number;
  remainingRedFlags: number;
  remainingYellowFlags: number;
  remainingBlueFlags: number;
} => {
  const totals = { pos: 0, neg: 0, tiles: 0, red: 0, yellow: 0, blue: 0 };
  const placed = { pos: 0, neg: 0, tiles: 0, red: 0, yellow: 0, blue: 0 };

  for (const row of board) {
    for (const cell of row) {
      if (cell.mineNum > 0) {
        totals.pos += cell.mineNum;
        totals.tiles++;
        if (cell.mineNum === 1) {
          totals.red++;
        } else if (cell.mineNum === 2) {
          totals.yellow++;
        } else if (cell.mineNum === 3) {
          totals.blue++;
        }
      } else if (cell.mineNum < 0) {
        totals.neg += Math.abs(cell.mineNum);
        totals.tiles++;
      }

      if (cell.state.type === "flagged") {
        placed.tiles++;
        if (cell.state.flagNum > 0) {
          placed.pos += cell.state.flagNum;
          if (cell.state.flagNum === 1) {
            placed.red++;
          } else if (cell.state.flagNum === 2) {
            placed.yellow++;
          } else if (cell.state.flagNum === 3) {
            placed.blue++;
          }
        } else {
          placed.neg += Math.abs(cell.state.flagNum);
        }
      }
    }
  }

  const remainingPosFlags = totals.pos - placed.pos;
  const remainingNegFlags = totals.neg - placed.neg;
  const remainingFlagTiles = totals.tiles - placed.tiles;
  const remainingRedFlags = totals.red - placed.red;
  const remainingYellowFlags = totals.yellow - placed.yellow;
  const remainingBlueFlags = totals.blue - placed.blue;

  return {
    remainingPosFlags: remainingPosFlags,
    remainingNegFlags: remainingNegFlags,
    remainingFlagTiles: remainingFlagTiles,
    remainingRedFlags: remainingRedFlags,
    remainingYellowFlags: remainingYellowFlags,
    remainingBlueFlags: remainingBlueFlags,
  };
};

// Get list of mine coordinates in board
export const extractMinesFromBoard = (board: Board): number[][] => {
  return board.map(row => row.map(cell => cell.mineNum));
};
