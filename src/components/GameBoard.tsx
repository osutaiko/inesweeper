import React, { useState, useEffect, useRef } from "react";
import { Board, BoardConfig } from "@/lib/types";
import { createBoard, handleClick, handleChord, handleFlag, isWin, isLoss, countRemainingFlags } from "@/lib/minesweeper";
import { Flag, Laugh, Skull, Smile, Sun } from "lucide-react";
import { Button } from "./ui/button";

export const GameBoard: React.FC<{
  config: BoardConfig;
  cellWidth: number;
}> = ({ config, cellWidth }) => {
  const [board, setBoard] = useState<Board>(createBoard(config) || []);
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [isLmbDown, setIsLmbDown] = useState(false);
  const [isRmbDown, setIsRmbDown] = useState(false);
  const [isGameOver, setIsGameOver] = useState<"win" | "loss" | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [explodedCell, setExplodedCell] = useState<{ row: number, col: number } | null>(null);
  const [incorrectFlagCells, setIncorrectFlagCells] = useState<{ row: number, col: number }[] | null>(null);

  const animationFrameRef = useRef<number | null>(null);console.log(incorrectFlagCells, board)

  const handleReset = () => {
    const newBoard = createBoard(config);
    setBoard(newBoard || []);
    setIsFirstClick(true);
    setIsLmbDown(false);
    setIsRmbDown(false);
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
    if (isGameOver) {
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

  return (
    <div className="flex flex-col w-min h-min bg-gray-100 rounded-md overflow-hidden">
      <div
        className="relative h-[64px] flex justify-between p-2 border-gray-400"
        style={{
          borderTopWidth: 8 + cellWidth / 20,
          borderLeftWidth: 8 + cellWidth / 20,
          borderRightWidth: 8 + cellWidth / 20,
        }}
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
          {isGameOver === null && <Smile />}
          {isGameOver === "win" && <Laugh />}
          {isGameOver === "loss" && <Skull />}
        </Button>
        <div className="flex justify-center items-center px-3 bg-gray-300 rounded-md overflow-hidden">
          <p className="font-bold text-xl">{startTime ? (isGameOver ? (timeElapsed / 1000).toFixed(3) : Math.floor(timeElapsed / 1000)) : 0}</p>
        </div>
      </div>
      <div
        className="grid border-8 border-gray-400"
        style={{
          gridTemplateColumns: `repeat(${board[0].length}, ${cellWidth}px)`,
          gridTemplateRows: `repeat(${board.length}, ${cellWidth}px)`,
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`flex justify-center items-center border border-gray-400 ${cell.state.type === "revealed" ? "bg-gray-300" : "bg-gray-100"}`}
              style={{
                width: cellWidth,
                height: cellWidth,
                borderWidth: cellWidth / 20,
              }}
              onMouseDown={(e) => handleMouseDown(e, rowIndex, colIndex)}
              onMouseUp={(e) => handleMouseUp(e, rowIndex, colIndex)}
            >
              {cell.state.type === "revealed" && (
                cell.mineNum ? 
                  <div
                    className={`flex flex-wrap w-full h-full justify-center items-center ${
                      isGameOver === "loss" && explodedCell && explodedCell.row === rowIndex && explodedCell.col === colIndex ? "bg-destructive" : "" 
                    }`}
                    style={{
                      columnGap: cellWidth * 0.05,
                    }}
                  >
                    {Array.from({ length: Math.abs(cell.mineNum) }).map((_, idx) => (
                      <Sun
                        key={`bomb-${idx}`}
                        className={`${cell.mineNum < 0 ? "rotate-180" : ""}`}
                        style={{
                          width: Math.abs(cell.mineNum) > 1 ? cellWidth * 0.35 : cellWidth * 0.6,
                          height: Math.abs(cell.mineNum) > 1 ? cellWidth * 0.35 : cellWidth * 0.6,
                        }}
                        stroke={cell.mineNum > 0 ? "black" : "white"}
                        fill={cell.mineNum > 0 ? "black" : "white"}
                      />
                    ))}
                  </div> : 
                <p
                  className="font-bold"
                  style={{
                    height: cellWidth,
                    fontSize: cellWidth * 0.65,
                    lineHeight: `${cellWidth}px`,
                    color: getNumberColorClass(cell.state.num)
                  }}
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
                  style={{
                    columnGap: cellWidth * 0.05,
                  }}
                >
                  {Array.from({ length: Math.abs(cell.state.flagNum) }).map((_, idx) => (
                    <Flag
                      key={`flag-${idx}`}
                      className={`${cell.state.flagNum < 0 ? "rotate-180" : ""}`}
                      style={{
                        width: Math.abs(cell.state.flagNum) > 1 ? cellWidth * 0.35 : cellWidth * 0.6,
                        height: Math.abs(cell.state.flagNum) > 1 ? cellWidth * 0.35 : cellWidth * 0.6,
                      }}
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
  );
};

export default GameBoard;