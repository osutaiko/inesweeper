import { Board, BoardConfig, Cell } from "./types";

// Although the mathematically accurate angles include ~9.7356° just display it as 360/32 = 11.25°
export const COMPASS_ANGLES = Array.from({ length: 32 }, (_, index) => {
  return index * Math.PI / 16;
});

const cloneBoard = (board: Board) => board.map(row => [...row]);

const getCompassAngleIndex = (x: number, y: number) =>
  Math.round(((Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 16)) % 32;

const placeMines = (board: Board, config: BoardConfig) => {
  let placedPosMines = 0;
  let placedNegMines = 0;
  const totalTilesWithMines = config.mineTileCount;
  const maxMinesPerCell = config.maxMinesPerCell;

  const tilesWithMines: number[][] = [];
  if (config.mineGenDeviant === "domino") {
    const blocked: number[][] = [];
    const has = (coords: number[][], x: number, y: number) =>
      coords.some(([cx, cy]) => cx === x && cy === y);

    const blockAround = (x: number, y: number) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          blocked.push([x + dx, y + dy]);
        }
      }
    };

    const edges = board
      .flatMap((row, y) =>
        row.flatMap((_, x) => [
          ...(x + 1 < config.width ? [[x, y, x + 1, y]] : []),
          ...(y + 1 < config.height ? [[x, y, x, y + 1]] : []),
        ])
      )
      .sort(() => Math.random() - 0.5);

    for (const [x1, y1, x2, y2] of edges) {
      if (tilesWithMines.length === totalTilesWithMines) break;
      if (has(blocked, x1, y1) || has(blocked, x2, y2)) continue;

      blockAround(x1, y1);
      blockAround(x2, y2);

      tilesWithMines.push([x1, y1], [x2, y2]);
    }
  } else if (config.mineGenDeviant === "scattered") {
    const has = (x: number, y: number) =>
      tilesWithMines.some(([tx, ty]) => tx === x && ty === y);

    const canPlace = (x: number, y: number) =>
      !has(x, y) &&
      ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
        has(x + dx, y + dy)
      );

    const cells = board
      .flatMap((row, y) => row.map((_, x) => [x, y] as [number, number]))
      .sort(() => Math.random() - 0.5);

    for (const [x, y] of cells) {
      if (tilesWithMines.length === totalTilesWithMines) break;
      if (canPlace(x, y)) tilesWithMines.push([x, y]);
    }

    if (tilesWithMines.length < totalTilesWithMines) {
      throw new Error("Unable to generate a scattered mine layout.");
    }
  } else {
    while (tilesWithMines.length < totalTilesWithMines) {
      const x = Math.floor(Math.random() * config.width);
      const y = Math.floor(Math.random() * config.height);

      if (!tilesWithMines.some(([tx, ty]) => tx === x && ty === y)) {
        tilesWithMines.push([x, y]);
      }
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

export const handleBeforeFirstClick = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  const cardinalDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const allDirs = [...cardinalDirs, [1, 1], [1, -1], [-1, 1], [-1, -1]];

  if (board[row][col].mineNum !== 0) {
    let newBoard = [...board];

    if (config.mineGenDeviant === "domino") {
      const hasAdjacentMine = (i: number, j: number) =>
        allDirs.some(([dx, dy]) => newBoard[i + dx]?.[j + dy]?.mineNum);
      const partner = cardinalDirs
        .map(([dx, dy]) => [row + dx, col + dy] as [number, number])
        .find(([i, j]) => i >= 0 && i < config.height && j >= 0 && j < config.width && newBoard[i][j].mineNum);

      if (partner) {
        const [pi, pj] = partner;
        const mines = [newBoard[row][col].mineNum, newBoard[pi][pj].mineNum];
        newBoard[row][col].mineNum = 0;
        newBoard[pi][pj].mineNum = 0;

        const edges = newBoard.flatMap((r, i) =>
          r.flatMap((_, j) => [
            ...(j + 1 < config.width ? [[i, j, i, j + 1]] : []),
            ...(i + 1 < config.height ? [[i, j, i + 1, j]] : []),
          ])
        ).sort(() => Math.random() - 0.5) as [number, number, number, number][];

        const spot = edges.find(([i1, j1, i2, j2]) =>
          !(i1 === row && j1 === col) &&
          !(i2 === row && j2 === col) &&
          !hasAdjacentMine(i1, j1) &&
          !hasAdjacentMine(i2, j2)
        );

        if (spot) {
          const [i1, j1, i2, j2] = spot;
          newBoard[i1][j1].mineNum = mines[0];
          newBoard[i2][j2].mineNum = mines[1];
        } else {
          newBoard[row][col].mineNum = mines[0];
          newBoard[pi][pj].mineNum = mines[1];
        }
      }
    } else {
      const mine = newBoard[row][col].mineNum;
      newBoard[row][col].mineNum = 0;

      const emptySquares = [];
      for (let i = 0; i < config.height; i++) {
        for (let j = 0; j < config.width; j++) {
          if (!newBoard[i][j].mineNum && (i !== row || j !== col) 
            && !(config.mineGenDeviant === "scattered" && cardinalDirs.some(([di, dj]) => newBoard[i + di]?.[j + dj]?.mineNum))
          ) {
            emptySquares.push({ i, j });
          }
        }
      }
  
      const randomSquare = emptySquares[Math.floor(Math.random() * emptySquares.length)];
  
      if (randomSquare) {
        newBoard[randomSquare.i][randomSquare.j].mineNum = mine;
      } else {
        newBoard[row][col].mineNum = mine;
      }
    }

    return newBoard;
  }

  return board;
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

export const getCellNumber = (board: Board, row: number, col: number, config: BoardConfig): number | { type: "compass"; angleIndex: number | null } | null => {
  if (config.cellNumberDeviant === "compass") {
    let x = 0;
    let y = 0;
    let mineCount = 0;

    iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.mineNum) {
        const dx = nx - row;
        const dy = ny - col;
        const weight = dx === 0 || dy === 0 ? 1 : Math.SQRT1_2;
        x -= dx * weight;
        y += dy * weight;
        mineCount++;
      }
    });

    if (mineCount === 0) {
      return null;
    }

    if (x === 0 && y === 0) {
      return { type: "compass", angleIndex: null };
    }

    return { type: "compass", angleIndex: getCompassAngleIndex(x, y) };
  }

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

export const handleClick = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  let updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];
  if (cell.state.type !== "hidden") return board;

  const cellNumber = getCellNumber(updatedBoard, row, col, config);
  
  cell.state = { type: "revealed", num: cellNumber };
  if (cell.mineNum !== 0) {
    return updatedBoard;
  }

  if (cell.state.num === null || (cell.state.num === 0 && (config.cellNumberDeviant !== "lie"))) {
    iterateNeighbors(updatedBoard, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.mineNum === 0) {
        updatedBoard = handleClick(updatedBoard, nx, ny, config);
      }
    });
  }

  return updatedBoard;
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

export const handleChord = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  let updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];

  if (cell.state.type !== "revealed") return board;
  if (typeof cell.state.num !== "number") return updatedBoard;

  const revealSurroundingHiddens = () => {
    iterateNeighbors(updatedBoard, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.state.type === "hidden") {
        updatedBoard = handleClick(updatedBoard, nx, ny, config);
      }
    });
  };

  const neighborCounts = getNeighborCounts(board, row, col, config);

  // Chording rules for Liar
  if (config.cellNumberDeviant === "lie") { 
    if (cell.state.num === neighborCounts.flags - 1 || (neighborCounts.hiddens === 1 && cell.state.num === neighborCounts.flags + 1)) {
      revealSurroundingHiddens();
    }
    return updatedBoard;
  }

  // Chording rules for Omega
  if (config.negMineCount > 0) {
    if (neighborCounts.hiddens === 1 && neighborCounts.flags === cell.state.num) {
      revealSurroundingHiddens();
    }
    return updatedBoard;
  }

  // Chording rules for Contrast
  if (config.cellNumberDeviant === "contrast") { 
    if (neighborCounts.flags === cell.state.num) {
      if (neighborCounts.redHiddens === 0 || neighborCounts.blueHiddens === 0) {
        revealSurroundingHiddens();
      }
    }
    return updatedBoard;
  }

  // General chording rule
  if (neighborCounts.flags === cell.state.num) {
    revealSurroundingHiddens();
  }
  return updatedBoard;
};

export const handleFlag = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  const updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];

  if (cell.state.type === "revealed") return board;

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

export const countRemainingFlags = (board: Board): { remainingPosFlags: number; remainingNegFlags: number; remainingFlagTiles: number } => {
  let totalPosMines = 0;
  let totalNegMines = 0;
  let totalMineTiles = 0;
  let placedPosFlags = 0;
  let placedNegFlags = 0;
  let placedFlagTiles = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell.mineNum > 0) {
        totalPosMines += cell.mineNum;
        totalMineTiles++;
      } else if (cell.mineNum < 0) {
        totalNegMines += Math.abs(cell.mineNum);
        totalMineTiles++;
      }

      if (cell.state.type === "flagged") {
        placedFlagTiles++;
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
  const remainingFlagTiles = totalMineTiles - placedFlagTiles;

  return {
    remainingPosFlags: remainingPosFlags,
    remainingNegFlags: remainingNegFlags,
    remainingFlagTiles: remainingFlagTiles,
  };
};

export const extractMinesFromBoard = (board: Board): number[][] => {
  return board.map(row => row.map(cell => cell.mineNum));
};
