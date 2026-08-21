import { Square } from "lucide-react";

import CanvasChunk from "./CanvasChunk";
import SelectedChunkOverlay from "./SelectedChunkOverlay";
import type { CanvasChunkAreaResponse } from "@/lib/canvas/api";

export const CHUNK_PIXEL_SIZE = 480;
export const CHUNK_ORIGIN_OFFSET = -CHUNK_PIXEL_SIZE / 2;

type CanvasViewportProps = {
  chunkArea: CanvasChunkAreaResponse | null;
  selectedChunkId: string | null;
  showMySolvedOnly: boolean;
  onChunkClick: (chunkId: string) => void;
};

export const CanvasViewport = ({
  chunkArea,
  selectedChunkId,
  showMySolvedOnly,
  onChunkClick,
}: CanvasViewportProps) => {
  const chunkByCoord = new Map(
    (chunkArea?.chunks ?? []).map((chunk) => [
      `${chunk.chunkX}:${chunk.chunkY}`,
      chunk,
    ]),
  );

  const hasSolvedNeighbor = (chunkX: number, chunkY: number) => {
    return (
      chunkByCoord.get(`${chunkX}:${chunkY + 1}`)?.state === "solved" ||
      chunkByCoord.get(`${chunkX}:${chunkY - 1}`)?.state === "solved" ||
      chunkByCoord.get(`${chunkX + 1}:${chunkY}`)?.state === "solved" ||
      chunkByCoord.get(`${chunkX - 1}:${chunkY}`)?.state === "solved"
    );
  };
  const claimableChunkIds = new Set<string>();

  for (const chunk of chunkArea?.chunks ?? []) {
    if (chunk.state !== "solved") {
      continue;
    }

    for (const [chunkX, chunkY] of [
      [chunk.chunkX, chunk.chunkY + 1],
      [chunk.chunkX, chunk.chunkY - 1],
      [chunk.chunkX + 1, chunk.chunkY],
      [chunk.chunkX - 1, chunk.chunkY],
    ]) {
      if (
        !chunkArea ||
        chunkX <= chunkArea.fromChunkX ||
        chunkX >= chunkArea.toChunkX ||
        chunkY <= chunkArea.fromChunkY ||
        chunkY >= chunkArea.toChunkY
      ) {
        continue;
      }

      const chunkId = `${chunkX}:${chunkY}`;
      if (!chunkByCoord.has(chunkId)) {
        claimableChunkIds.add(chunkId);
      } else if (chunkByCoord.get(chunkId)?.state === "open") {
        claimableChunkIds.add(chunkId);
      }
    }
  }

  return (
    <div className="relative size-px">
      {(chunkArea?.chunks ?? []).map((chunk) => (
        <div
          key={`${chunk.chunkX}:${chunk.chunkY}`}
          id={`chunk-${chunk.chunkX}:${chunk.chunkY}`}
          className={`absolute ${
            showMySolvedOnly &&
            chunk.state === "solved" &&
            !chunk.isSolvedByMe
              ? "opacity-25"
              : ""
          }`}
          style={{
            left: chunk.chunkX * CHUNK_PIXEL_SIZE + CHUNK_ORIGIN_OFFSET,
            top: -chunk.chunkY * CHUNK_PIXEL_SIZE + CHUNK_ORIGIN_OFFSET,
          }}
        >
          <CanvasChunk
            chunkX={chunk.chunkX}
            chunkY={chunk.chunkY}
            state={chunk.state}
            colorClassName={
              chunk.state === "solved"
                ? "bg-game-border"
                : chunk.state === "locked" &&
                    hasSolvedNeighbor(chunk.chunkX, chunk.chunkY)
                  ? "bg-game-chunklocked"
                  : ""
            }
            mineBitmap={chunk.mineBitmap}
            edgeNibbleMap={chunk.edgeNibbleMap}
            onClick={() => onChunkClick(`${chunk.chunkX}:${chunk.chunkY}`)}
          />
        </div>
      ))}
      {[...claimableChunkIds].map((chunkId) => {
        const [chunkX, chunkY] = chunkId.split(":").map(Number);

        return (
          <div
            key={chunkId}
            className="pointer-events-none absolute flex items-center justify-center"
            style={{
              left: chunkX * CHUNK_PIXEL_SIZE + CHUNK_ORIGIN_OFFSET,
              top: -chunkY * CHUNK_PIXEL_SIZE + CHUNK_ORIGIN_OFFSET,
              width: CHUNK_PIXEL_SIZE,
              height: CHUNK_PIXEL_SIZE,
            }}
          >
            <Square size={30} className="text-green-500 fill-green-500" />
          </div>
        );
      })}
      {selectedChunkId && (
        <SelectedChunkOverlay
          chunkId={selectedChunkId}
          chunkOriginOffset={CHUNK_ORIGIN_OFFSET}
          chunkPixelSize={CHUNK_PIXEL_SIZE}
        />
      )}
    </div>
  );
};
