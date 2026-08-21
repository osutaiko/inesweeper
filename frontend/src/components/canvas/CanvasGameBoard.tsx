import { useEffect, useMemo, useRef, useState } from "react";
import { ClockFading } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { GameBoardGrid } from "../GameBoardGrid";
import TouchFlagButton from "../TouchFlagButton";
import { Button } from "../ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/shadcn/dialog";
import {
  decodeEdgeNibbleMap,
  decodeMineBitmap,
  isMineInBitmap,
  failCanvasChunk,
  solveCanvasChunk,
  type CanvasChunk,
  type CanvasChunkAreaResponse,
} from "@/lib/canvas/api";
import {
  CHUNK_EDGE_INDEX_BY_LOCAL,
  CHUNK_SIZE,
  formatChunkCoordinates,
  iterateAdjacentOffsets,
} from "@/lib/canvas/coordinates";
import { useMinesweeperControls } from "@/hooks/useMinesweeperControls";
import {
  countRemainingFlags,
  flagAllMines,
  handleChord,
  handleClick,
  handleFlag,
  isLoss,
  isWin,
} from "@/lib/minesweeper";
import type { Board, BoardConfig } from "@/lib/types";
import { getMsParts, timeLeftUntil } from "@/lib/utils";
import { useSiteLayout } from "../Layout";

const CONTEXT_SIZE = 4;
const SOLVER_SIZE = CHUNK_SIZE + CONTEXT_SIZE * 2;

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

const getTargetFailedMineIndex = (row: number, col: number) =>
  (CHUNK_SIZE - 1 - (row - CONTEXT_SIZE)) * CHUNK_SIZE +
  (col - CONTEXT_SIZE);

const chordInitialBorderCells = (board: Board) => {
  let chordedBoard = board;
  const borderStart = CONTEXT_SIZE - 1;
  const borderEnd = CONTEXT_SIZE + CHUNK_SIZE;

  const chordNullCell = (row: number, col: number) => {
    const cell = board[row][col];

    if (cell.state.type === "revealed" && cell.state.num === null) {
      chordedBoard = handleChord(
        chordedBoard,
        row,
        col,
        SOLVER_CONFIG,
        isInsideTargetChunk,
      );
    }
  };

  for (let position = borderStart; position <= borderEnd; position++) {
    chordNullCell(borderStart, position);
    chordNullCell(borderEnd, position);
  }

  for (let position = CONTEXT_SIZE; position < borderEnd; position++) {
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
  const { chordingMode, zoom, flagButtonSize, flagButtonPosition } = useSiteLayout();
  const [remainingMs, setRemainingMs] = useState(() =>
    timeLeftUntil(chunk.lockedUntil),
  );
  const [nextClaimAt, setNextClaimAt] = useState<string | null>(null);
  const [nextClaimInMs, setNextClaimInMs] = useState(0);
  const [isFlagToggled, setIsFlagToggled] = useState(false);
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
  const failedMineSet = useMemo(
    () => new Set(chunk.failedMines),
    [chunk.failedMines],
  );
  const initialBoard: Board = useMemo(
    () =>
      Array.from({ length: SOLVER_SIZE }, (_, row) =>
        Array.from({ length: SOLVER_SIZE }, (_, col) => {
          const worldX = (chunk.chunkX * CHUNK_SIZE) - CONTEXT_SIZE + col;
          const worldY = (chunk.chunkY * CHUNK_SIZE) + CHUNK_SIZE - 1 + CONTEXT_SIZE - row;
          const cellChunkX = Math.floor(worldX / CHUNK_SIZE);
          const cellChunkY = Math.floor(worldY / CHUNK_SIZE);
          const chunkAtCell = chunkByCoord.get(`${cellChunkX}:${cellChunkY}`);
          const isSolvedContext = chunkAtCell?.state === "solved";
          const localX = worldX - cellChunkX * CHUNK_SIZE;
          const localY = worldY - cellChunkY * CHUNK_SIZE;
          const mineBitmapBytes = decodeMineBitmap(chunkAtCell?.mineBitmap ?? null);
          const isMine =
            mineBitmapBytes !== null &&
            isMineInBitmap(mineBitmapBytes, localX, localY);
          let neighborCount = 0;

          if (isSolvedContext && mineBitmapBytes && !isMine) {
            iterateAdjacentOffsets((dx, dy) => {
              const neighborLocalX = localX + dx;
              const neighborLocalY = localY + dy;

              if (
                neighborLocalX < 0 ||
                neighborLocalX >= CHUNK_SIZE ||
                neighborLocalY < 0 ||
                neighborLocalY >= CHUNK_SIZE
              ) {
                return;
              }

              if (
                isMineInBitmap(
                  mineBitmapBytes,
                  neighborLocalX,
                  neighborLocalY,
                )
              ) {
                neighborCount++;
              }
            });
          }

          const edgeNibbleMap =
            chunkAtCell?.edgeNibbleMap === null
              ? null
              : decodeEdgeNibbleMap(chunkAtCell?.edgeNibbleMap ?? null);
          const boundaryIndex =
            CHUNK_EDGE_INDEX_BY_LOCAL.get(`${localX}:${localY}`) ?? -1;
          const boundaryCount =
            boundaryIndex >= 0 && edgeNibbleMap
              ? edgeNibbleMap[boundaryIndex] ?? 0
              : 0;
          const isFailedMine =
            isInsideTargetChunk(row, col) &&
            failedMineSet.has(getTargetFailedMineIndex(row, col));

          return {
            mineNum: isMine ? 1 : 0,
            state: isFailedMine
              ? { type: "flagged" as const, flagNum: 1 }
              : isSolvedContext
              ? isMine
                ? { type: "flagged" as const, flagNum: 1 }
                : {
                    type: "revealed" as const,
                    num: (neighborCount + boundaryCount) || null,
                  }
              : { type: "hidden" as const },
          };
        }),
      ),
    [chunk.chunkX, chunk.chunkY, chunkByCoord, failedMineSet],
  );
  const [initialChordedBoard] = useState<Board>(() =>
    chordInitialBorderCells(initialBoard),
  );
  const [board, setBoard] = useState<Board>(initialChordedBoard);

  useEffect(() => {
    setBoard(initialChordedBoard);
  }, [initialChordedBoard]);

  const doAfterLoss = (
    reason: "mine" | "expired",
    failedMineIndex?: number,
  ) => {
    if (isGameOverRef.current) {
      return;
    }

    isGameOverRef.current = true;
    setGameOverReason(reason);
    setIsGameOverDialogOpen(true);
    void failCanvasChunk(failedMineIndex)
      .then(({ nextLockAt }) => {
        setNextClaimAt(nextLockAt);
        setNextClaimInMs(timeLeftUntil(nextLockAt));
      })
      .catch(() => setGameOverReason("error"));
  };

  const doAfterWin = async () => {
    if (isGameOverRef.current) {
      return;
    }

    isGameOverRef.current = true;
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
      doAfterLoss("mine", getTargetFailedMineIndex(loss.row, loss.col));
    } else if (isWin(getTargetChunkBoard(updatedBoard))) {
      setBoard(flagAllMines(updatedBoard, isInsideTargetChunk));
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
    isFlagToggled,
    canReveal: (row, col) =>
      isInsideTargetChunk(row, col) &&
      !failedMineSet.has(getTargetFailedMineIndex(row, col)),
    canFlag: (row, col) =>
      isInsideTargetChunk(row, col) &&
      !failedMineSet.has(getTargetFailedMineIndex(row, col)) &&
      board[row][col].state.type !== "revealed",
    canChord: (row, col) =>
      board[row][col].state.type === "revealed" &&
      board[row][col].state.num !== null,
    canTouchChord: (row, col) =>
      board[row][col].state.type === "revealed" &&
      board[row][col].state.num !== null,
    chordingMode,
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
        handleChord(currentBoard, row, col, SOLVER_CONFIG, isInsideTargetChunk),
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
  const formattedNextClaimTime = nextClaimAt
    ? `${nextClaimInMinutes}:${String(nextClaimInSecondsPart).padStart(2, "0")}`
    : "-:--";
  const { remainingPosFlags } = countRemainingFlags(
    getTargetChunkBoard(board),
  );

  return (
    <>
      <div
        className="select-none"
        style={{
          width: `${(30 * SOLVER_SIZE + 16) * (zoom / 100)}px`,
          height: `${(30 * SOLVER_SIZE + 81) * (zoom / 100)}px`,
        }}
      >
      <div
        className="flex h-min w-min select-none flex-col overflow-hidden rounded-md"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
        }}
      >
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
              Chunk {formatChunkCoordinates(chunk.chunkX, chunk.chunkY)}
            </div>
            <div className={`flex h-[40px] min-w-[80px] items-center justify-center gap-1
              ${remainingSeconds === 0 || (remainingSeconds <= 30 && remainingSeconds % 2 === 0) ? 'bg-destructive' : 'bg-game-button'}
              px-3 text-xl font-bold`}
            >
              <ClockFading />
              {gameOverReason === "mine" || gameOverReason === "win"
                ? "-:--"
                : `${remainingMinutes}:${String(remainingSecondsPart).padStart(2, "0")}`}
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
            isFlagToggled={isFlagToggled}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onHoveredCellChange={() => {}}
            failedCells={Array.from(failedMineSet, (index) => ({
              row:
                CONTEXT_SIZE +
                (CHUNK_SIZE - 1 - Math.floor(index / CHUNK_SIZE)),
              col: CONTEXT_SIZE + (index % CHUNK_SIZE),
            }))}
            getCellClassName={(row, col) => {
              const classes = [];
              const contextDistance = Math.max(
                CONTEXT_SIZE - row, row - (CONTEXT_SIZE + CHUNK_SIZE - 1),
                CONTEXT_SIZE - col, col - (CONTEXT_SIZE + CHUNK_SIZE - 1),
              );

              if (contextDistance === 3) {
                classes.push("opacity-60");
              } else if (contextDistance === 4) {
                classes.push("opacity-30");
              }

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
                  ? `You solved and claimed chunk ${formatChunkCoordinates(chunk.chunkX, chunk.chunkY)}!`
                  : gameOverReason === "mine"
                    ? "You revealed a mine..."
                    : gameOverReason === "expired"
                      ? "Claim attempt time expired..."
                      : "Something went wrong"}
              </DialogDescription>
            </DialogHeader>
            {gameOverReason === "win" && (
              <p>You may attempt to claim another chunk immediately.</p>
            )}
            {(gameOverReason === "mine" || gameOverReason === "expired") && (
              <p>
                You may attempt to claim a chunk again in{" "}
                <span className="underline text-destructive">
                  {formattedNextClaimTime}
                </span>
                , after the 30-second cooldown is over.
              </p>
            )}
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
      </div>
      {isTouchscreen && gameOverReason === null && (
        <TouchFlagButton
          flagButtonSize={flagButtonSize}
          flagButtonPosition={flagButtonPosition}
          isFlagToggled={isFlagToggled}
          onClick={() => setIsFlagToggled((current) => !current)}
        />
      )}
    </>
  );
};

export default CanvasGameBoard;


