import { BoardConfigLibrary } from "./types";

export const boardConfigLibrary: BoardConfigLibrary = {
  "classic": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 40, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: 99, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null },
  },
  "multimines": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: Infinity, negMineCount: 0, maxMinesPerCell: 3, cellNumberDeviant: null },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: Infinity, negMineCount: 0, maxMinesPerCell: 3, cellNumberDeviant: null },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: Infinity, negMineCount: 0, maxMinesPerCell: 3, cellNumberDeviant: null },
  },
  "liar": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "lie" },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 40, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "lie" },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: 99, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "lie" },
  },
  "omega": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 5, negMineCount: 5, maxMinesPerCell: 1, cellNumberDeviant: null },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 20, negMineCount: 20, maxMinesPerCell: 1, cellNumberDeviant: null },
    "exp": { width: 30, height: 16, mineTileCount: 90, posMineCount: 45, negMineCount: 45, maxMinesPerCell: 1, cellNumberDeviant: null },
  },
  "crossed": {
    "beg": { width: 9, height: 9, mineTileCount: 12, posMineCount: 12, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "cross" },
    "int": { width: 16, height: 16, mineTileCount: 50, posMineCount: 50, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "cross" },
    "exp": { width: 30, height: 16, mineTileCount: 120, posMineCount: 120, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "cross" },
  },
  "knight": {
    "beg": { width: 9, height: 9, mineTileCount: 12, posMineCount: 12, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "knight" },
    "int": { width: 16, height: 16, mineTileCount: 45, posMineCount: 45, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "knight" },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: 99, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "knight" },
  },
};

export const variantMap = {
  classic: "Classic",
  multimines: "Multimines",
  liar: "Liar",
  omega: "Omega",
  crossed: "Crossed",
  knight: "Knight's Path"
}

export const difficultyMap = {
  beg: { full: "Beginner", short: "Beg" },
  int: { full: "Intermediate", short: "Int" },
  exp: { full: "Expert", short: "Exp" },
};
