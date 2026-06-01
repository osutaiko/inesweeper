import React, { useState, useEffect, useRef } from "react";
import { Board, BoardConfig, Cell, TimeRecord } from "@/lib/types";
import { createBoard, handleClick, handleChord, handleFlag, handleBeforeFirstClick as updateBoardBeforeFirstClick, isWin, isLoss, countRemainingFlags, extractMinesFromBoard, iterateNeighbors } from "@/lib/minesweeper";
import { formatTimeMs } from "@/lib/utils";
import { Laugh, Meh, Shovel, Skull, Smile } from "lucide-react";
import { Button } from "./ui/button";
import { CompassArrow } from "./CompassArrow";

export const GameBoard: React.FC<{
  config: BoardConfig;
  zoom: number;
  flagButtonSize: number;
  flagButtonPosition: string;
  isTouchscreen: boolean;
  addRecord: (record: TimeRecord) => void;
}> = ({ config, zoom, flagButtonSize, flagButtonPosition, isTouchscreen, addRecord }) => {
  const [board, setBoard] = useState<Board>(createBoard(config) || []);
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

      let tempIncorrectFlagCells: { row: number; col: number }[] = [];
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

  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    if (isGameOver || !isTouchscreen ) {
      return;
    }

    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    return;
  };

  const handleTouchEnd = (e: React.TouchEvent, row: number, col: number) => {
    if (isGameOver || !isTouchscreen) {
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

  const { remainingPosFlags, remainingNegFlags, remainingFlagTiles } = countRemainingFlags(board);

  const getNumberColorClass = (num: number | null) => {
  ["text-game-number-1", "text-game-number-2", "text-game-number-3", "text-game-number-4", "text-game-number-5", "text-game-number-6", "text-game-number-7", "text-game-number-8", "text-game-number-0", "text-game-number--1", "text-game-number--2", "text-game-number--3", "text-game-number--4", "text-game-number--5", "text-game-number--6", "text-game-number--7", "text-game-number--8"];
  
  if (num === null) {
    return "";
  }
  if (num === 0) {
    return "text-game-number-0";
  }

  if (num > 0) {
    return `text-game-number-${num % 8 === 0 ? 8 : num % 8}`;
  } else {
    return `text-game-number--${(-num % 8 === 0 ? 8 : -num % 8)}`;
  }
};

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
              <div className="flex flex-col h-[40px] justify-center px-3 gap-0 -space-y-0.5 rounded-md overflow-hidden [&_svg]:size-auto bg-game-button">
                {config.posMineCount > 0 && 
                  <div className="flex flex-row items-center gap-2.5">
                    <span className={`font-minesweeper ${config.negMineCount > 0 ? "text-[15px]" : "text-[20px]"} text-red-500`}>
                      `
                    </span>
                    <span className={`font-bold ${config.negMineCount > 0 ? "text-sm" : "text-xl"}`}>
                      {remainingPosFlags}
                      {config.maxMinesPerCell > 1 && (
                        <span className="text-muted-foreground text-xs">/{remainingFlagTiles}</span>
                      )}
                    </span>
                  </div>
                }
                {config.negMineCount > 0 && 
                  <div className="flex flex-row items-center gap-2.5">
                    <span className={`font-minesweeper ${config.posMineCount > 0 ? "text-[15px]" : "text-[20px]"} text-blue-500 rotate-180`}>
                      `
                    </span>
                    <span className={`font-bold ${config.posMineCount > 0 ? "text-sm" : "text-xl"}`}>{remainingNegFlags}</span>
                  </div>
                }
              </div>
              <Button
                className="absolute top-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-game-button" size="icon" variant="secondary"
                onClick={handleReset}
              >
                {isGameOver === null && (isLmbDown ? <Meh /> : <Smile />)}
                {isGameOver === "win" && <Laugh />}
                {isGameOver === "loss" && <Skull />}
              </Button>
              <div className="flex h-[40px] justify-center items-center px-3 rounded-md overflow-hidden bg-game-button">
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
            {board.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const compassNum = cell.state.type === "revealed" && typeof cell.state.num === "object" ? cell.state.num : null;
                const getBgClass = () => {
                  if (cell.state.type === "revealed") {
                    if (isGameOver === "loss" && explodedCell && explodedCell.row === rowIndex && explodedCell.col === colIndex) {
                      return "bg-game-explodedmine";
                    }
                    return "bg-game-revealed";
                  } else if (cell.state.type === "flagged") {
                    if (isGameOver === "loss" && incorrectFlagCells!.some(({ row: r, col: c }) => r === rowIndex && c === colIndex)) {
                      return "bg-game-wrongflag";
                    }
                    if (shadedCells.some(({ row: shadedRow, col: shadedCol }) => shadedRow === rowIndex && shadedCol === colIndex)) {
                      return "bg-game-hover";
                    }
                    return "bg-game-hidden";
                  } else {
                    if (shadedCells.some(({ row: shadedRow, col: shadedCol }) => shadedRow === rowIndex && shadedCol === colIndex)) {
                      return "bg-game-hover";
                    }
                    return "bg-game-hidden";
                  }
                };

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`relative flex justify-center items-center font-minesweeper border border-game-border ${getBgClass()} rounded-sm overflow-hidden`}
                    onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                    onMouseUp={(e) => handleMouseUp(e, rowIndex, colIndex)}
                    onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                    onTouchEnd={(e) => handleTouchEnd(e, rowIndex, colIndex)}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {((config.cellNumberDeviant === "amplified" || config.cellNumberDeviant === "contrast") && (!(cell.state.type === "revealed" && cell.mineNum === 0)) && ((rowIndex + colIndex) % 2 === 1)) ?
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute left-0 top-0 h-[14px] w-[5px] rounded-br-md bg-game-redborder" />
                        <div className="absolute left-0 top-0 h-[5px] w-[14px] rounded-br-md bg-game-redborder" />
                      </div> : <></>
                    }
                    {((config.cellNumberDeviant === "contrast") && (!(cell.state.type === "revealed" && cell.mineNum === 0)) && ((rowIndex + colIndex) % 2 === 0)) ?
                      <div className="pointer-events-none absolute inset-0">
                        <div className="absolute right-0 top-0 h-[14px] w-[5px] rounded-bl-md bg-game-blueborder" />
                        <div className="absolute right-0 top-0 h-[5px] w-[14px] rounded-bl-md bg-game-blueborder" />
                      </div> : <></>
                    }
                    {cell.state.type === "revealed" && (
                      cell.mineNum ? 
                        <div
                          className="flex flex-wrap justify-center items-center"
                        >
                            {Array.from({ length: Math.abs(cell.mineNum) }).map((_, idx) => (
                              <span
                                key={`bomb-${idx}`}
                                className={`${Math.abs(cell.mineNum) > 1 ? "text-[9px]" : "mt-[2px] ml-[2px] text-[18px]"} leading-[11.5px] ${cell.mineNum > 0 ? "text-black" : "text-white"}`}
                              >
                                *
                              </span>
                            ))}
                        </div> : (
                        compassNum ? (
                          <CompassArrow angleIndex={compassNum.angleIndex} />
                        ) : (
                          <span
                            className={`inline-block origin-center ml-[2px] text-lg ${getNumberColorClass(cell.state.num)}`}
                            style={typeof cell.state.num === "number" && (Math.abs(cell.state.num) >= 10 || cell.state.num < 0) ? { transform: "scaleX(0.75)" } : undefined}
                          >
                            {cell.state.num}
                          </span>
                        )
                      )
                    )}
                    {cell.state.type === "flagged" && (
                      <div
                        className="flex flex-wrap pt-[1px] gap-y-[1px] justify-center items-center"
                      >
                        {(() => {
                          const flagNum = cell.state.flagNum;
                          return Array.from({ length: Math.abs(flagNum) }).map((_, idx) => (
                            <span
                              key={`flag-${idx}`}
                              className={`${
                                flagNum < 0 ? "rotate-180 text-blue-500 mr-[2px]" : "text-red-500 ml-[2px] leading-none"
                              } ${Math.abs(flagNum) > 1 ? "text-[10px]" : "text-[18px]"}`}
                            >
                              `
                            </span>
                          ));
                        })()}
                      </div>
                    )}
                    {cell.state.type === "hidden" && isFlagToggled && (
                      <span className="text-[18px] ml-[2px] leading-none opacity-15">
                        `
                      </span>
                    )}
                  </div>
                );
              })
            )}
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
