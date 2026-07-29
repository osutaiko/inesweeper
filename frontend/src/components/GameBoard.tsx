import React, { useState, useEffect, useRef } from "react";
import { Board, BoardConfig, Cell, TimeRecord } from "@/lib/types";
import { createDemoBoard } from "@/lib/constants";
import { createBoard, handleClick, handleChord, handleFlag, handleBeforeFirstClick as updateBoardBeforeFirstClick, isWin, isLoss, countRemainingFlags, extractMinesFromBoard, iterateNeighbors } from "@/lib/minesweeper";
import { formatTimeMs } from "@/lib/utils";

import { Laugh, Meh, Shovel, Skull, Smile } from "lucide-react";
import { Button } from "./ui/button";
import { GameBoardGrid, getColorClass } from "./GameBoardGrid";

export const GameBoard: React.FC<{
  config: BoardConfig;
  zoom: number;
  flagButtonSize: number;
  flagButtonPosition: string;
  touchHoldDelay: number;
  isTouchscreen: boolean;
  addRecord: (record: TimeRecord) => void;
}> = ({ config, zoom, flagButtonSize, flagButtonPosition, touchHoldDelay, isTouchscreen, addRecord }) => {
  const isDemoBoard = false;
  const [board, setBoard] = useState<Board>(isDemoBoard ? createDemoBoard() : (createBoard(config) || []));
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [isLmbDown, setIsLmbDown] = useState(false);
  const [isRmbDown, setIsRmbDown] = useState(false);
  const [isFlagToggled, setIsFlagToggled] = useState(false);
  const [isGameOver, setIsGameOver] = useState<"win" | "loss" | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ row: number, col: number } | null>(null);
  const [shadedCells, setShadedCells] = useState<{ row: number, col: number }[]>([]);
  const [explodedCell, setExplodedCell] = useState<{ row: number, col: number } | null>(null);
  const [incorrectFlagCells, setIncorrectFlagCells] = useState<{ row: number, col: number }[] | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  const DRAG_THRESHOLD = 10;
  const animationFrameRef = useRef<number | null>(null);
  const touchHoldTimerRef = useRef<number | null>(null);
  const touchHoldFiredRef = useRef(false);

  const clearTouchHoldTimer = () => {
    if (touchHoldTimerRef.current !== null) {
      window.clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
  };

  const handleReset = () => {
    const newBoard = createBoard(config);
    setBoard(newBoard || []);
    setIsFirstClick(true);
    setIsLmbDown(false);
    setIsRmbDown(false);
    setIsFlagToggled(false);
    setIsGameOver(null);
    setStartTime(null);
    setTimeElapsed(0);
    setHoveredCell(null);
    setExplodedCell(null);
    setIncorrectFlagCells(null);
    clearTouchHoldTimer();
    touchHoldFiredRef.current = false;
  };

  const handleBeforeFirstClick = (row: number, col: number) => {
    setIsFirstClick(false);
    setStartTime(Date.now());
    
    if (board[row][col].mineNum !== 0) {
      setBoard(updateBoardBeforeFirstClick(board, row, col, config));
    }
  };

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleReset();
      }
    };
  
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [config]);

  useEffect(() => {
    if (isGameOver) return;

    const updateTime = () => {
      if (startTime !== null && !isGameOver) {
        setTimeElapsed(Date.now() - startTime);
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    if (startTime !== null) {
      updateTime();
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startTime, isGameOver]);

  useEffect(() => {
    if (isGameOver) {
      setIsFlagToggled(false);
      return;
    }

    if (isWin(board)) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsGameOver("win");

      // In case UI time drifts from actual ms because of lag
      const correctedElapsed = startTime !== null ? Date.now() - startTime : timeElapsed;
      setTimeElapsed(correctedElapsed);

      const updatedBoard = board.map(row =>
        row.map(cell => {
          if (cell.mineNum !== 0) {
            return {
              state: { type: "flagged", flagNum: cell.mineNum },
              mineNum: cell.mineNum,
            } as Cell;
          }
          return cell;
        })
      );
      setBoard(updatedBoard);

      addRecord({
        boardConfig: config,
        timeElapsed: correctedElapsed,
        date: Date.now(),
        mineArray: extractMinesFromBoard(board),
      });
    }

    const isLossValue = isLoss(board);
    if (isLossValue) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsGameOver("loss");
      setExplodedCell(isLossValue);

      const tempIncorrectFlagCells: { row: number; col: number }[] = [];
      const updatedBoard = board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (cell.state.type === "flagged" && cell.state.flagNum !== cell.mineNum ) {
            tempIncorrectFlagCells.push({ row: rowIndex, col: colIndex });
          }
          if (cell.mineNum !== 0 && cell.state.type !== "flagged") {
            return {
              state: { type: "revealed", num: null },
              mineNum: cell.mineNum,
            } as Cell;
          }
          return cell;
        })
      );
      setBoard(updatedBoard);
      setIncorrectFlagCells(tempIncorrectFlagCells);
    }
  }, [JSON.stringify(board)]);

  useEffect(() => {
    return () => {
      clearTouchHoldTimer();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    if (isGameOver || !isTouchscreen ) {
      return;
    }

    clearTouchHoldTimer();
    touchHoldFiredRef.current = false;

    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });

    touchHoldTimerRef.current = window.setTimeout(() => {
      touchHoldFiredRef.current = true;

      if (!isFlagToggled && board[row][col].state.type !== "revealed") {
        setBoard(handleFlag(board, row, col, config));
        return;
      }

      if (board[row][col].state.type !== "revealed") {
        if (isFirstClick) {
          handleBeforeFirstClick(row, col);
        }
        setBoard(handleClick(board, row, col, config));
      }
    }, touchHoldDelay);

    return;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isGameOver || !isTouchscreen) {
      return;
    }

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.x);
    const dy = Math.abs(touch.clientY - touchStartPos.y);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      clearTouchHoldTimer();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, row: number, col: number) => {
    if (isGameOver || !isTouchscreen) {
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

    if (board[row][col].state.type === "revealed") {
      setBoard(handleChord(board, row, col, config));
      return;
    }

    if (isFlagToggled) {
      setBoard(handleFlag(board, row, col, config));
      return;
    }

    if (isFirstClick) {
      handleBeforeFirstClick(row, col);
    }
    setBoard(handleClick(board, row, col, config));
    return;
  };

  const handleMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (isGameOver || isTouchscreen) {
      return;
    }

    if (e.button === 0) {
      setIsLmbDown(true);
    } else if (e.button === 2) {
      setIsRmbDown(true);
      if (!isLmbDown) {
        setBoard(handleFlag(board, row, col, config));
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent, row: number, col: number) => {
    if (isGameOver || isTouchscreen) {
      return;
    }

    if (e.button === 0) {
      setIsLmbDown(false);
      if (isRmbDown) {
        setBoard(handleChord(board, row, col, config));
      } else {
        if (isFirstClick) {
          handleBeforeFirstClick(row, col);
        }
        setBoard(handleClick(board, row, col, config));
      }
    } else if (e.button === 1) {
      setBoard(handleChord(board, row, col, config));
    } else if (e.button === 2) {
      setIsRmbDown(false);
      if (isLmbDown) {
        setBoard(handleChord(board, row, col, config));
      }
    }
  };

  const {
    remainingPosFlags,
    remainingNegFlags,
    remainingFlagTiles,
    remainingRedFlags,
    remainingYellowFlags,
    remainingBlueFlags,
  } = countRemainingFlags(board);

  const getFlagButtonPositionClass = () => {
    switch (flagButtonPosition) {
      case "bottom-left": return "bottom-0 left-0 rounded-tl-none rounded-tr-md rounded-bl-none rounded-br-none";
      case "center-left": return "top-1/2 left-0 rounded-tl-none rounded-tr-md rounded-bl-none rounded-br-md";
      case "center-right": return "top-1/2 right-0 rounded-tl-md rounded-tr-none rounded-bl-md rounded-br-none";
      default: return "bottom-0 right-0 rounded-tl-md rounded-tr-none rounded-bl-none rounded-br-none";
    }
  }

  useEffect(() => {
    if (isTouchscreen || !hoveredCell || isGameOver) {
      setShadedCells([]);
      return;
    }

    const { row, col } = hoveredCell;

    if (!(row >= 0 && row < config.height && col >= 0 && col < config.width)) {
      return;
    }

    if (board[row][col].state.type === "revealed") {
      const updatedShadedCells: { row: number, col: number }[] = [];
      const specialNum = typeof board[row][col].state.num === "object" ? board[row][col].state.num : null;

      if (config.cellNumberDeviant === "nearest2" && specialNum?.type === "nearest2") {
        const distance = specialNum.distances[1];

        for (let dRow = -distance; dRow <= distance; dRow++) {
          for (let dCol = -distance; dCol <= distance; dCol++) {
            if (Math.max(Math.abs(dRow), Math.abs(dCol)) !== distance) continue;

            const nx = row + dRow;
            const ny = col + dCol;

            if (nx >= 0 && nx < config.height && ny >= 0 && ny < config.width) {
              updatedShadedCells.push({ row: nx, col: ny });
            }
          }
        }

        setShadedCells(updatedShadedCells);
        return;
      }

      iterateNeighbors(board, row, col, config, (nx, ny, neighbor) => {
        if (neighbor.state.type !== "revealed") {
          updatedShadedCells.push({ row: nx, col: ny });
        }
      });
    
      setShadedCells(updatedShadedCells);
    } else {
      // setShadedCells([hoveredCell]);
      setShadedCells([]);
    }
    
  }, [hoveredCell]);

  return (
    <>
      <div
        className="select-none"
        style={{
          width: `${(30 * config.width + 16) * (zoom / 100)}px`,
          height: `${(30 * config.height + 81) * (zoom / 100)}px`,
        }}
      >
        <div
          className="flex flex-col w-min h-min rounded-md overflow-hidden"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="bg-game-border border-t-[9px] border-x-[9px] border-game-border"
          >
              <div className="relative flex justify-between p-2 bg-game-hidden rounded-sm">
                <div className="flex content-center items-center justify-center h-[40px] px-3 gap-x-2 overflow-hidden whitespace-nowrap [&_svg]:size-auto bg-game-button">
                  {config.mineTypeDeviant === "rgb" ? (
                    <div className="flex flex-wrap content-center items-center justify-center gap-x-2 w-[80px]">
                      {[{ color: 1, remaining: remainingRedFlags }, { color: 2, remaining: remainingYellowFlags }, { color: 3, remaining: remainingBlueFlags }].map(({ color, remaining }) => (
                        <span key={color} className="inline-flex items-center gap-1 leading-none">
                          <span className={`font-minesweeper text-[15px] ${getColorClass(color)}`}>
                            `
                          </span>
                          <span className="font-bold text-sm">{remaining}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <>
                      {config.posMineCount > 0 && (
                        <div className="flex flex-row items-center gap-1.5">
                          <span className={`font-minesweeper ${config.negMineCount > 0 ? "text-[15px]" : "text-[20px]"} text-red-500`}>
                            `
                          </span>
                          <span className="font-bold text-xl">
                            {remainingPosFlags}
                            {config.maxMinesPerCell > 1 && (
                              <span className="text-muted-foreground text-xs">/{remainingFlagTiles}</span>
                            )}
                          </span>
                        </div>
                      )}
                      {config.negMineCount > 0 && (
                        <div className="flex flex-row items-center gap-2">
                          <span className={`font-minesweeper ${config.posMineCount > 0 ? "text-[15px]" : "text-[20px]"} text-blue-500 rotate-180`}>
                            `
                          </span>
                          <span className="font-bold text-xl">{remainingNegFlags}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              <Button
                className="absolute top-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-game-button" size="icon" variant="secondary"
                onClick={handleReset}
              >
                {isGameOver === null && (isLmbDown ? <Meh /> : <Smile />)}
                {isGameOver === "win" && <Laugh />}
                {isGameOver === "loss" && <Skull />}
              </Button>
                <div className={`flex h-[40px] justify-center items-center px-3 rounded-md overflow-hidden bg-game-button`}>
                <span className="font-bold text-xl">
                  {isGameOver ? formatTimeMs(timeElapsed) : Math.floor(timeElapsed / 1000)}
                </span>
              </div>

            </div>
            
          </div>
          <div
            className="grid border-[8px] border-game-border bg-game-border"
            style={{
              gridTemplateColumns: `repeat(${config.width}, 30px)`,
              gridTemplateRows: `repeat(${config.height}, 30px)`,
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <GameBoardGrid
              board={board}
              config={config}
              isGameOver={isGameOver}
              explodedCell={explodedCell}
              incorrectFlagCells={incorrectFlagCells}
              shadedCells={shadedCells}
              isFlagToggled={isFlagToggled}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onHoveredCellChange={setHoveredCell}
            />
          </div>
        </div>
      </div>
      {isTouchscreen && isGameOver !== "win" && (
        <Button
          className={`fixed p-0 [&_svg]:size-1/2 ${getFlagButtonPositionClass()} text-primary ${isFlagToggled ? "bg-destructive hover:bg-destructive/90" : "bg-game-button hover:bg-game-button/90"}`}
          style={{
            width: flagButtonSize,
            height: flagButtonSize,
          }}
          onClick={() => isGameOver ? handleReset() : setIsFlagToggled(!isFlagToggled)}
        >
          {isGameOver ? (/* isGameOver === "win" ? <Laugh /> : */ <Skull />) : (isFlagToggled ? <span className="font-minesweeper leading-none" style={{ fontSize: `${flagButtonSize * 0.5}px` }}>`</span> : <Shovel />)}
        </Button>
      )}
    </>
  );
};

export default GameBoard;
