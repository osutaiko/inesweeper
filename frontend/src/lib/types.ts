export type VariantName = 
  | "classic"
  | "multimines" | "omega" | "colors"
  | "liar" | "amplified" | "contrast" | "crossed" | "knight" | "compass" | "nearest2"
  | "domino" | "scattered";
export type VariantGroupName = "none" | "mine-types" | "number-scheme" | "mine-generation";
export type DifficultyName = "beg" | "int" | "exp";

export type BoardConfig = {
  width: number;
  height: number;
  maxMinesPerCell: number;
  mineTileCount: number;
  posMineCount: number;
  negMineCount: number;
  mineTypeDeviant?: "rgb";
  cellNumberDeviant: "lie" | "amplified" | "contrast" | "cross" | "knight" | "compass" | "nearest2" | null;
  mineGenDeviant?: "domino" | "scattered" | null;
};

export type BoardConfigLibrary = {
  [key in VariantName]: {
    [key in DifficultyName]: BoardConfig;
  }
};

export type Cell = {
  state: { type: "hidden"; } 
       | { type: "revealed"; num: number | { type: "compass"; angleIndex: number | null } | { type: "nearest2"; distances: [number, number] } | { type: "colors"; mask: number } | null; } 
       | { type: "flagged"; flagNum: number; };
  mineNum: number;
};

export type Board = Cell[][];

export type TimeRecord = {
  boardConfig: BoardConfig;
  timeElapsed: number;
  date: number;
  mineArray: number[][];
};
