import { CHUNK_SIZE } from "@/lib/coordinates";

type CanvasChunkProps = {
  chunkX: number;
  chunkY: number;
  state: "open" | "locked" | "solved";
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

const CanvasChunk = ({
  chunkX,
  chunkY,
  state,
}: CanvasChunkProps) => {
  const chunkId = `${chunkX}:${chunkY}`;
  const originWorldX = chunkX * CHUNK_SIZE;
  const originWorldY = chunkY * CHUNK_SIZE;

  return (
    <div
      className="relative grid border-game-border bg-game-border"
      style={{
        gridTemplateColumns: `repeat(${CHUNK_SIZE}, 30px)`,
        gridTemplateRows: `repeat(${CHUNK_SIZE}, 30px)`,
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${getTintClass(state)}`}
        style={{ zIndex: 100 }}
      />
      {Array.from({ length: CHUNK_SIZE }).flatMap((_, displayRow) => {
        const localY = CHUNK_SIZE - 1 - displayRow;

        return Array.from({ length: CHUNK_SIZE }).map((__, localX) => (
          <div
            key={`${chunkId}:${originWorldX + localX}:${originWorldY + localY}`}
            className="relative z-10 flex justify-center items-center border border-game-border bg-game-hidden rounded-sm overflow-hidden"
          />
        ));
      })}
      <div
        className="pointer-events-none absolute inset-0 border border-red-500"
        style={{ zIndex: 100 }}
      />
    </div>
  );
};

export default CanvasChunk;
