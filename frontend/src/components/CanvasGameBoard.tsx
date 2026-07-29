import { useEffect, useState } from "react";

import { GameBoardGrid } from "./GameBoardGrid";
import {
  buildCanvasMineLookup,
  type CanvasChunk,
  type CanvasChunkAreaResponse,
} from "@/lib/canvas";
import { CHUNK_SIZE } from "@/lib/coordinates";
import { useMinesweeperControls } from "@/hooks/useMinesweeperControls";
import {
  handleChord,
  handleClick,
  handleFlag,
} from "@/lib/minesweeper";
import type { Board, BoardConfig } from "@/lib/types";

const CONTEXT_SIZE = 4;
const SOLVER_SIZE = CHUNK_SIZE + CONTEXT_SIZE * 2;
const FADE_SIZE_PX = 60;

const SOLVER_CONFIG: BoardConfig = {
  width: SOLVER_SIZE,
  height: SOLVER_SIZE,
  maxMinesPerCell: 1,
  mineTileCount: 0,
  posMineCount: 1,
  negMineCount: 0,
  cellNumberDeviant: null,
  mineGenDeviant: null,
};

type CanvasGameBoardProps = {
  chunk: CanvasChunk;
  chunkArea: CanvasChunkAreaResponse;
};

const CanvasGameBoard = ({ chunk, chunkArea }: CanvasGameBoardProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const chunks = chunkArea.chunks.map((areaChunk) =>
    areaChunk.chunkX === chunk.chunkX && areaChunk.chunkY === chunk.chunkY
      ? chunk
      : areaChunk,
  );
  const chunkByCoord = new Map(
    chunks.map((areaChunk) => [
      `${areaChunk.chunkX}:${areaChunk.chunkY}`,
      areaChunk,
    ]),
  );
  const mineLookup = buildCanvasMineLookup(chunks);
  const minWorldX = chunk.chunkX * CHUNK_SIZE - CONTEXT_SIZE;
  const maxWorldY =
    chunk.chunkY * CHUNK_SIZE + CHUNK_SIZE - 1 + CONTEXT_SIZE;

  const initialBoard: Board = Array.from({ length: SOLVER_SIZE }, (_, row) =>
    Array.from({ length: SOLVER_SIZE }, (_, col) => {
      const worldX = minWorldX + col;
      const worldY = maxWorldY - row;
      const cellChunkX = Math.floor(worldX / CHUNK_SIZE);
      const cellChunkY = Math.floor(worldY / CHUNK_SIZE);
      const isSolvedContext =
        chunkByCoord.get(`${cellChunkX}:${cellChunkY}`)?.state === "solved";
      const mineNum = mineLookup(worldX, worldY) ? 1 : 0;
      let neighborCount = 0;

      if (isSolvedContext && !mineNum) {
        for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
          for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
            if (
              (deltaX !== 0 || deltaY !== 0) &&
              mineLookup(worldX + deltaX, worldY + deltaY)
            ) {
              neighborCount += 1;
            }
          }
        }
      }

      return {
        mineNum,
        state: isSolvedContext
          ? mineNum
            ? { type: "flagged" as const, flagNum: 1 }
            : {
              type: "revealed" as const,
              num: neighborCount || null,
            }
          : { type: "hidden" as const },
      };
    }),
  );
  const [board, setBoard] = useState<Board>(initialBoard);

  const isInsideTargetChunk = (row: number, col: number) =>
    col >= CONTEXT_SIZE &&
    col < CONTEXT_SIZE + CHUNK_SIZE &&
    row >= CONTEXT_SIZE &&
    row < CONTEXT_SIZE + CHUNK_SIZE;

  const applyBoardAction = (action: (currentBoard: Board) => Board) => {
    setBoard((currentBoard) =>
      action(currentBoard).map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          isInsideTargetChunk(rowIndex, colIndex) ||
          initialBoard[rowIndex][colIndex].state.type !== "hidden"
            ? cell
            : {
                ...cell,
                state: { type: "hidden" as const },
              },
        ),
      ),
    );
  };
  const { onMouseDown, onMouseUp } = useMinesweeperControls({
    canReveal: isInsideTargetChunk,
    canFlag: isInsideTargetChunk,
    canChord: () => true,
    onReveal: (row, col) => {
      applyBoardAction((currentBoard) =>
        handleClick(currentBoard, row, col, SOLVER_CONFIG),
      );
    },
    onFlag: (row, col) => {
      applyBoardAction((currentBoard) =>
        handleFlag(currentBoard, row, col, SOLVER_CONFIG),
      );
    },
    onChord: (row, col) => {
      applyBoardAction((currentBoard) =>
        handleChord(currentBoard, row, col, SOLVER_CONFIG),
      );
    },
  });

  useEffect(() => {
    const updateRemainingSeconds = () => {
      const lockedUntil = chunk.lockedUntil
        ? new Date(chunk.lockedUntil).getTime()
        : Date.now();
      setRemainingSeconds(
        Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)),
      );
    };

    updateRemainingSeconds();
    const intervalId = window.setInterval(updateRemainingSeconds, 1000);
    return () => window.clearInterval(intervalId);
  }, [chunk.lockedUntil]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div className="flex h-min w-min select-none flex-col overflow-hidden rounded-md">
        <div className="border-x-[9px] border-t-[9px] border-game-border bg-game-border">
          <div className="relative flex items-center justify-between rounded-sm bg-game-hidden p-2">
            <div className="flex size-[40px] shrink-0 items-center justify-center bg-game-button text-xl font-bold">
              ?
            </div>
            <div className="px-4 text-lg font-bold">
              Chunk (X={chunk.chunkX}, Y={chunk.chunkY})
            </div>
            <div className="flex h-[40px] min-w-[80px] items-center justify-center rounded-md bg-game-button px-3 text-xl font-bold">
              {minutes}:{seconds}
            </div>
          </div>
        </div>
        <div
          className="relative grid border-[8px] border-game-border bg-game-border"
          style={{
            gridTemplateColumns: `repeat(${SOLVER_SIZE}, 30px)`,
            gridTemplateRows: `repeat(${SOLVER_SIZE}, 30px)`,
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <GameBoardGrid
            board={board}
            config={SOLVER_CONFIG}
            isGameOver={null}
            explodedCell={null}
            incorrectFlagCells={null}
            shadedCells={[]}
            isFlagToggled={false}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchStart={() => {}}
            onTouchMove={() => {}}
            onTouchEnd={(_, row, col) => {
              if (
                !isInsideTargetChunk(row, col) ||
                board[row][col].state.type === "revealed"
              ) {
                applyBoardAction((currentBoard) =>
                  handleChord(currentBoard, row, col, SOLVER_CONFIG),
                );
              } else if (isInsideTargetChunk(row, col)) {
                applyBoardAction((currentBoard) =>
                  handleClick(currentBoard, row, col, SOLVER_CONFIG),
                );
              }
            }}
            onHoveredCellChange={() => {}}
            getCellClassName={(row, col) => {
              const classes = [];

              if (row === CONTEXT_SIZE) {
                classes.push("border-t border-t-foreground");
              }
              if (row === CONTEXT_SIZE + CHUNK_SIZE - 1) {
                classes.push("border-b border-b-foreground");
              }
              if (col === CONTEXT_SIZE) {
                classes.push("border-l border-l-foreground");
              }
              if (col === CONTEXT_SIZE + CHUNK_SIZE - 1) {
                classes.push("border-r border-r-foreground");
              }

              return classes.join(" ");
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(to right, var(--game-border), transparent ${FADE_SIZE_PX}px, transparent calc(100% - ${FADE_SIZE_PX}px), var(--game-border)), linear-gradient(to bottom, var(--game-border), transparent ${FADE_SIZE_PX}px, transparent calc(100% - ${FADE_SIZE_PX}px), var(--game-border))`,
            }}
          />
          <div
            className="pointer-events-none absolute z-20 ring-4 ring-destructive"
            style={{
              left: CONTEXT_SIZE * 30,
              top: CONTEXT_SIZE * 30,
              width: CHUNK_SIZE * 30,
              height: CHUNK_SIZE * 30,
            }}
          />
        </div>
    </div>
  );
};

export default CanvasGameBoard;
