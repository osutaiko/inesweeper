import React, { useState, useEffect } from "react";
import { Board, DifficultyName, VariantName, Cell } from "@/lib/types";
import { boardConfigLibrary, createBoard, getCellNumber, handleClick, handleChord, handleFlag } from "@/lib/minesweeper";
import { Flag, Smile, Sun } from "lucide-react";
import { Button } from "./ui/button";

export const GameBoard: React.FC<{
  variant: VariantName;
  difficulty: DifficultyName;
  cellWidth: number;
}> = ({ variant, difficulty, cellWidth }) => {
  const config = boardConfigLibrary[variant]?.[difficulty];
  const [board, setBoard] = useState<Board>(createBoard(config) || []);
  const [isFirstClick, setIsFirstClick] = useState(true);
  const [isLmbDown, setIsLmbDown] = useState(false);
  const [isRmbDown, setIsRmbDown] = useState(false);

  useEffect(() => {
    if (config) {
      setBoard(createBoard(config) || []);
      setIsFirstClick(true);
    }
  }, [variant, difficulty, config]);

  const handleMouseDown = (e: React.MouseEvent, row: number, col: number) => {
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
    if (e.button === 0) {
      setIsLmbDown(false);
      if (isRmbDown) {
        handleChord(board, row, col, config);
      } else {
        if (isFirstClick) {
          setIsFirstClick(false);
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

  if (!board) {
    return <div>Error: Invalid board configuration</div>;
  }

  const getNumberColorClass = (num: number | null) => {
    if (num === null) {
      return "";
    }
    if (num >= 0) {
      return ["#4600ff", "#008809", "#ff0000", "#1e007c", "#8e0000", "#008483", "#000000", "#808080"][(num - 1) % 8];
    } else {
      return ["#b9ff00", "#ff77f6", "#00ffff", "#e1ff83", "#71ffff", "#ff7b7c", "#ffffff", "#7f7f7f"][(-num - 1) % 8];
    }
  }

  return (
    <div className="flex flex-col w-min h-min bg-gray-100 rounded-md overflow-hidden">
      <div className="flex justify-between p-2 border-t-8 border-x-8 border-gray-400">
        <div className="w-[80px] bg-red-100">
          timer
        </div>
        <Button className="bg-gray-400" size="icon">
          <Smile />
        </Button>
        <div className="w-[80px] bg-red-100">
          flags
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
              className={`flex justify-center items-center border border-gray-400 ${
                cell.state.type === "revealed" ? "bg-gray-300" : "bg-gray-100"
              }`}
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
                    className="flex flex-wrap justify-center items-center"
                    style={{ gap: cellWidth / 20 }}
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
                      />
                    ))}
                  </div> : 
                <p
                  className={`font-bold`}
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
                  className="flex flex-wrap justify-center items-center"
                  style={{ gap: cellWidth / 20 }}
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
