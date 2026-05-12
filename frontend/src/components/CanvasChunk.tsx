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

const CanvasChunk = ({ chunkX, chunkY, state }: CanvasChunkProps) => {
  return (
    <div
      className="relative grid border-game-border bg-game-border"
      style={{
        gridTemplateColumns: "repeat(16, 30px)",
        gridTemplateRows: "repeat(16, 30px)",
      }}
    >
      <div 
        className={`pointer-events-none absolute inset-0 ${getTintClass(state)}`}
        style={{ zIndex: 100 }}
      />
      {Array.from({ length: 16 * 16 }).map((_, index) => {
        const row = Math.floor(index / 16);
        const col = index % 16;

        return (
          <div
            key={`${chunkX}:${chunkY}:${row}:${col}`}
            className="relative z-10 flex justify-center items-center border border-game-border bg-game-hidden rounded-sm overflow-hidden"
          />
        );
      })}
      <div
        className="pointer-events-none absolute inset-0 border border-red-500"
        style={{ zIndex: 100 }}
      />
    </div>
  );
};

export default CanvasChunk;
