import React from "react";
import { Square } from "lucide-react";

import { Board, BoardConfig } from "@/lib/types";
import { CompassArrow } from "./CompassArrow";

type CellPosition = {
  row: number;
  col: number;
};

type GameBoardGridProps = {
  board: Board;
  config: BoardConfig;
  isGameOver: "win" | "loss" | null;
  explodedCell: CellPosition | null;
  incorrectFlagCells: CellPosition[] | null;
  shadedCells: CellPosition[];
  isFlagToggled: boolean;
  onMouseDown: (event: React.MouseEvent, row: number, col: number) => void;
  onMouseUp: (event: React.MouseEvent, row: number, col: number) => void;
  onTouchStart: (event: React.TouchEvent, row: number, col: number) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent, row: number, col: number) => void;
  onHoveredCellChange: (cell: CellPosition | null) => void;
};

const getNumberColorClass = (num: number | null) => {
  void ["text-game-number-1", "text-game-number-2", "text-game-number-3", "text-game-number-4", "text-game-number-5", "text-game-number-6", "text-game-number-7", "text-game-number-8", "text-game-number-0", "text-game-number--1", "text-game-number--2", "text-game-number--3", "text-game-number--4", "text-game-number--5", "text-game-number--6", "text-game-number--7", "text-game-number--8"];

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

export const getColorClass = (mineNum: number) => {
  if (mineNum === 1) return "text-red-500";
  if (mineNum === 2) return "text-yellow-500";
  return "text-blue-500";
};

const getColorMixClass = (mask: number) => {
  if (mask === 1) return "text-red-500";
  if (mask === 2) return "text-yellow-500";
  if (mask === 3) return "text-orange-500";
  if (mask === 4) return "text-blue-500";
  if (mask === 5) return "text-purple-500";
  if (mask === 6) return "text-green-500";
  return "text-stone-500";
};

export const GameBoardGrid = ({
  board,
  config,
  isGameOver,
  explodedCell,
  incorrectFlagCells,
  shadedCells,
  isFlagToggled,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onHoveredCellChange,
}: GameBoardGridProps) => {
  const isColorsVariant = config.mineTypeDeviant === "rgb";

  return (
    <>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const specialNum =
            cell.state.type === "revealed" &&
            typeof cell.state.num === "object"
              ? cell.state.num
              : null;
          const getBgClass = () => {
            if (cell.state.type === "revealed") {
              if (
                isGameOver === "loss" &&
                explodedCell &&
                explodedCell.row === rowIndex &&
                explodedCell.col === colIndex
              ) {
                return "bg-game-explodedmine";
              }
              return "bg-game-revealed";
            } else if (cell.state.type === "flagged") {
              if (
                isGameOver === "loss" &&
                incorrectFlagCells!.some(
                  ({ row: incorrectRow, col: incorrectCol }) =>
                    incorrectRow === rowIndex && incorrectCol === colIndex,
                )
              ) {
                return "bg-game-wrongflag";
              }
              if (
                shadedCells.some(
                  ({ row: shadedRow, col: shadedCol }) =>
                    shadedRow === rowIndex && shadedCol === colIndex,
                )
              ) {
                return "bg-game-hover";
              }
              return "bg-game-hidden";
            } else {
              if (
                shadedCells.some(
                  ({ row: shadedRow, col: shadedCol }) =>
                    shadedRow === rowIndex && shadedCol === colIndex,
                )
              ) {
                return "bg-game-hover";
              }
              return "bg-game-hidden";
            }
          };

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`relative flex justify-center items-center font-minesweeper border border-game-border ${getBgClass()} rounded-sm overflow-hidden`}
              onMouseDown={(event) => onMouseDown(event, rowIndex, colIndex)}
              onMouseUp={(event) => onMouseUp(event, rowIndex, colIndex)}
              onTouchStart={(event) => onTouchStart(event, rowIndex, colIndex)}
              onTouchMove={onTouchMove}
              onTouchEnd={(event) => onTouchEnd(event, rowIndex, colIndex)}
              onMouseEnter={() =>
                onHoveredCellChange({ row: rowIndex, col: colIndex })
              }
              onMouseLeave={() => onHoveredCellChange(null)}
            >
              {((config.cellNumberDeviant === "amplified" ||
                config.cellNumberDeviant === "contrast") &&
                !(cell.state.type === "revealed" && cell.mineNum === 0) &&
                (rowIndex + colIndex) % 2 === 1) ? (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-0 top-0 h-[14px] w-[5px] rounded-br-md bg-game-redborder" />
                  <div className="absolute left-0 top-0 h-[5px] w-[14px] rounded-br-md bg-game-redborder" />
                </div>
              ) : (
                <></>
              )}
              {config.cellNumberDeviant === "contrast" &&
              !(cell.state.type === "revealed" && cell.mineNum === 0) &&
              (rowIndex + colIndex) % 2 === 0 ? (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute right-0 top-0 h-[14px] w-[5px] rounded-bl-md bg-game-blueborder" />
                  <div className="absolute right-0 top-0 h-[5px] w-[14px] rounded-bl-md bg-game-blueborder" />
                </div>
              ) : (
                <></>
              )}
              {cell.state.type === "revealed" &&
                (cell.mineNum ? (
                  (() => {
                    const mineNum = cell.mineNum;
                    const mineCount = isColorsVariant ? 1 : Math.abs(mineNum);
                    const mineClass = `${mineCount > 1 ? "text-[9px]" : "mt-[2px] ml-[2px] text-[18px]"} leading-[11.5px] ${isColorsVariant ? getColorClass(mineNum) : mineNum > 0 ? "text-black" : "text-white"}`;

                    return (
                      <div className="flex flex-wrap justify-center items-center">
                        {Array.from({ length: mineCount }).map((_, index) => (
                          <span key={`bomb-${index}`} className={mineClass}>
                            *
                          </span>
                        ))}
                      </div>
                    );
                  })()
                ) : specialNum?.type === "colors" ? (
                  <Square
                    className={`size-[18px] ${getColorMixClass(specialNum.mask)}`}
                    fill="currentColor"
                  />
                ) : specialNum?.type === "compass" ? (
                  <CompassArrow angleIndex={specialNum.angleIndex} />
                ) : specialNum?.type === "nearest2" ? (
                  <span
                    className={`${
                      specialNum.distances[0] === 1
                        ? "text-[16px]"
                        : "text-[8px]"
                    } ${getNumberColorClass(specialNum.distances[1])}`}
                  >
                    {specialNum.distances[1]}
                  </span>
                ) : (
                  <span
                    className={`inline-block origin-center ml-[2px] text-lg ${getNumberColorClass(cell.state.num)}`}
                    style={
                      typeof cell.state.num === "number" &&
                      (Math.abs(cell.state.num) >= 10 || cell.state.num < 0)
                        ? { transform: "scaleX(0.75)" }
                        : undefined
                    }
                  >
                    {cell.state.num}
                  </span>
                ))}
              {cell.state.type === "flagged" &&
                (isColorsVariant ? (
                  <span
                    className={`font-minesweeper leading-none ${getColorClass(cell.state.flagNum)} text-[18px]`}
                  >
                    `
                  </span>
                ) : (
                  <div className="flex flex-wrap pt-[1px] gap-y-[1px] justify-center items-center">
                    {(() => {
                      const flagNum = cell.state.flagNum;
                      return Array.from({ length: Math.abs(flagNum) }).map(
                        (_, index) => (
                          <span
                            key={`flag-${index}`}
                            className={`${
                              flagNum < 0
                                ? "rotate-180 text-blue-500 mr-[2px]"
                                : "text-red-500 ml-[2px] leading-none"
                            } ${Math.abs(flagNum) > 1 ? "text-[10px]" : "text-[18px]"}`}
                          >
                            `
                          </span>
                        ),
                      );
                    })()}
                  </div>
                ))}
              {cell.state.type === "hidden" && isFlagToggled && (
                <span className="text-[18px] ml-[2px] leading-none opacity-15">
                  `
                </span>
              )}
            </div>
          );
        }),
      )}
    </>
  );
};
