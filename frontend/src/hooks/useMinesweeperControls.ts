import { useState, type MouseEvent } from "react";

type CellPredicate = (row: number, col: number) => boolean;
type CellAction = (row: number, col: number) => void;

type MinesweeperControlsOptions = {
  disabled?: boolean;
  canReveal: CellPredicate;
  canFlag: CellPredicate;
  canChord: CellPredicate;
  onReveal: CellAction;
  onFlag: CellAction;
  onChord: CellAction;
};

export const useMinesweeperControls = ({
  disabled = false,
  canReveal,
  canFlag,
  canChord,
  onReveal,
  onFlag,
  onChord,
}: MinesweeperControlsOptions) => {
  const [isLmbDown, setIsLmbDown] = useState(false);
  const [isRmbDown, setIsRmbDown] = useState(false);

  const onMouseDown = (
    event: MouseEvent,
    row: number,
    col: number,
  ) => {
    if (disabled) {
      return;
    }

    if (event.button === 0) {
      setIsLmbDown(true);
    } else if (event.button === 2) {
      setIsRmbDown(true);

      if (!isLmbDown && canFlag(row, col)) {
        onFlag(row, col);
      }
    }
  };

  const onMouseUp = (event: MouseEvent, row: number, col: number) => {
    if (disabled) {
      return;
    }

    if (event.button === 0) {
      setIsLmbDown(false);

      if (isRmbDown && canChord(row, col)) {
        onChord(row, col);
      } else if (canReveal(row, col)) {
        onReveal(row, col);
      }
    } else if (event.button === 1) {
      if (canChord(row, col)) {
        onChord(row, col);
      }
    } else if (event.button === 2) {
      setIsRmbDown(false);

      if (isLmbDown && canChord(row, col)) {
        onChord(row, col);
      }
    }
  };

  const resetControls = () => {
    setIsLmbDown(false);
    setIsRmbDown(false);
  };

  return {
    isLmbDown,
    isRmbDown,
    onMouseDown,
    onMouseUp,
    resetControls,
  };
};
