import React, { useState, useEffect, useRef } from "react";
import { Board, BoardConfig, Cell, TimeRecord } from "@/lib/types";
import { createDemoBoard } from "@/lib/constants";
import { createBoard, handleClick, handleChord, handleFlag, handleBeforeFirstClick as updateBoardBeforeFirstClick, isWin, isLoss, countRemainingFlags, extractMinesFromBoard, flagAllMines, iterateNeighbors } from "@/lib/minesweeper";
import { formatTimeMs } from "@/lib/utils";
import { useMinesweeperControls } from "@/hooks/useMinesweeperControls";
import { useSiteLayout } from "./Layout";

import { Laugh, Meh, Skull, Smile } from "lucide-react";
import { Button } from "./ui/button";
import { GameBoardGrid, getColorClass } from "./GameBoardGrid";
import TouchFlagButton from "./TouchFlagButton";

export const GameBoard: React.FC<{
  config: BoardConfig;
  touchHoldDelay: number;
  isTouchscreen: boolean;
  addRecord: (record: TimeRecord) => void;
 }> = ({ config, touchHoldDelay, isTouchscreen, addRecord }) => {
  const isDemoBoard = false;
  const { chordingMode, zoom, flagButtonSize, flagButtonPosition } = useSiteLayout();
  const [board, setBoard] = useState<Board>(isDemoBoard ? createDemoBoard() : (createBoard(config) || []));
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [isFlagToggled, setIsFlagToggled] = useState(false);
  const [isGameOver, setIsGameOver] = useState<"win" | "loss" | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<{ row: number, col: number } | null>(null);
  const [shadedCells, setShadedCells] = useState<{ row: number, col: number }[]>([]);
  const [explodedCell, setExplodedCell] = useState<{ row: number, col: number } | null>(null);
  const [incorrectFlagCells, setIncorrectFlagCells] = useState<{ row: number, col: number }[] | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleReset = () => {
    const newBoard = createBoard(config);
    setBoard(newBoard || []);
    setIsFirstClick(true);
    resetControls();
    setIsFlagToggled(false);
    setIsGameOver(null);
    setStartTime(null);
    setTimeElapsed(0);
    setHoveredCell(null);
    setExplodedCell(null);
    setIncorrectFlagCells(null);
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

      setBoard(flagAllMines(board));

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

  const {
    isLmbDown,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetControls,
  } = useMinesweeperControls({
    disabled: Boolean(isGameOver),
    isTouchscreen,
    touchHoldDelay,
    isFlagToggled,
    canReveal: () => true,
    canFlag: (row, col) => board[row][col].state.type !== "revealed",
    canChord: () => true,
    canTouchChord: (row, col) =>
      board[row][col].state.type === "revealed",
    onReveal: (row, col) => {
      if (isFirstClick) {
        handleBeforeFirstClick(row, col);
      }
      setBoard(handleClick(board, row, col, config));
    },
    onFlag: (row, col) => {
      setBoard(handleFlag(board, row, col, config));
    },
    onChord: (row, col) => {
      setBoard(handleChord(board, row, col, config));
    },
    chordingMode,
  });

  const {
    remainingPosFlags,
    remainingNegFlags,
    remainingFlagTiles,
    remainingRedFlags,
    remainingYellowFlags,
    remainingBlueFlags,
  } = countRemainingFlags(board);

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
        <TouchFlagButton
          flagButtonSize={flagButtonSize}
          flagButtonPosition={flagButtonPosition}
          isFlagToggled={isFlagToggled}
          isGameOver={Boolean(isGameOver)}
          onClick={() => isGameOver ? handleReset() : setIsFlagToggled(!isFlagToggled)}
        />
      )}
    </>
  );
};

export default GameBoard;
