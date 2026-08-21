import {
  decodeEdgeNibbleMap,
  decodeMineBitmap,
  isMineInBitmap,
  type CanvasChunk,
} from "./api";
import {
  CHUNK_EDGE_INDEX_BY_LOCAL,
  CHUNK_SIZE,
  formatChunkCoordinates,
  iterateAdjacentOffsets,
} from "./coordinates";

const PLACE_URL = "https://www.inesweeper.com/place";

export const formatChunkShareText = (chunk: CanvasChunk) => {
  const coordinates = formatChunkCoordinates(chunk.chunkX, chunk.chunkY);
  const shareUrl = new URL(PLACE_URL);
  shareUrl.searchParams.set("X", String(chunk.chunkX));
  shareUrl.searchParams.set("Y", String(chunk.chunkY));

  if (chunk.state !== "solved") {
    return `Inesweeper Place 🚩 Chunk ${coordinates}\nNot claimed yet... Be the first one to claim!\n\n<${shareUrl}>`;
  }

  const solvedBy = chunk.solverName ?? "[Unknown]";
  const header = `Inesweeper Place 🚩 Chunk ${coordinates}\nSolved by ${solvedBy}`;
  const mineBitmap = decodeMineBitmap(chunk.mineBitmap);
  const edgeNibbleMap = decodeEdgeNibbleMap(chunk.edgeNibbleMap);

  if (!mineBitmap || !edgeNibbleMap) {
    return `${header}\n\n<${shareUrl}>`;
  }

  const rows = Array.from({ length: CHUNK_SIZE }, (_, displayRow) => {
    const localY = CHUNK_SIZE - 1 - displayRow;

    return Array.from({ length: CHUNK_SIZE }, (_, localX) => {
      if (isMineInBitmap(mineBitmap, localX, localY)) {
        return "@";
      }

      let internalNeighborCount = 0;
      iterateAdjacentOffsets((dx, dy) => {
        const neighborLocalX = localX + dx;
        const neighborLocalY = localY + dy;

        if (
          neighborLocalX < 0 ||
          neighborLocalX >= CHUNK_SIZE ||
          neighborLocalY < 0 ||
          neighborLocalY >= CHUNK_SIZE
        ) {
          return;
        }

        if (isMineInBitmap(mineBitmap, neighborLocalX, neighborLocalY)) {
          internalNeighborCount++;
        }
      });

      const boundaryIndex = CHUNK_EDGE_INDEX_BY_LOCAL.get(`${localX}:${localY}`);
      const edgeCount =
        boundaryIndex !== undefined ? edgeNibbleMap[boundaryIndex] ?? 0 : 0;
      const neighborCount = internalNeighborCount + edgeCount;

      return neighborCount === 0 ? "·" : String(neighborCount);
    }).join("");
  });

  return `${header}\n\`\`\`\n${rows.join("\n")}\n\`\`\`\n<${shareUrl}>`;
};
