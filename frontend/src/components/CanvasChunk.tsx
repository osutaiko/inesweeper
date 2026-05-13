import { Flag } from "lucide-react";

import { CHUNK_SIZE } from "@/lib/coordinates";
import {
  decodeMineBitmap,
  isMineInBitmap,
  type CanvasChunkMineLookup,
} from "@/lib/canvas";

type CanvasChunkProps = {
  chunkX: number;
  chunkY: number;
  state: "open" | "locked" | "solved";
  mineBitmap: string | null;
  neighborMineLookup: CanvasChunkMineLookup | null;
};

const getNumberColorClass = (num: number) => {
  if (num === 0) {
    return "text-game-number-0";
  }

  return `text-game-number-${num % 8 === 0 ? 8 : num % 8}`;
};

const getTintClass = (state: CanvasChunkProps["state"]) => {
  if (state === "solved") {
    return "bg-green-500/20";
  }

  if (state === "locked") {
    return "bg-red-500/20";
  }

  return "";
};

const getNeighborCount = (
  neighborMineLookup: CanvasChunkMineLookup,
  worldX: number,
  worldY: number,
) => {
  let neighborCount = 0;

  for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
    for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
      if (deltaX === 0 && deltaY === 0) {
        continue;
      }

      if (neighborMineLookup(worldX + deltaX, worldY + deltaY)) {
        neighborCount += 1;
      }
    }
  }

  return neighborCount;
};

const CanvasChunk = ({
  chunkX,
  chunkY,
  state,
  mineBitmap,
  neighborMineLookup,
}: CanvasChunkProps) => {
  const chunkId = `${chunkX}:${chunkY}`;
  const tintClass = getTintClass(state);
  const renderCells = state === "solved";
  const mineBitmapBytes = renderCells ? decodeMineBitmap(mineBitmap) : null;

  return (
    <div
      className={`relative grid border-game-border ${
        tintClass || "bg-game-border"
      }`}
      style={{
        gridTemplateColumns: `repeat(${CHUNK_SIZE}, 30px)`,
        gridTemplateRows: `repeat(${CHUNK_SIZE}, 30px)`,
      }}
    >
      {renderCells &&
        Array.from({ length: CHUNK_SIZE }).flatMap((_, displayRow) => {
          const localY = CHUNK_SIZE - 1 - displayRow;

          return Array.from({ length: CHUNK_SIZE }).map((__, localX) => {
            const worldX = chunkX * CHUNK_SIZE + localX;
            const worldY = chunkY * CHUNK_SIZE + localY;
            const isMine =
              mineBitmapBytes !== null &&
              isMineInBitmap(mineBitmapBytes, localX, localY);
            const neighborCount =
              !isMine && neighborMineLookup
                ? getNeighborCount(neighborMineLookup, worldX, worldY)
                : 0;

            return (
              <div
                key={`${chunkId}:${localX}:${localY}`}
                className="relative z-10 flex justify-center items-center border border-game-border bg-game-hidden rounded-sm overflow-hidden"
              >
                {isMine ? (
                  <div className="flex flex-wrap pt-[1px] gap-y-[1px] justify-center items-center">
                    <Flag
                      className="w-[18px] h-[18px]"
                      stroke="red"
                      fill="red"
                    />
                  </div>
                ) : neighborCount ? (
                  <span
                    className={`font-bold text-xl ${getNumberColorClass(
                      neighborCount,
                    )}`}
                  >
                    {neighborCount}
                  </span>
                ) : null}
              </div>
            );
          });
        })}
      <div
        className={`pointer-events-none absolute inset-0 border border-red-500 ${
          "z-10"
        }`}
      />
    </div>
  );
};

export default CanvasChunk;
