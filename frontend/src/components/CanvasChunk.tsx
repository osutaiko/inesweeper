import { useEffect, useRef } from "react";

import { CHUNK_SIZE } from "@/lib/coordinates";
import {
  decodeMineBitmap,
  isMineInBitmap,
  type CanvasChunkMineLookup,
} from "@/lib/canvas";
import { LockKeyhole } from "lucide-react";

const CELL_SIZE = 30;
const CHUNK_PIXEL_SIZE = CHUNK_SIZE * CELL_SIZE;

type CanvasChunkProps = {
  chunkX: number;
  chunkY: number;
  state: "open" | "locked" | "solved";
  colorClassName: string;
  mineBitmap: string | null;
  neighborMineLookup: CanvasChunkMineLookup | null;
  onClick: () => void;
};

const getNumberColorProperty = (num: number) =>
  `--game-number-${num % 8 === 0 ? 8 : num % 8}`;

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

const CanvasChunkPreview = ({
  chunkX,
  chunkY,
  mineBitmap,
  neighborMineLookup,
}: Pick<
  CanvasChunkProps,
  "chunkX" | "chunkY" | "mineBitmap" | "neighborMineLookup"
>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      return;
    }

    const mineBitmapBytes = decodeMineBitmap(mineBitmap);
    const draw = () => {
      const styles = getComputedStyle(document.documentElement);
      const gameBorder = styles.getPropertyValue("--game-border");
      const gameHidden = styles.getPropertyValue("--game-hidden");
      const gameRevealed = styles.getPropertyValue("--game-revealed");

      context.fillStyle = gameBorder;
      context.fillRect(0, 0, CHUNK_PIXEL_SIZE, CHUNK_PIXEL_SIZE);
      context.textAlign = "center";
      context.textBaseline = "middle";

      for (let displayRow = 0; displayRow < CHUNK_SIZE; displayRow += 1) {
        const localY = CHUNK_SIZE - 1 - displayRow;

        for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
          const worldX = chunkX * CHUNK_SIZE + localX;
          const worldY = chunkY * CHUNK_SIZE + localY;
          const isMine =
            mineBitmapBytes !== null &&
            isMineInBitmap(mineBitmapBytes, localX, localY);
          const neighborCount =
            !isMine && neighborMineLookup
              ? getNeighborCount(neighborMineLookup, worldX, worldY)
              : 0;
          const cellX = localX * CELL_SIZE;
          const cellY = displayRow * CELL_SIZE;

          context.fillStyle = isMine ? gameHidden : gameRevealed;
          context.fillRect(
            cellX + 1,
            cellY + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2,
          );

          if (isMine) {
            context.fillStyle = "#ef4444";
            context.font = "18px MineSweeper";
            context.fillText(
              "`",
              cellX + CELL_SIZE / 2 + 1,
              cellY + CELL_SIZE / 2,
            );
          } else if (neighborCount) {
            context.fillStyle = styles.getPropertyValue(
              getNumberColorProperty(neighborCount),
            );
            context.font = "18px MineSweeper";
            context.fillText(
              String(neighborCount),
              cellX + CELL_SIZE / 2 + 1,
              cellY + CELL_SIZE / 2,
            );
          }
        }
      }
    };

    draw();
    void document.fonts.load("18px MineSweeper").then(draw);

    const themeObserver = new MutationObserver(draw);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    });

    return () => themeObserver.disconnect();
  }, [chunkX, chunkY, mineBitmap, neighborMineLookup]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 z-10 size-full"
      height={CHUNK_PIXEL_SIZE}
      width={CHUNK_PIXEL_SIZE}
    />
  );
};

const CanvasChunk = ({
  chunkX,
  chunkY,
  state,
  colorClassName,
  mineBitmap,
  neighborMineLookup,
  onClick,
}: CanvasChunkProps) => {
  const renderDetails = mineBitmap !== null;
  const renderCells = renderDetails && state === "solved";
  const backgroundClassName = renderDetails
    ? colorClassName
    : state === "solved"
      ? "bg-game-revealed"
      : state === "locked"
        ? "bg-game-chunklocked"
        : "";

  return (
    <div
      className={`relative grid ${backgroundClassName}`}
      onClick={onClick}
      style={{
        width: CHUNK_PIXEL_SIZE,
        height: CHUNK_PIXEL_SIZE,
      }}
    >
      {renderDetails && state === "locked" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <LockKeyhole size={100} />
        </div>
      )}
      {renderCells && (
        <CanvasChunkPreview
          chunkX={chunkX}
          chunkY={chunkY}
          mineBitmap={mineBitmap}
          neighborMineLookup={neighborMineLookup}
        />
      )}
    </div>
  );
};

export default CanvasChunk;
