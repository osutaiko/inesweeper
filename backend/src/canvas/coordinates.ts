export const CHUNK_SIZE = 16;

export type ChunkCoordinate = {
  chunkX: number;
  chunkY: number;
};

export type WorldCoordinate = {
  worldX: number;
  worldY: number;
};

export type LocalCoordinate = {
  localX: number;
  localY: number;
};

export type ChunkCellCoordinate = ChunkCoordinate &
  WorldCoordinate &
  LocalCoordinate;

export const getChunkOrigin = (chunkX: number, chunkY: number): WorldCoordinate => ({
  worldX: chunkX * CHUNK_SIZE,
  worldY: chunkY * CHUNK_SIZE,
});

export const worldToChunkCoordinate = (worldX: number, worldY: number): ChunkCoordinate => ({
  chunkX: Math.floor(worldX / CHUNK_SIZE),
  chunkY: Math.floor(worldY / CHUNK_SIZE),
});

export const worldToLocalCoordinate = (worldX: number, worldY: number): LocalCoordinate => {
  const { chunkX, chunkY } = worldToChunkCoordinate(worldX, worldY);

  return {
    localX: worldX - chunkX * CHUNK_SIZE,
    localY: worldY - chunkY * CHUNK_SIZE,
  };
};

export const getChunkCellCoordinate = (
  chunkX: number,
  chunkY: number,
  localX: number,
  localY: number,
): ChunkCellCoordinate => ({
  chunkX,
  chunkY,
  localX,
  localY,
  worldX: chunkX * CHUNK_SIZE + localX,
  worldY: chunkY * CHUNK_SIZE + localY,
});

export const listChunkLocalCoordinates = () => {
  const coordinates: LocalCoordinate[] = [];

  for (let localY = 0; localY < CHUNK_SIZE; localY += 1) {
    for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
      coordinates.push({ localX, localY });
    }
  }

  return coordinates;
};
