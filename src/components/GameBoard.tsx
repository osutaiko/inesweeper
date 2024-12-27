import React, { useState, useEffect, useRef } from "react";
import { Board, BoardConfig, TimeRecord } from "@/lib/types";
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
    setExplodedCell(null);
    setIncorrectFlagCells(null);
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
              ...cell,
              state: { ...cell.state, type: "flagged", flagNum: cell.mineNum },
            };
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
            tempIncorrectFlagCells.push({ rowIndex, colIndex });
          }
          if (cell.mineNum !== 0 && cell.state.type !== "flagged") {
            return {
              ...cell,
              state: { ...cell.state, type: "revealed" },
            };
          }
          return cell;
        })
      );
      setBoard(updatedBoard);
      setIncorrectFlagCells(tempIncorrectFlagCells);
    }
  }, [JSON.stringify(board)]);

  const handleMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (isGameOver) {
      return;
    }

    if (isTouchscreen) {
      if (board[row][col].state.type === "revealed") {
        handleChord(board, row, col, config);
      } else {
        if (isFlagToggled) {
          handleFlag(board, row, col, config);
        } else {
          handleClick(board, row, col, config);
        }
      }
      return;
    }

    if (e.button === 0) {
      setIsLmbDown(true);
    } else if (e.button === 2) {
      setIsRmbDown(true);
      if (!isLmbDown) {
        handleFlag(board, row, col, config);
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
        handleChord(board, row, col, config);
      } else {
        if (isFirstClick) {
          setIsFirstClick(false);
          setStartTime(Date.now());

          if (board[row][col].mineNum) {
            let moved = false;

            for (let i = 0; i < config.height; i++) {
              for (let j = 0; j < config.width; j++) {
                if (!board[i][j].mineNum && (i !== row || j !== col)) {
                  board[i][j].mineNum = board[row][col].mineNum;
                  board[row][col].mineNum = 0;
                  moved = true;
                  break;
                }
              }
              if (moved) break;
            }

            setBoard([...board]);
          }
        }
        handleClick(board, row, col, config);
      }
    } else if (e.button === 2) {
      setIsRmbDown(false);
      if (isLmbDown) {
        handleChord(board, row, col, config);
      }
    }
  };

  const { remainingPosFlags, remainingNegFlags } = countRemainingFlags(board, config);

  const getNumberColorClass = (num: number | null) => {
    if (num === null) {
      return "";
    }
    if (num >= 0) {
      return ["#4600ff", "#008809", "#ff0000", "#1e007c", "#8e0000", "#008483", "#000000", "#808080"][(num - 1) % 8];
    } else {
      return ["#b9ff00", "#ff77f6", "#00ffff", "#e1ff83", "#71ffff", "#ff7b7c", "#ffffff", "#7f7f7f"][(-num - 1) % 8];
    }
  };

  const getFlagButtonClass = () => {
    switch (flagButtonPosition) {
      case "bottom-left": return "bottom-0 left-0 rounded-tl-none rounded-tr-md rounded-bl-none rounded-br-none";
      case "center-left": return "top-1/2 left-0 rounded-tl-none rounded-tr-md rounded-bl-none rounded-br-md";
      case "center-right": return "top-1/2 right-0 rounded-tl-md rounded-tr-none rounded-bl-md rounded-br-none";
      default: return "bottom-0 right-0 rounded-tl-md rounded-tr-none rounded-bl-none rounded-br-none";
    }
  }

  return (
    <>
      <div
        className="flex flex-col w-min h-min bg-gray-100 rounded-md overflow-hidden select-none"
        style={{
          zoom: zoom / 100,
          backfaceVisibility: "hidden",
        }}
      >
        <div
          className="relative h-[64px] flex justify-between p-2 border-t-[9px] border-x-[9px] border-gray-400"
        >
          <div className="flex flex-col justify-center px-3 -space-y-0.5 bg-gray-300 rounded-md overflow-hidden">
            {config.posMineCount > 0 && 
              <div className="flex flex-row items-center gap-2">
                <Flag stroke="red" fill="red" size={config.negMineCount > 0 ? 15 : 20} />
                <p className={`font-bold ${config.negMineCount > 0 ? "text-sm" : "text-xl"}`}>{remainingPosFlags}</p>
              </div>
            }
            {config.negMineCount > 0 && 
              <div className="flex flex-row items-center gap-2">
                <Flag stroke="blue" fill="blue" size={config.posMineCount > 0 ? 15 : 20} className="rotate-180" />
                <p className={`font-bold ${config.posMineCount > 0 ? "text-sm" : "text-xl"}`}>{remainingNegFlags}</p>
              </div>
            }
          </div>
          <Button
            className="absolute top-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-400" size="icon"
            onClick={handleReset}
          >
            {isGameOver === null && (isLmbDown ? <Meh /> : <Smile />)}
            {isGameOver === "win" && <Laugh />}
            {isGameOver === "loss" && <Skull />}
          </Button>
          <div className="flex justify-center items-center px-3 bg-gray-300 rounded-md overflow-hidden">
            <p className="font-bold text-xl">{startTime ? (isGameOver ? (timeElapsed / 1000).toFixed(2) : Math.floor(timeElapsed / 1000)) : 0}</p>
          </div>
        </div>
        <div
          className="grid border-[8px] border-gray-400"
          style={{
            gridTemplateColumns: `repeat(${board[0].length}, 30px)`,
            gridTemplateRows: `repeat(${board.length}, 30px)`,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`flex justify-center items-center border border-gray-400 ${cell.state.type === "revealed" ? "bg-gray-300" : "bg-gray-100"}`}
                onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
                onMouseUp={(e) => handleMouseUp(e, rowIndex, colIndex)}
              >
                {cell.state.type === "hidden" && isFlagToggled && (
                  <Flag className="w-[18px] h-[18px]" stroke="red" fill="red" opacity={0.15} />
                )}
                {cell.state.type === "revealed" && (
                  cell.mineNum ? 
                    <div
                      className={`flex flex-wrap w-full h-full justify-center items-center ${
                        isGameOver === "loss" && explodedCell && explodedCell.row === rowIndex && explodedCell.col === colIndex ? "bg-destructive" : "" 
                      }`}
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
                  <p
                    className="font-bold text-xl"
                    style={{ color: getNumberColorClass(cell.state.num) }}
                  >
                    {cell.state.num}
                  </p>
                )}
                {cell.state.type === "flagged" && (
                  <div
                    className={`flex flex-wrap w-full h-full justify-center items-center ${
                      isGameOver === "loss" && incorrectFlagCells.some(
                        ({ rowIndex: r, colIndex: c }) => r === rowIndex && c === colIndex
                      ) ? "bg-yellow-300" : ""
                    }`}
                  >
                    {Array.from({ length: Math.abs(cell.state.flagNum) }).map((_, idx) => (
                      <Flag
                        key={`flag-${idx}`}
                        className={`${cell.state.flagNum < 0 ? "rotate-180" : ""} ${Math.abs(cell.state.flagNum) > 1 ? "w-[10px] h-[10px]" : "w-[18px] h-[18px]"}`}
                        stroke={cell.state.flagNum > 0 ? "red" : "blue"}
                        fill={cell.state.flagNum > 0 ? "red" : "blue"}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {isTouchscreen && (
        <Button
          variant={isFlagToggled ? "destructive" : "default"}
          className={`absolute p-0 [&_svg]:size-1/2 ${getFlagButtonClass()}`}
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
