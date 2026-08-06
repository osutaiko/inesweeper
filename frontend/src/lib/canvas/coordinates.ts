export const CHUNK_SIZE = 16;

export const formatChunkCoordinates = (chunkX: number, chunkY: number) =>
  `(X=${chunkX}, Y=${chunkY})`;

export const buildChunkEdgeIndexByLocal = () => {
  const indexMap = new Map<string, number>();

  for (let localX = 0; localX < CHUNK_SIZE; localX++) {
    indexMap.set(`${localX}:${CHUNK_SIZE - 1}`, localX);
  }
  for (let offset = 0; offset < CHUNK_SIZE - 2; offset++) {
    indexMap.set(
      `${CHUNK_SIZE - 1}:${CHUNK_SIZE - 2 - offset}`,
      CHUNK_SIZE + offset,
    );
  }
  for (let offset = 0; offset < CHUNK_SIZE; offset++) {
    indexMap.set(
      `${CHUNK_SIZE - 1 - offset}:0`,
      CHUNK_SIZE + (CHUNK_SIZE - 2) + offset,
    );
  }
  for (let offset = 0; offset < CHUNK_SIZE - 2; offset++) {
    indexMap.set(
      `0:${offset + 1}`,
      CHUNK_SIZE + (CHUNK_SIZE - 2) + CHUNK_SIZE + offset,
    );
  }

  return indexMap;
};

export const CHUNK_EDGE_INDEX_BY_LOCAL = buildChunkEdgeIndexByLocal();

export const iterateAdjacentOffsets = (
  callback: (dx: number, dy: number) => void,
) => {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      callback(dx, dy);
    }
  }
};
