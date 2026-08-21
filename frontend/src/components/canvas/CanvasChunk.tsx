import { LockKeyhole } from "lucide-react";
import { CHUNK_SIZE } from "@/lib/canvas/coordinates";
import { CanvasChunkPreview } from "./CanvasChunkPreview";

const CELL_SIZE = 30;
const CHUNK_PIXEL_SIZE = CHUNK_SIZE * CELL_SIZE;

export type CanvasChunkProps = {
  chunkX: number;
  chunkY: number;
  state: "open" | "locked" | "solved";
  colorClassName: string;
  mineBitmap: string | null;
  edgeNibbleMap: string | null;
  onClick: () => void;
};

const CanvasChunk = ({
  chunkX,
  chunkY,
  state,
  colorClassName,
  mineBitmap,
  edgeNibbleMap,
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
      {state === "locked" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <LockKeyhole size={100} />
        </div>
      )}
      {renderCells && (
        <CanvasChunkPreview
          chunkX={chunkX}
          chunkY={chunkY}
          mineBitmap={mineBitmap}
          edgeNibbleMap={edgeNibbleMap}
        />
      )}
    </div>
  );
};

export default CanvasChunk;


