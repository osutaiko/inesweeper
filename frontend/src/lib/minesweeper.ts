import { Board, BoardConfig, Cell } from "./types";

// Snapped angles to display for compass mode
export const COMPASS_ANGLES = Array.from({ length: 32 }, (_, index) => {
  // Although the mathematically accurate angles include ~9.7356°
  // just display it as 360/32 = 11.25° for clarity
  return index * Math.PI / 16;
});

// Shallow copy board helper
const cloneBoard = (board: Board) => board.map(row => [...row]);  

const canPlaceColorMine = (board: Board, row: number, col: number, color: number) => {
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;
      const neighborRow = row + dRow;
      const neighborCol = col + dCol;
      const neighbor = board[neighborRow]?.[neighborCol];

      if (!neighbor || neighbor.mineNum !== 0) continue;

      for (let sRow = -1; sRow <= 1; sRow++) {
        for (let sCol = -1; sCol <= 1; sCol++) {
          if (sRow === 0 && sCol === 0) continue;
          if (board[neighborRow + sRow]?.[neighborCol + sCol]?.mineNum === color) {
            return false;
          }
        }
      }
    }
  }

  return true;
};

// Randomly generate minefield from empty board
const placeMines = (board: Board, config: BoardConfig) => {
  let placedPosMines = 0;
  let placedNegMines = 0;
  const totalTilesWithMines = config.mineTileCount;
  const maxMinesPerCell = config.maxMinesPerCell;

  const tilesWithMines: number[][] = [];

  //#region placeMines::Colors
  if (config.mineTypeDeviant === "rgb") {
    let nextColor: 1 | 2 | 3 = 1;
    let placedColorMines = 0;

    while (placedColorMines < totalTilesWithMines) {
      const row = Math.floor(Math.random() * config.height);
      const col = Math.floor(Math.random() * config.width);

      if (board[row][col].mineNum || !canPlaceColorMine(board, row, col, nextColor)) continue;

      board[row][col].mineNum = nextColor;
      placedColorMines++;
      nextColor = nextColor === 3 ? 1 : ((nextColor + 1) as 1 | 2 | 3);
    }

    return;
  }
  //#endregion

  //#region placeMines::Domino
  if (config.mineGenDeviant === "domino") {
    const blocked: number[][] = [];
    const has = (coords: number[][], x: number, y: number) =>
      coords.some(([cx, cy]) => cx === x && cy === y);

    // Block cells around dominoes
    const blockAround = (x: number, y: number) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          blocked.push([x + dx, y + dy]);
        }
      }
    };

    // Keep list of all "edges" in the whole board and shuffle
    // Iterate through list and place domino if not blocked
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

      // Block adjacent "edges" from the one just placed
      blockAround(x1, y1);
      blockAround(x2, y2);

      tilesWithMines.push([x1, y1], [x2, y2]);
    }
  }
  //#endregion

  //#region placeMines::Scattered
  else if (config.mineGenDeviant === "scattered") {
    const has = (x: number, y: number) =>
      tilesWithMines.some(([tx, ty]) => tx === x && ty === y);

    // Can place mine only if orthogonal neighbors dont have a mine
    const canPlace = (x: number, y: number) =>
      !has(x, y) &&
      ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
        has(x + dx, y + dy)
      );
    
    // Shuffle all cells in board
    // Iterate through list and place mines if canPlace
    const cells = board
      .flatMap((row, y) => row.map((_, x) => [x, y] as [number, number]))
      .sort(() => Math.random() - 0.5);

    for (const [x, y] of cells) {
      if (tilesWithMines.length === totalTilesWithMines) break;
      if (canPlace(x, y)) tilesWithMines.push([x, y]);
    }
  }
  //#endregion

  // Variants without mineGenDeviant
  else {
    while (tilesWithMines.length < totalTilesWithMines) {
      const x = Math.floor(Math.random() * config.width);
      const y = Math.floor(Math.random() * config.height);

      if (!tilesWithMines.some(([tx, ty]) => tx === x && ty === y)) {
        tilesWithMines.push([x, y]);
      }
    }
  }

  for (const [x, y] of tilesWithMines) {
    //#region placeMines::Multimines
    // Randomly assign 1 ~ maxMinesPerCell mines per tileWIthMine
    const totalMines = Math.floor(Math.random() * maxMinesPerCell) + 1;
    //#endregion

    const posMines = Math.min(totalMines, config.posMineCount - placedPosMines);
    
    //#region placeMines::Omega
    const negMines = Math.min(totalMines - posMines, config.negMineCount - placedNegMines);
    //#endregion

    placedPosMines += posMines;
    placedNegMines += negMines;

    board[y][x].mineNum = posMines - negMines;
  }
};

// Chebyshev distance helper for Nearest-2 mode
const getChebyshevDistance = (fromRow: number, fromCol: number, toRow: number, toCol: number) =>
  Math.max(Math.abs(fromRow - toRow), Math.abs(fromCol - toCol));

// List of distances helper for Nearest-2 mode
const getNearestMineDistances = (board: Board, row: number, col: number): [number, number] | null => {
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

// Prepare board ready for play
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

// Called after user inputs first reveal action (LMB/touch)
// Only reposition mine if first click is a mine (for now)
export const handleBeforeFirstClick = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  const cardinalDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const allDirs = [...cardinalDirs, [1, 1], [1, -1], [-1, 1], [-1, -1]];

  // Only if first click is a mine
  if (board[row][col].mineNum !== 0) {
    const newBoard = [...board];
    
    //#region handleBeforeFirstClick::Domino
    if (config.mineGenDeviant === "domino") {
      const hasAdjacentMine = (i: number, j: number) =>
        allDirs.some(([dx, dy]) => newBoard[i + dx]?.[j + dy]?.mineNum);

      // Find partner of the mine hit
      // Luckily this is deterministic as we don't allow dominoes to touch!
      const partner = cardinalDirs
        .map(([dx, dy]) => [row + dx, col + dy] as [number, number])
        .find(([i, j]) => i >= 0 && i < config.height && j >= 0 && j < config.width && newBoard[i][j].mineNum);

      if (partner) {
        const [pi, pj] = partner;
        const mines = [newBoard[row][col].mineNum, newBoard[pi][pj].mineNum];

        // Remove both mines of domino
        // We remove before relocation to allow new domino placement near click
        // ... (otherwise mine density would statistically be biased to be lower around where user first-clicked)
        newBoard[row][col].mineNum = 0;
        newBoard[pi][pj].mineNum = 0;

        // Same logic as placeMines::Domino
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
        } 

        // In higher density boards I found that it sometimes fails to find ANY vaild spot to relocate
        else {
          // Accept defeat
          newBoard[row][col].mineNum = mines[0];
          newBoard[pi][pj].mineNum = mines[1];
        }
      }
    }
    //#endregion

    //#region handleBeforeFirstClick::Colors
    else if (config.mineTypeDeviant === "rgb") {
      const mine = newBoard[row][col].mineNum;
      newBoard[row][col].mineNum = 0;

      const emptySquares = [];

      for (let i = 0; i < config.height; i++) {
        for (let j = 0; j < config.width; j++) {
          if (
            !newBoard[i][j].mineNum &&
            (i !== row || j !== col) &&
            canPlaceColorMine(newBoard, i, j, mine)
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
    //#endregion

    // Variants without mineGenDeviant
    else {
      const mine = newBoard[row][col].mineNum;
      newBoard[row][col].mineNum = 0;

      // Keep list of empty squares and pick one to relocate to
      const emptySquares = [];

      for (let i = 0; i < config.height; i++) {
        for (let j = 0; j < config.width; j++) {
          if (
            !newBoard[i][j].mineNum && (i !== row || j !== col) 
            &&
            //#region handleBeforeFirstClick::Scattered
            // Shouldn't place next to existing mine
            !(config.mineGenDeviant === "scattered" && cardinalDirs.some(([di, dj]) => newBoard[i + di]?.[j + dj]?.mineNum))
            //#endregion
          ) {
            emptySquares.push({ i, j });
          }
        }
      }
  
      const randomSquare = emptySquares[Math.floor(Math.random() * emptySquares.length)];
  
      // Must preserve mineNum of original mine
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
const getCompassAngleIndex = (x: number, y: number): number | null => {
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
const iterateCompassNeighbors = (
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
    // 0 = 0°, 1 = 9.74°, ..., 4 = 45°, ..., 8 = 90°, ..., 31 = 348.75°
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

// Click action for reveal
export const handleClick = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  let updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];
  if (cell.state.type !== "hidden") return board;

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
        updatedBoard = handleClick(updatedBoard, nx, ny, config);
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
export const handleChord = (board: Board, row: number, col: number, config: BoardConfig): Board => {
  let updatedBoard = cloneBoard(board);
  const cell = updatedBoard[row][col];
  const revealSurroundingHiddens = () => {
    iterateNeighbors(updatedBoard, row, col, config, (nx, ny, neighbor) => {
      if (neighbor.state.type === "hidden") {
        updatedBoard = handleClick(updatedBoard, nx, ny, config);
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

  //#region handleChord::Nearest-2
  /* 
  if (typeof cell.state.num === "object" && cell.state.num?.type === "nearest2") {
    let canChord = true;

    iterateNeighbors(updatedBoard, row, col, config, (_, __, neighbor) => {
      if (neighbor.mineNum !== 0 && neighbor.state.type !== "flagged") {
        canChord = false;
      }
    });

    if (canChord) {
      revealSurroundingHiddens();
    }

    return updatedBoard;
  } 
  */
  //#endregion

  if (typeof cell.state.num !== "number") return updatedBoard;
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
  if (neighborCounts.flags === cell.state.num) {
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
