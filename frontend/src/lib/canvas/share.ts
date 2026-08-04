import {
  decodeMineBitmap,
  isMineInBitmap,
  type CanvasChunk,
  type CanvasChunkMineLookup,
} from "./api";
import { CHUNK_SIZE, formatChunkCoordinates } from "./coordinates";

const PLACE_URL = "https://www.inesweeper.com/place";

export const formatChunkShareText = (
  chunk: CanvasChunk,
  neighborMineLookup: CanvasChunkMineLookup | null,
) => {
  const coordinates = formatChunkCoordinates(chunk.chunkX, chunk.chunkY);

  if (chunk.state !== "solved") {
    return `Inesweeper Place 🚩 Chunk ${coordinates}\nNot claimed yet... Be the first one to claim!\n\n<${PLACE_URL}>`;
  }

  const solvedBy = chunk.solverName ?? "[Unknown]";
  const header = `Inesweeper Place 🚩 Chunk ${coordinates}\nSolved by ${solvedBy}`;
  const mineBitmap = decodeMineBitmap(chunk.mineBitmap);
  if (!mineBitmap) {
    return `${header}\n\n<${PLACE_URL}>`;
  }

  const isMineAt = (worldX: number, worldY: number) => {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);

    if (chunkX === chunk.chunkX && chunkY === chunk.chunkY) {
      return isMineInBitmap(
        mineBitmap,
        worldX - chunkX * CHUNK_SIZE,
        worldY - chunkY * CHUNK_SIZE,
      );
    }

    return neighborMineLookup?.(worldX, worldY) ?? false;
  };

  const rows = Array.from({ length: CHUNK_SIZE }, (_, displayRow) => {
    const localY = CHUNK_SIZE - 1 - displayRow;

    return Array.from({ length: CHUNK_SIZE }, (_, localX) => {
      const worldX = chunk.chunkX * CHUNK_SIZE + localX;
      const worldY = chunk.chunkY * CHUNK_SIZE + localY;

      if (isMineAt(worldX, worldY)) {
        return "@";
      }

      let neighborCount = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (
            (dx !== 0 || dy !== 0) &&
            isMineAt(worldX + dx, worldY + dy)
          ) {
            neighborCount += 1;
          }
        }
      }

      return neighborCount === 0 ? "·" : String(neighborCount);
    }).join("");
  });

  return `${header}\n\`\`\`\n${rows.join("\n")}\n\`\`\`\n<${PLACE_URL}>`;
};
