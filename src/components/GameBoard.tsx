import React, { useState, useEffect, useRef } from "react";
import { Board, BoardConfig, Cell, TimeRecord } from "@/lib/types";
import { createBoard, handleClick, handleChord, handleFlag, isWin, isLoss, countRemainingFlags, extractMinesFromBoard } from "@/lib/minesweeper";
import { Flag, Laugh, Meh, Shovel, Skull, Smile, Sun } from "lucide-react";
import { Button } from "./ui/button";

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
      let newBoard = [...board];
  
      const emptySquares = [];
      for (let i = 0; i < config.height; i++) {
        for (let j = 0; j < config.width; j++) {
          if (!newBoard[i][j].mineNum && (i !== row || j !== col)) {
            emptySquares.push({ i, j });
          }
        }
      }
  
      const randomSquare = emptySquares[Math.floor(Math.random() * emptySquares.length)];
  
      if (randomSquare) {
        newBoard[randomSquare.i][randomSquare.j].mineNum = newBoard[row][col].mineNum;
        newBoard[row][col].mineNum = 0;
      }
  
      setBoard(newBoard);
    }
  };

  useEffect(() => {
    handleReset();
  }, [config]);

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
      if (startTime !== null) {
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
      setIsGameOver("win");

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
        timeElapsed: timeElapsed,
        date: Date.now(),
        mineArray: extractMinesFromBoard(board),
      });
    }

    const isLossValue = isLoss(board);
    if (isLossValue) {
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

  const handleTouchStart = (row: number, col: number) => {
    if (isGameOver) {
      return;
    }

    if (isFlagToggled) {
      handleFlag(board, row, col, config, setBoard);
    }
    return;
  };

  const handleTouchEnd = (row: number, col: number) => {
    if (isGameOver) {
      return;
    }

    if (board[row][col].state.type === "revealed") {
      handleChord(board, row, col, config, setBoard);
    } else {
      if (isFirstClick) {
        handleBeforeFirstClick(row, col);
      }
      handleClick(board, row, col, config, setBoard);
    }
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
        handleFlag(board, row, col, config, setBoard);
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
        handleChord(board, row, col, config, setBoard);
      } else {
        if (isFirstClick) {
          handleBeforeFirstClick(row, col);
        }
        handleClick(board, row, col, config, setBoard);
      }
    } else if (e.button === 1) {
      handleChord(board, row, col, config, setBoard);
    } else if (e.button === 2) {
      setIsRmbDown(false);
      if (isLmbDown) {
        handleChord(board, row, col, config, setBoard);
      }
    }
  };

  const { remainingPosFlags, remainingNegFlags } = countRemainingFlags(board);

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
      const directions = config.cellNumberDeviant === "cross" ? [
        [-2, 0], [-1, 0], [0, -2], [0, -1], [0, 1], [0, 2], [1, 0], [2, 0]
      ] : config.cellNumberDeviant === "knight" ? [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]
      ] : [
        [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
      ];

      directions.forEach(([dx, dy]) => {
        const newRow = row + dx;
        const newCol = col + dy;
        if (newRow >= 0 && newRow < config.height && newCol >= 0 && newCol < config.width && board[newRow][newCol].state.type !== "revealed") {
          updatedShadedCells.push({ row: newRow, col: newCol });
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
              <Button className="flex flex-col justify-center px-3 gap-0 -space-y-0.5 rounded-md overflow-hidden [&_svg]:size-auto bg-game-button" variant="secondary">
                {config.posMineCount > 0 && 
                  <div className="flex flex-row items-center gap-2.5">
                    <Flag stroke="red" fill="red" size={config.negMineCount > 0 ? 15 : 20} />
                    <p className={`font-bold ${config.negMineCount > 0 ? "text-sm" : "text-xl"}`}>{remainingPosFlags}</p>
                  </div>
                }
                {config.negMineCount > 0 && 
                  <div className="flex flex-row items-center gap-2.5">
                    <Flag stroke="blue" fill="blue" size={config.posMineCount > 0 ? 15 : 20} className="rotate-180" />
                    <p className={`font-bold ${config.posMineCount > 0 ? "text-sm" : "text-xl"}`}>{remainingNegFlags}</p>
                  </div>
                }
              </Button>
              <Button
                className="absolute top-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-game-button" size="icon" variant="secondary"
                onClick={handleReset}
              >
                {isGameOver === null && (isLmbDown ? <Meh /> : <Smile />)}
                {isGameOver === "win" && <Laugh />}
                {isGameOver === "loss" && <Skull />}
              </Button>
              <Button className="flex justify-center items-center px-3 rounded-md overflow-hidden bg-game-button" variant="secondary">
                <p className="font-bold text-xl">{startTime ? (isGameOver ? (timeElapsed / 1000).toFixed(2) : Math.floor(timeElapsed / 1000)) : 0}</p>
              </Button>

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
                    className={`relative flex justify-center items-center border border-game-border ${getBgClass()} rounded-sm overflow-hidden`}
                    onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                    onMouseUp={(e) => handleMouseUp(e, rowIndex, colIndex)}
                    onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                    onTouchEnd={() => handleTouchEnd(rowIndex, colIndex)}
                    onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {((config.cellNumberDeviant === "amplified" || config.cellNumberDeviant === "contrast") && (!(cell.state.type === "revealed" && cell.mineNum === 0)) && ((rowIndex + colIndex) % 2 === 1)) ?
                      <div className="absolute w-full h-full rounded-[3px] border-2 border-game-redborder" /> : <></>
                    }
                    {((config.cellNumberDeviant === "contrast") && (!(cell.state.type === "revealed" && cell.mineNum === 0)) && ((rowIndex + colIndex) % 2 === 0)) ?
                      <div className="absolute w-full h-full rounded-[3px] border-2 border-game-blueborder" /> : <></>
                    }
                    {cell.state.type === "revealed" && (
                      cell.mineNum ? 
                        <div
                          className="flex flex-wrap justify-center items-center"
                        >
                          {Array.from({ length: Math.abs(cell.mineNum) }).map((_, idx) => (
                            <Sun
                              key={`bomb-${idx}`}
                              className={`${cell.mineNum < 0 ? "rotate-180" : ""} ${Math.abs(cell.mineNum) > 1 ? "w-[12px] h-[12px]" : "w-[18px] h-[18px]"}`}
                              stroke={cell.mineNum > 0 ? "black" : "white"}
                              fill={cell.mineNum > 0 ? "black" : "white"}
                            />
                          ))}
                        </div> : 
                      <span className={`font-bold text-xl ${getNumberColorClass(cell.state.num)}`}>
                        {cell.state.num}
                      </span>
                    )}
                    {cell.state.type === "flagged" && (
                      <div
                        className="flex flex-wrap pt-[1px] gap-y-[1px] justify-center items-center"
                      >
                        {(() => {
                          const flagNum = cell.state.flagNum;
                          return Array.from({ length: Math.abs(flagNum) }).map((_, idx) => (
                            <Flag
                              key={`flag-${idx}`}
                              className={`${
                                flagNum < 0 ? "rotate-180" : ""
                              } ${Math.abs(flagNum) > 1 ? "w-[10px] h-[10px]" : "w-[18px] h-[18px]"}`}
                              stroke={flagNum > 0 ? "red" : "blue"}
                              fill={flagNum > 0 ? "red" : "blue"}
                            />
                          ));
                        })()}
                      </div>
                    )}
                    {cell.state.type === "hidden" && isFlagToggled && (
                      <Flag className="w-[18px] h-[18px]" stroke="red" fill="red" opacity={0.1} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {isTouchscreen && (
        <Button
          className={`fixed p-0 [&_svg]:size-1/2 ${getFlagButtonPositionClass()} text-primary ${isFlagToggled ? "bg-destructive hover:bg-destructive/90" : "bg-game-button hover:bg-game-button/90"}`}
          style={{
            width: flagButtonSize,
            height: flagButtonSize,
          }}
          onClick={() => isGameOver ? handleReset() : setIsFlagToggled(!isFlagToggled)}
        >
          {isGameOver ? (isGameOver === "win" ? <Smile /> : <Skull />) : (isFlagToggled ? <Flag /> : <Shovel />)}
        </Button>
      )}
    </>
  );
};

export default GameBoard;
