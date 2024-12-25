export type VariantName = "classic" | "multimines" | "liar" | "omega";
export type DifficultyName = "beg" | "int" | "exp";

export type BoardConfig = {
  width: number;
  height: number;
  maxMinesPerCell: number;
  mineTileCount: number;
  posMineCount: number;
  negMineCount: number;
  lie: boolean;
};

export type BoardConfigLibrary = {
  [key in VariantName]: {
    [key in DifficultyName]: BoardConfig;
  }
};

export type CellState = 
  | { type: "hidden"; } 
  | { type: "revealed"; num: number | null; } 
  | { type: "flagged"; flagNum: number; };

export type Cell = {
  state: CellState;
  mineNum: number;
};

export type Board = Cell[][];
