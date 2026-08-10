export { COMPASS_ANGLES } from "./neighbors";
export { createBoard, handleBeforeFirstClick } from "./generation";
export {
  countRemainingFlags,
  extractMinesFromBoard,
  flagAllMines,
  isLoss,
  isWin,
} from "./board";
export { getCellNumber } from "./numbers";
export { handleClick, handleChord, handleFlag } from "./actions";
export { iterateNeighbors } from "./neighbors";
