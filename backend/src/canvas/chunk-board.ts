import { hkdfSync } from 'crypto';

import { CHUNK_SIZE } from './coordinates';

export type ChunkMineBitmap = {
  chunkX: number;
  chunkY: number;
  mineBitmap: string;
};

const getBoardSecretEnv = () => {
  const value = process.env['CANVAS_BOARD_SECRET']?.trim();

  if (!value) {
    throw new Error(
      'Requires CANVAS_BOARD_SECRET env to generate chunk',
    );
  }

  return value;
};

const getBoardDensityEnv = () => {
  const value = process.env['CANVAS_BOARD_DENSITY']?.trim();

  if (!value) {
    throw new Error(
      'Requires CANVAS_BOARD_DENSITY env to generate chunk',
    );
  }
  
  return Number(value);
};

const getChunkStream = (
  chunkX: number,
  chunkY: number,
) => {
  const secret = getBoardSecretEnv();
  return Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(secret),
      Buffer.from(`chunk:${chunkX}:${chunkY}`),
      Buffer.from('canvas-board'),
      CHUNK_SIZE * CHUNK_SIZE,
    ),
  );
};

const getMineThreshold = (density: number) =>
  Math.floor(density * 0x100);

const setBitmapBit = (bitmap: Buffer, bitIndex: number) => {
  const byteIndex = bitIndex >> 3;
  const bitMask = 1 << (bitIndex & 7);
  bitmap[byteIndex] |= bitMask;
};

export const isMineAtWorldCoordinate = (
  worldX: number,
  worldY: number,
  density = getBoardDensityEnv(),
) => {
  const chunkX = Math.floor(worldX / CHUNK_SIZE);
  const chunkY = Math.floor(worldY / CHUNK_SIZE);
  const localX = worldX - chunkX * CHUNK_SIZE;
  const localY = worldY - chunkY * CHUNK_SIZE;
  const chunkStream = getChunkStream(chunkX, chunkY);
  const cellIndex = localY * CHUNK_SIZE + localX;
  const value = chunkStream[cellIndex];

  return value < getMineThreshold(density);
};

export const buildChunkMineBitmap = (
  chunkX: number,
  chunkY: number,
): ChunkMineBitmap => {
  const density = getBoardDensityEnv();
  const mineThreshold = getMineThreshold(density);
  const chunkStream = getChunkStream(chunkX, chunkY);
  const mineBitmap = Buffer.alloc((CHUNK_SIZE * CHUNK_SIZE) / 8);

  for (let cellIndex = 0; cellIndex < CHUNK_SIZE * CHUNK_SIZE; cellIndex += 1) {
    const value = chunkStream[cellIndex];

    if (value < mineThreshold) {
      setBitmapBit(mineBitmap, cellIndex);
    }
  }

  return {
    chunkX,
    chunkY,
    mineBitmap: mineBitmap.toString('hex'),
  };
};
