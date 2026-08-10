import { Board, BoardConfig, Cell } from "../types";

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
