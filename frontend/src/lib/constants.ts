import { BoardConfigLibrary, VariantGroupName, VariantName } from "./types";

export type VariantOption = {
  value: VariantName;
  label: string;
};

export type VariantGroup = {
  group: VariantGroupName;
  label: string;
  items: VariantOption[];
};

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
  "omega": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 5, negMineCount: 5, maxMinesPerCell: 1, cellNumberDeviant: null },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 20, negMineCount: 20, maxMinesPerCell: 1, cellNumberDeviant: null },
    "exp": { width: 30, height: 16, mineTileCount: 90, posMineCount: 45, negMineCount: 45, maxMinesPerCell: 1, cellNumberDeviant: null },
  },
  "liar": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "lie" },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 40, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "lie" },
    "exp": { width: 30, height: 16, mineTileCount: 99, posMineCount: 99, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "lie" },
  },
  "amplified": {
    "beg": { width: 9, height: 9, mineTileCount: 12, posMineCount: 12, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "amplified" },
    "int": { width: 16, height: 16, mineTileCount: 55, posMineCount: 55, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "amplified" },
    "exp": { width: 30, height: 16, mineTileCount: 130, posMineCount: 130, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "amplified" },
  },
  "contrast": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "contrast" },
    "int": { width: 16, height: 16, mineTileCount: 40, posMineCount: 40, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "contrast" },
    "exp": { width: 30, height: 16, mineTileCount: 90, posMineCount: 90, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "contrast" },
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
  "compass": {
    "beg": { width: 9, height: 9, mineTileCount: 10, posMineCount: 10, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "compass" },
    "int": { width: 16, height: 16, mineTileCount: 50, posMineCount: 50, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "compass" },
    "exp": { width: 30, height: 16, mineTileCount: 125, posMineCount: 125, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: "compass" },
  },
  "domino": {
    "beg": { width: 9, height: 9, mineTileCount: 14, posMineCount: 14, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null, mineGenDeviant: "domino" },
    "int": { width: 16, height: 16, mineTileCount: 60, posMineCount: 60, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null, mineGenDeviant: "domino" },
    "exp": { width: 30, height: 16, mineTileCount: 120, posMineCount: 120, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null, mineGenDeviant: "domino" },
  },
  "scattered": {
    "beg": { width: 9, height: 9, mineTileCount: 12, posMineCount: 12, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null, mineGenDeviant: "scattered" },
    "int": { width: 16, height: 16, mineTileCount: 50, posMineCount: 50, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null, mineGenDeviant: "scattered" },
    "exp": { width: 30, height: 16, mineTileCount: 120, posMineCount: 120, negMineCount: 0, maxMinesPerCell: 1, cellNumberDeviant: null, mineGenDeviant: "scattered" },
  },
};

export const variantMap: Record<VariantName, string> = {
  classic: "Classic",
  multimines: "Multimines",
  omega: "Omega",
  liar: "Liar",
  amplified: "Amplified",
  contrast: "Contrast",
  crossed: "Crossed",
  knight: "Knight's Path",
  compass: "Compass",
  domino: "Domino",
  scattered: "Scattered",
};

export const variantGroups: VariantGroup[] = [
  {
    group: "none",
    label: "Classic",
    items: [{ value: "classic", label: variantMap.classic }],
  },
  {
    group: "mine-types",
    label: "Different mine types",
    items: [
      { value: "multimines", label: variantMap.multimines },
      { value: "omega", label: variantMap.omega },
    ],
  },
  {
    group: "number-scheme",
    label: "Different number scheme",
    items: [
      { value: "liar", label: variantMap.liar },
      { value: "amplified", label: variantMap.amplified },
      { value: "contrast", label: variantMap.contrast },
      { value: "crossed", label: variantMap.crossed },
      { value: "knight", label: variantMap.knight },
      { value: "compass", label: variantMap.compass },
    ],
  },
  {
    group: "mine-generation",
    label: "Different mine generation",
    items: [
      { value: "domino", label: variantMap.domino },
      { value: "scattered", label: variantMap.scattered },
    ],
  },
];

export const difficultyMap = {
  beg: { full: "Beginner", short: "Beg" },
  int: { full: "Intermediate", short: "Int" },
  exp: { full: "Expert", short: "Exp" },
};
