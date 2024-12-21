import { Board, BoardConfig, BoardConfigLibrary, Cell, DifficultyName, VariantName } from "./types";

export const boardConfigLibrary: BoardConfigLibrary = {
  "classic": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1 },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 40, negMineCount: 0, maxMinesPerCell: 1 },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: 99, negMineCount: 0, maxMinesPerCell: 1 },
  },
  "multimines": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: Infinity, negMineCount: 0, maxMinesPerCell: 4 },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: Infinity, negMineCount: 0, maxMinesPerCell: 4 },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: Infinity, negMineCount: 0, maxMinesPerCell: 4 },
  },
  "liar": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1 },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 40, negMineCount: 0, maxMinesPerCell: 1 },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: 99, negMineCount: 0, maxMinesPerCell: 1 },
  },
  "omega": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 5, negMineCount: 5, maxMinesPerCell: 1 },
    "int": { width: 16, height: 16, mineTileCount: 36, posMineCount: 18, negMineCount: 18, maxMinesPerCell: 1 },
    "exp": { width: 30, height: 16, mineTileCount: 90, posMineCount: 45, negMineCount: 45, maxMinesPerCell: 1 },
  },
};

const placeMines = (board: Board, config: BoardConfig) => {
  let placedPosMines = 0;
  let placedNegMines = 0;
  const totalTilesWithMines = config.mineTileCount;
  const maxMinesPerCell = config.maxMinesPerCell;

  const tilesWithMines: number[][] = [];
  while (tilesWithMines.length < totalTilesWithMines) {
    const x = Math.floor(Math.random() * config.width);
    const y = Math.floor(Math.random() * config.height);

    if (!tilesWithMines.some(([tx, ty]) => tx === x && ty === y)) {
      tilesWithMines.push([x, y]);
    }
  }

  for (const [x, y] of tilesWithMines) {
    const totalMines = Math.floor(Math.random() * maxMinesPerCell) + 1;

    const posMines = Math.min(totalMines, config.posMineCount - placedPosMines);
    const negMines = Math.min(totalMines - posMines, config.negMineCount - placedNegMines);

    placedPosMines += posMines;
    placedNegMines += negMines;

    board[y][x].mineNum = posMines - negMines;
  }
};

export const createBoard = (config: BoardConfig): Cell[][] | undefined => {
  const board: Board = Array.from({ length: config.height }, () =>
    Array.from({ length: config.width }, () => ({
      state: { type: "hidden" },
      mineNum: 0,
    }))
  );

  placeMines(board, config);
  return board;
};

const isWin = (board: Board): boolean => {
  return board.every(row =>
    row.every(cell =>
      (cell.state.type === "revealed" && cell.mineNum === 0) || 
      (cell.state.type === "flagged" && cell.state.flagNum !== 0 && cell.mineNum !== 0)
    )
  );
};

const isLoss = (board: Board): boolean => {
  return board.some(row =>
    row.some(cell =>
      cell.state.type === "revealed" && cell.mineNum !== 0
    )
  );
};

export const getCellNumber = (board: Board, row: number, col: number, config: BoardConfig): number | null => {
  let cellNumber = null;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;

      const nx = row + dx;
      const ny = col + dy;

      if (nx >= 0 && nx < config.height && ny >= 0 && ny < config.width) {
        if (board[nx][ny].mineNum) {
          if (cellNumber === null) {
            cellNumber = 0;
          }
          cellNumber += board[nx][ny].mineNum;
        }
      }
    }
  }

  return cellNumber;
};

export const handleClick = (board: Board, row: number, col: number, config: BoardConfig) => {
  const cell = board[row][col];
  if (cell.state.type !== "hidden") return;
  
  cell.state = { type: "revealed" };
  
  const cellNumber = getCellNumber(board, row, col, config);

  if (cellNumber === null) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = row + dx;
        const ny = col + dy;
        if (nx >= 0 && nx < config.height && ny >= 0 && ny < config.width) {
          handleClick(board, nx, ny, config);
        }
      }
    }
  }
};

export const handleChord = (board: Board, row: number, col: number, config: BoardConfig) => {
  const cell = board[row][col];

  if (cell.state.type !== "revealed") return;

  let surroundingFlags = 0;

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const nx = row + dx;
      const ny = col + dy;
      if (nx >= 0 && nx < config.height && ny >= 0 && ny < config.width) {
        const neighbor = board[nx][ny];
        if (neighbor.state.type === "flagged") {
          surroundingFlags += neighbor.state.flagNum;
        }
      }
    }
  }

  const cellNumber = getCellNumber(board, row, col, config);

  if (surroundingFlags === cellNumber) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = row + dx;
        const ny = col + dy;
        if (nx >= 0 && nx < config.height && ny >= 0 && ny < config.width) {
          if (board[nx][ny].state.type === "hidden") {
            handleClick(board, nx, ny, config);
          }
        }
      }
    }
  }

  return false;
};

export const handleFlag = (board: Board, row: number, col: number, config: BoardConfig) => {
  const cell = board[row][col];
  if (cell.state.type === "revealed") return;

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
};
