import { supabase } from "@/lib/supabase";

export type CanvasChunk = {
  chunkX: number;
  chunkY: number;
  state: "open" | "locked" | "solved";
  lockedByUserId: string | null;
  lockedByName: string | null;
  lockedAt: string | null;
  lockedUntil: string | null;
  solverUserId: string | null;
  solverName: string | null;
  solvedAt: string | null;
};

export type CanvasChunkAreaResponse = {
  fromChunkX: number;
  fromChunkY: number;
  toChunkX: number;
  toChunkY: number;
  chunks: CanvasChunk[];
};

type CanvasChunkRow = {
  chunk_x: number;
  chunk_y: number;
  state: CanvasChunk["state"];
  locked_by_user_id: string | null;
  locked_by_name: string | null;
  locked_at: string | null;
  locked_until: string | null;
  solver_user_id: string | null;
  solver_name: string | null;
  solved_at: string | null;
};

const toCanvasChunk = (row: CanvasChunkRow): CanvasChunk => ({
  chunkX: row.chunk_x,
  chunkY: row.chunk_y,
  state: row.state,
  lockedByUserId: row.locked_by_user_id,
  lockedByName: row.locked_by_name,
  lockedAt: row.locked_at,
  lockedUntil: row.locked_until,
  solverUserId: row.solver_user_id,
  solverName: row.solver_name,
  solvedAt: row.solved_at,
});

export const getCanvasChunkArea = async (
  fromChunkX: number,
  fromChunkY: number,
  toChunkX: number,
  toChunkY: number,
) => {
  const { data, error } = await supabase
    .from("canvas_chunks")
    .select("*")
    .gte("chunk_x", Math.min(fromChunkX, toChunkX))
    .lte("chunk_x", Math.max(fromChunkX, toChunkX))
    .gte("chunk_y", Math.min(fromChunkY, toChunkY))
    .lte("chunk_y", Math.max(fromChunkY, toChunkY));

  if (error) {
    throw new Error(error.message || "Chunk area request failed");
  }

  const startX = Math.min(fromChunkX, toChunkX);
  const endX = Math.max(fromChunkX, toChunkX);
  const startY = Math.min(fromChunkY, toChunkY);
  const endY = Math.max(fromChunkY, toChunkY);
  const chunkMap = new Map<string, CanvasChunk>();

  for (const row of (data ?? []) as CanvasChunkRow[]) {
    chunkMap.set(`${row.chunk_x}:${row.chunk_y}`, toCanvasChunk(row));
  }

  const chunks: CanvasChunk[] = [];
  for (let chunkY = endY; chunkY >= startY; chunkY -= 1) {
    for (let chunkX = startX; chunkX <= endX; chunkX += 1) {
      const key = `${chunkX}:${chunkY}`;
      chunks.push(
        chunkMap.get(key) ?? {
          chunkX,
          chunkY,
          state: "open",
          lockedByUserId: null,
          lockedByName: null,
          lockedAt: null,
          lockedUntil: null,
          solverUserId: null,
          solverName: null,
          solvedAt: null,
        },
      );
    }
  }

  return {
    fromChunkX: startX,
    fromChunkY: startY,
    toChunkX: endX,
    toChunkY: endY,
    chunks,
  } satisfies CanvasChunkAreaResponse;
};
