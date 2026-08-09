import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";

type CellPredicate = (row: number, col: number) => boolean;
type CellAction = (row: number, col: number) => void;

type MinesweeperControlsOptions = {
  disabled?: boolean;
  isTouchscreen?: boolean;
  touchHoldDelay?: number;
  isFlagToggled?: boolean;
  chordingMode?: "lmb" | "l+rmb";
  canReveal: CellPredicate;
  canFlag: CellPredicate;
  canChord: CellPredicate;
  canTouchChord?: CellPredicate;
  onReveal: CellAction;
  onFlag: CellAction;
  onChord: CellAction;
};

export const useMinesweeperControls = ({
  disabled = false,
  isTouchscreen = false,
  touchHoldDelay = 200,
  isFlagToggled = false,
  chordingMode = "lmb",
  canReveal,
  canFlag,
  canChord,
  canTouchChord = canChord,
  onReveal,
  onFlag,
  onChord,
}: MinesweeperControlsOptions) => {
  const [isLmbDown, setIsLmbDown] = useState(false);
  const [isRmbDown, setIsRmbDown] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const DRAG_THRESHOLD = 10;
  const touchHoldTimerRef = useRef<number | null>(null);
  const touchHoldFiredRef = useRef(false);

  const clearTouchHoldTimer = () => {
    if (touchHoldTimerRef.current !== null) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  };

  const handleMouseDown = (
    e: MouseEvent,
    row: number,
    col: number,
  ) => {
    if (disabled || isTouchscreen) {
      return;
    }

    if (e.button === 1) {
      e.preventDefault();
    }

    if (e.button === 0) {
      setIsLmbDown(true);
    } else if (e.button === 2) {
      setIsRmbDown(true);
      if (canFlag(row, col)) {
        onFlag(row, col);
      }
    }
  };

  const handleMouseUp = (e: MouseEvent, row: number, col: number) => {
    if (disabled || isTouchscreen) {
      return;
    }

    if (e.button === 0) {
      setIsLmbDown(false);
      if (canReveal(row, col)) {
        onReveal(row, col);
      }
      if (chordingMode === 'lmb' || (chordingMode === 'l+rmb' && isRmbDown)) {
        if (canChord(row, col)) {
          onChord(row, col);
        }
      }
    } else if (e.button === 1) {
      if (canChord(row, col)) {
        onChord(row, col);
      }
    } else if (e.button === 2) {
      setIsRmbDown(false);
    }
  };

  const handleTouchStart = (e: TouchEvent, row: number, col: number) => {
    if (disabled || !isTouchscreen) {
      return;
    }

    clearTouchHoldTimer();
    touchHoldFiredRef.current = false;

    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });

    touchHoldTimerRef.current = window.setTimeout(() => {
      touchHoldFiredRef.current = true;

      if (!isFlagToggled && canFlag(row, col)) {
        onFlag(row, col);
        return;
      }

      if (canReveal(row, col)) {
        onReveal(row, col);
      }
    }, touchHoldDelay);

    return;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !isTouchscreen) {
      return;
    }

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.x);
    const dy = Math.abs(touch.clientY - touchStartPos.y);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      clearTouchHoldTimer();
    }
  };

  const handleTouchEnd = (e: TouchEvent, row: number, col: number) => {
    if (disabled || !isTouchscreen) {
      return;
    }

    clearTouchHoldTimer();
    if (touchHoldFiredRef.current) {
      touchHoldFiredRef.current = false;
      return;
    }

    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.x);
    const dy = Math.abs(touch.clientY - touchStartPos.y);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      return;
    }

    if (canTouchChord(row, col)) {
      onChord(row, col);
      return;
    }

    if (isFlagToggled) {
      if (canFlag(row, col)) {
        onFlag(row, col);
      }
      return;
    }

    if (canReveal(row, col)) {
      onReveal(row, col);
    }
    return;
  };

  const resetControls = () => {
    setIsLmbDown(false);
    setIsRmbDown(false);
    clearTouchHoldTimer();
    touchHoldFiredRef.current = false;
  };

  useEffect(() => clearTouchHoldTimer, []);

  return {
    isLmbDown,
    isRmbDown,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetControls,
  };
};
