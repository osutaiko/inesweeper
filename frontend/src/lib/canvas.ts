import { CHUNK_SIZE } from "@/lib/coordinates";
import { getBackendUrl } from "@/lib/auth";
import { getAuthAccessToken } from "@/lib/supabase";

export type CanvasChunkMineLookup = (worldX: number, worldY: number) => boolean;

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
  mineBitmap: string | null;
};

export type CanvasChunkAreaResponse = {
  fromChunkX: number;
  fromChunkY: number;
  toChunkX: number;
  toChunkY: number;
  chunks: CanvasChunk[];
};

const MINE_BITMAP_BYTE_LENGTH = (CHUNK_SIZE * CHUNK_SIZE) / 8;
const MINE_BITMAP_HEX_LENGTH = MINE_BITMAP_BYTE_LENGTH * 2;

export const decodeMineBitmap = (mineBitmap: string | null) => {
  if (!mineBitmap || mineBitmap.length !== MINE_BITMAP_HEX_LENGTH) {
    return null;
  }

  const decoded = new Uint8Array(MINE_BITMAP_BYTE_LENGTH);

  for (let index = 0; index < MINE_BITMAP_BYTE_LENGTH; index += 1) {
    const byteValue = Number.parseInt(
      mineBitmap.slice(index * 2, index * 2 + 2),
      16,
    );

    if (!Number.isFinite(byteValue)) {
      return null;
    }

    decoded[index] = byteValue;
  }

  return decoded;
};

export const isMineInBitmap = (
  mineBitmap: Uint8Array,
  localX: number,
  localY: number,
) => {
  const bitIndex = localY * CHUNK_SIZE + localX;
  const byteIndex = bitIndex >> 3;
  const bitMask = 1 << (bitIndex & 7);

  return (mineBitmap[byteIndex] & bitMask) !== 0;
};

export const buildCanvasMineLookup = (chunks: CanvasChunk[]) => {
  const bitmapByChunk = new Map<string, Uint8Array>();

  for (const chunk of chunks) {
    const decodedBitmap = decodeMineBitmap(chunk.mineBitmap);

    if (decodedBitmap) {
      bitmapByChunk.set(`${chunk.chunkX}:${chunk.chunkY}`, decodedBitmap);
    }
  }

  return ((worldX: number, worldY: number) => {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const chunkBitmap = bitmapByChunk.get(`${chunkX}:${chunkY}`);

    if (!chunkBitmap) {
      return false;
    }

    const localX = worldX - chunkX * CHUNK_SIZE;
    const localY = worldY - chunkY * CHUNK_SIZE;

    return isMineInBitmap(chunkBitmap, localX, localY);
  }) satisfies CanvasChunkMineLookup;
};

export const getCanvasChunkArea = async (
  fromChunkX: number,
  fromChunkY: number,
  toChunkX: number,
  toChunkY: number,
) => {
  const accessToken = await getAuthAccessToken();

  const response = await fetch(
    `${getBackendUrl()}/canvas/chunks/area/${fromChunkX}/${fromChunkY}/${toChunkX}/${toChunkY}`,
    {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  );

  if (!response.ok) {
    throw new Error("Chunk area request failed");
  }

  return (await response.json()) as CanvasChunkAreaResponse;
};
