export type Chunk = {
  chunkX: number;
  chunkY: number;
  state: 'open' | 'locked' | 'solved';
  lockedByUserId: string | null;
  lockedByName: string | null;
  lockedAt: string | null;
  lockedUntil: string | null;
  solverUserId: string | null;
  solverName: string | null;
  solvedAt: string | null;
  mineBitmap: string | null;
  edgeNibbleMap: string | null;
};

export type ChunkRecord = {
  chunkX: number;
  chunkY: number;
  state: Chunk['state'];
  lockedByUserId: string | null;
  lockedAt: string | null;
  lockedUntil: string | null;
  solverUserId: string | null;
  solvedAt: string | null;
};

export type ChunkArea = {
  fromChunkX: number;
  fromChunkY: number;
  toChunkX: number;
  toChunkY: number;
  chunks: Chunk[];
};
