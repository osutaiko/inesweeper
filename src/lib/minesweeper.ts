import { Board, BoardConfig, Cell } from "./types";

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

export const isWin = (board: Board): boolean => {
  return board.every(row =>
    row.every(cell =>
      (cell.mineNum === 0 && cell.state.type === "revealed") || 
      cell.mineNum !== 0
    )
  );
};

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

export const getCellNumber = (board: Board, row: number, col: number, config: BoardConfig): number | null => {
  let cellNumber: number | null = null;

  iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
    if (neighbor.mineNum) {
      if (cellNumber === null) {
        cellNumber = 0;
      }
      if (config.cellNumberDeviant === "amplified") {
        cellNumber += (nx + ny) % 2 === 1 ? neighbor.mineNum * 2 : neighbor.mineNum;
      } else if (config.cellNumberDeviant === "contrast") {
        cellNumber += (nx + ny) % 2 === 1 ? neighbor.mineNum : -neighbor.mineNum;
      } else {
        cellNumber += neighbor.mineNum;
      }
    }
  });

  if (config.cellNumberDeviant === "lie" && cellNumber !== null) {
    cellNumber = Math.random() < 0.5 ? cellNumber - 1 : cellNumber + 1;
  }

  if (config.cellNumberDeviant === "contrast" && cellNumber !== null) {
    cellNumber = Math.abs(cellNumber);
  }

  return cellNumber;
};

export const handleClick = (board: Board, row: number, col: number, config: BoardConfig, setBoard: (updatedBoard: Board) => void) => {
  const updatedBoard = [...board.map(row => [...row])];
  const cell = board[row][col];
  if (cell.state.type !== "hidden") return;

  const cellNumber = getCellNumber(board, row, col, config);
  
  cell.state = { type: "revealed", num: cellNumber };
  if (cell.mineNum !== 0) {
    return;
  }

  if (cell.state.num === null || (cell.state.num === 0 && (config.cellNumberDeviant !== "lie"))) {
    iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.mineNum === 0) {
        handleClick(board, nx, ny, config, setBoard);
      }
    });
  }

  setBoard(updatedBoard);
};

export const getNeighborCounts = (board: Board, row: number, col: number, config: BoardConfig) => {
  let surroundingFlags = 0;
  let surroundingHiddens = 0;
  let surroundingRedHiddens = 0;
  let surroundingBlueHiddens = 0;

  iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
    if (neighbor.state.type === "flagged") {
      if (config.cellNumberDeviant === "amplified") {
        if ((nx + ny) % 2 === 1) {
          surroundingFlags += neighbor.state.flagNum * 2;
        } else {
          surroundingFlags += neighbor.state.flagNum;
        }
      } else if (config.cellNumberDeviant === "contrast") {
        if ((nx + ny) % 2 === 1) {
          surroundingFlags += neighbor.state.flagNum;
        } else {
          surroundingFlags -= neighbor.state.flagNum;
        }
      } else {
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

  return { flags: surroundingFlags, hiddens: surroundingHiddens, redHiddens: surroundingRedHiddens, blueHiddens: surroundingBlueHiddens };
};

export const handleChord = (board: Board, row: number, col: number, config: BoardConfig, setBoard: (updatedBoard: Board) => void) => {
  const updatedBoard = [...board.map(row => [...row])];
  const cell = updatedBoard[row][col];

  if (cell.state.type !== "revealed") return;

  const revealSurroundingHiddens = () => {
    iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.state.type === "hidden") {
        handleClick(board, nx, ny, config, setBoard);
      }
    });
  };

  const neighborCounts = getNeighborCounts(board, row, col, config);

  // Chording rules for Liar
  if (config.cellNumberDeviant === "lie") { 
    if (cell.state.num === neighborCounts.flags - 1 || (neighborCounts.hiddens === 1 && cell.state.num === neighborCounts.flags + 1)) {
      revealSurroundingHiddens();
    }
    setBoard(updatedBoard);
    return;
  }

  // Chording rules for Omega
  if (config.negMineCount > 0) {
    if (neighborCounts.hiddens === 1 && neighborCounts.flags === cell.state.num) {
      revealSurroundingHiddens();
    }
    setBoard(updatedBoard);
    return;
  }

  // Chording rules for Contrast
  if (config.cellNumberDeviant === "contrast") { 
    if (neighborCounts.flags === cell.state.num) {
      if (neighborCounts.redHiddens === 0 || neighborCounts.blueHiddens === 0) {
        revealSurroundingHiddens();
      }
    }
    setBoard(updatedBoard);
    return;
  }

  // General chording rule
  if (neighborCounts.flags === cell.state.num) {
    revealSurroundingHiddens();
  }
  setBoard(updatedBoard);
};

export const handleFlag = (board: Board, row: number, col: number, config: BoardConfig, setBoard: (updatedBoard: Board) => void) => {
  const updatedBoard = [...board.map(row => [...row])];
  const cell = updatedBoard[row][col];

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

  setBoard(updatedBoard);
};

export const countRemainingFlags = (board: Board): { remainingPosFlags: number; remainingNegFlags: number } => {
  let totalPosMines = 0;
  let totalNegMines = 0;
  let placedPosFlags = 0;
  let placedNegFlags = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell.mineNum > 0) {
        totalPosMines += cell.mineNum;
      } else if (cell.mineNum < 0) {
        totalNegMines += Math.abs(cell.mineNum);
      }

      if (cell.state.type === "flagged") {
        if (cell.state.flagNum > 0) {
          placedPosFlags += cell.state.flagNum;
        } else {
          placedNegFlags += Math.abs(cell.state.flagNum);
        }
      }
    }
  }

  const remainingPosFlags = totalPosMines - placedPosFlags;
  const remainingNegFlags = totalNegMines - placedNegFlags;

  return {
    remainingPosFlags: remainingPosFlags,
    remainingNegFlags: remainingNegFlags,
  };
};

export const extractMinesFromBoard = (board: Board): number[][] => {
  return board.map(row => row.map(cell => cell.mineNum));
};
