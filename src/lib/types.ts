export type VariantName = "classic" | "multimines" | "liar" | "omega" | "amplified" | "contrast" | "crossed" | "knight";
export type DifficultyName = "beg" | "int" | "exp";

export type BoardConfig = {
  width: number;
  height: number;
  maxMinesPerCell: number;
  mineTileCount: number;
  posMineCount: number;
  negMineCount: number;
  cellNumberDeviant: "lie" | "amplified" | "contrast" | "cross" | "knight" | null;
};

export type BoardConfigLibrary = {
  [key in VariantName]: {
    [key in DifficultyName]: BoardConfig;
  }
};

export type Cell = {
  state: { type: "hidden"; } 
       | { type: "revealed"; num: number | null; } 
       | { type: "flagged"; flagNum: number; };
  mineNum: number;
};

export type Board = Cell[][];

export type TimeRecord = {
  boardConfig: BoardConfig;
  timeElapsed: number;
  date: number;
  mineArray: number[][];
}
