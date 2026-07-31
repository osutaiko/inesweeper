import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { GameBoardGrid } from "./GameBoardGrid";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  buildCanvasMineLookup,
  failCanvasChunk,
  solveCanvasChunk,
  type CanvasChunk,
  type CanvasChunkAreaResponse,
} from "@/lib/canvas";
import { CHUNK_SIZE } from "@/lib/coordinates";
import { useMinesweeperControls } from "@/hooks/useMinesweeperControls";
import {
  countRemainingFlags,
  handleChord,
  handleClick,
  handleFlag,
  isLoss,
  isWin,
} from "@/lib/minesweeper";
import type { Board, BoardConfig } from "@/lib/types";
import { getMsParts, timeLeftUntil } from "@/lib/utils";

const CONTEXT_SIZE = 4;
const SOLVER_SIZE = CHUNK_SIZE + CONTEXT_SIZE * 2;
const FADE_SIZE_PX = 60;
const CLAIM_COOLDOWN_MS = 5 * 60 * 1000;

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
  isTouchscreen: boolean;
};

const getTargetChunkBoard = (board: Board) =>
  board
    .slice(CONTEXT_SIZE, CONTEXT_SIZE + CHUNK_SIZE)
    .map((row) => row.slice(CONTEXT_SIZE, CONTEXT_SIZE + CHUNK_SIZE));

const isInsideTargetChunk = (row: number, col: number) =>
  col >= CONTEXT_SIZE &&
  col < CONTEXT_SIZE + CHUNK_SIZE &&
  row >= CONTEXT_SIZE &&
  row < CONTEXT_SIZE + CHUNK_SIZE;

const chordInitialBorderCells = (board: Board) => {
  let chordedBoard = board;
  const borderStart = CONTEXT_SIZE - 1;
  const borderEnd = CONTEXT_SIZE + CHUNK_SIZE;
  const chordNullCell = (row: number, col: number) => {
    const cell = board[row][col];
    if (cell.state.type === "revealed" && cell.state.num === null) {
      chordedBoard = handleChord(chordedBoard, row, col, SOLVER_CONFIG);
    }
  };

  for (let position = borderStart; position <= borderEnd; position += 1) {
    chordNullCell(borderStart, position);
    chordNullCell(borderEnd, position);
  }

  for (let position = CONTEXT_SIZE; position < borderEnd; position += 1) {
    chordNullCell(position, borderStart);
    chordNullCell(position, borderEnd);
  }

  return chordedBoard;
};

const CanvasGameBoard = ({
  chunk,
  chunkArea,
  isTouchscreen,
}: CanvasGameBoardProps) => {
  const navigate = useNavigate();
  const [remainingMs, setRemainingMs] = useState(() =>
    timeLeftUntil(chunk.lockedUntil),
  );
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);
  const [nextClaimInMs, setNextClaimInMs] = useState(0);
  const [gameOverReason, setGameOverReason] = useState<
    "win" | "mine" | "expired" | "error" | null
  >(null);
  const [isGameOverDialogOpen, setIsGameOverDialogOpen] = useState(false);
  const [explodedCell, setExplodedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const isGameOverRef = useRef(false);
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
  const [initialChordedBoard] = useState<Board>(() =>
    chordInitialBorderCells(initialBoard),
  );
  const [board, setBoard] = useState<Board>(initialChordedBoard);

  const doAfterLoss = (reason: "mine" | "expired") => {
    if (isGameOverRef.current) {
      return;
    }

    isGameOverRef.current = true;
    const retryAt = new Date(Date.now() + CLAIM_COOLDOWN_MS).toISOString();
    setNextClaimAt(retryAt);
    setNextClaimInMs(timeLeftUntil(retryAt));
    setGameOverReason(reason);
    setIsGameOverDialogOpen(true);
    void failCanvasChunk().catch(() => setGameOverReason("error"));
  };

  const doAfterWin = async () => {
    if (isGameOverRef.current) {
      return;
    }

    isGameOverRef.current = true;
    setNextClaimAt(chunk.lockedUntil);
    setNextClaimInMs(timeLeftUntil(chunk.lockedUntil));
    setGameOverReason("win");

    try {
      await solveCanvasChunk();
    } catch {
      setGameOverReason("error");
    }

    setIsGameOverDialogOpen(true);
  };

  const applyBoardAction = (action: (currentBoard: Board) => Board) => {
    if (isGameOverRef.current) {
      return;
    }

    const updatedBoard = action(board).map((boardRow, rowIndex) =>
      boardRow.map((cell, colIndex) =>
        isInsideTargetChunk(rowIndex, colIndex) ||
        initialChordedBoard[rowIndex][colIndex].state.type !== "hidden"
          ? cell
          : {
              ...cell,
              state: { type: "hidden" as const },
            },
      ),
    );
    const loss = isLoss(updatedBoard);

    setBoard(updatedBoard);
    if (loss) {
      setExplodedCell(loss);
      doAfterLoss("mine");
    } else if (isWin(getTargetChunkBoard(updatedBoard))) {
      void doAfterWin();
    }
  };
  const {
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useMinesweeperControls({
    disabled: gameOverReason !== null,
    isTouchscreen,
    touchHoldDelay: Number(
      localStorage.getItem("touchHoldDelay") ?? 200,
    ),
    canReveal: isInsideTargetChunk,
    canFlag: (row, col) =>
      isInsideTargetChunk(row, col) &&
      board[row][col].state.type !== "revealed",
    canChord: (row, col) =>
      board[row][col].state.type === "revealed" &&
      board[row][col].state.num !== null,
    canTouchChord: (row, col) =>
      board[row][col].state.type === "revealed" &&
      board[row][col].state.num !== null,
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
    const updateRemainingMs = () => {
      setRemainingMs(timeLeftUntil(chunk.lockedUntil));
    };
    const expireLock = () => {
      setRemainingMs(0);
      doAfterLoss("expired");
    };

    updateRemainingMs();
    const intervalId = window.setInterval(updateRemainingMs, 1000);
    const timeoutId = window.setTimeout(
      expireLock,
      timeLeftUntil(chunk.lockedUntil),
    );
    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [chunk.lockedUntil]);

  useEffect(() => {
    if (!nextClaimAt) {
      return;
    }

    const updateNextClaimInMs = () => {
      setNextClaimInMs(timeLeftUntil(nextClaimAt));
    };

    updateNextClaimInMs();
    const intervalId = window.setInterval(updateNextClaimInMs, 1000);
    return () => window.clearInterval(intervalId);
  }, [nextClaimAt]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const {
    minutes: remainingMinutes,
    seconds: remainingSecondsPart,
  } = getMsParts(remainingSeconds * 1000);
  const nextClaimInSeconds = Math.ceil(nextClaimInMs / 1000);
  const {
    minutes: nextClaimInMinutes,
    seconds: nextClaimInSecondsPart,
  } = getMsParts(nextClaimInSeconds * 1000);
  const { remainingPosFlags } = countRemainingFlags(
    getTargetChunkBoard(board),
  );

  return (
    <div className="flex h-min w-min select-none flex-col overflow-hidden rounded-md">
        <div className="border-x-[9px] border-t-[9px] border-game-border bg-game-border">
          <div className="relative flex items-center justify-between rounded-sm bg-game-hidden p-2">
            <div className="flex h-[40px] gap-x-2 overflow-hidden bg-game-button px-3">
              <div className="flex flex-row items-center gap-1.5">
                <span className="font-minesweeper text-[20px] text-red-500">
                  `
                </span>
                <span className="text-xl font-bold">
                  {remainingPosFlags}
                </span>
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center px-3 h-[40px] text-lg font-bold bg-game-button">
              Chunk (X={chunk.chunkX}, Y={chunk.chunkY})
            </div>
            <div className={`flex h-[40px] min-w-[80px] items-center justify-center
              ${remainingSeconds === 0 || (remainingSeconds <= 30 && remainingSeconds % 2 === 0) ? 'bg-destructive' : 'bg-game-button'}
              px-3 text-xl font-bold`}
            >
              {remainingMinutes}:
              {String(remainingSecondsPart).padStart(2, "0")} Left
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
            isGameOver={
              gameOverReason === "win"
                ? "win"
                : gameOverReason === "mine"
                  ? "loss"
                  : null
            }
            explodedCell={explodedCell}
            incorrectFlagCells={[]}
            shadedCells={[]}
            isFlagToggled={false}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
        <Dialog
          open={isGameOverDialogOpen}
          onOpenChange={setIsGameOverDialogOpen}
        >
          <DialogContent
            className="max-w-sm"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {gameOverReason === "win" ? "Chunk Claimed!" : "Failed Claim!"}
              </DialogTitle>
              <DialogDescription>
                {gameOverReason === "win"
                  ? "You successfully claimed this chunk!"
                  : gameOverReason === "mine"
                    ? "You revealed a mine..."
                    : gameOverReason === "expired"
                      ? "Claim attempt time expired..."
                      : "Something went wrong"}
              </DialogDescription>
            </DialogHeader>
            You may attempt to claim a chunk again in {nextClaimInMinutes}:{String(nextClaimInSecondsPart).padStart(2, "0")}.
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsGameOverDialogOpen(false)}
              >
                View Chunk
              </Button>
              <Button onClick={() => navigate("/place")}>
                Return to Map
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default CanvasGameBoard;
