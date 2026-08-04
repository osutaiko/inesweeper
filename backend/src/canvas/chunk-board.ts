import { chacha20 } from '@noble/ciphers/chacha.js';

import { CHUNK_SIZE } from './coordinates';

export type ChunkMineBitmap = {
  chunkX: number;
  chunkY: number;
  mineBitmap: string;
};

const MINE_THRESHOLD = 40;
let boardKey: Buffer | null = null;

const getBoardSecretEnv = () => {
  const value = process.env['CANVAS_BOARD_SECRET']?.trim();

  if (!value) {
    throw new Error(
      'Requires CANVAS_BOARD_SECRET env to generate chunk',
    );
  }

  return value;
};

const getBoardKey = () => {
  boardKey ??= Buffer.from(getBoardSecretEnv(), 'hex');

  return boardKey;
};

const getChunkStream = (
  chunkX: number,
  chunkY: number,
) => {
  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(1, 0);
  nonce.writeInt32BE(chunkX, 4);
  nonce.writeInt32BE(chunkY, 8);

  return Buffer.from(
    chacha20(
      getBoardKey(),
      nonce,
      new Uint8Array(CHUNK_SIZE * CHUNK_SIZE),
    ),
  );
};

const setBitmapBit = (bitmap: Buffer, bitIndex: number) => {
  const byteIndex = bitIndex >> 3;
  const bitMask = 1 << (bitIndex & 7);
  bitmap[byteIndex] |= bitMask;
};

export const isMineAtWorldCoordinate = (
  worldX: number,
  worldY: number,
) => {
  const chunkX = Math.floor(worldX / CHUNK_SIZE);
  const chunkY = Math.floor(worldY / CHUNK_SIZE);
  const localX = worldX - chunkX * CHUNK_SIZE;
  const localY = worldY - chunkY * CHUNK_SIZE;
  const chunkStream = getChunkStream(chunkX, chunkY);
  const cellIndex = localY * CHUNK_SIZE + localX;

  return chunkStream[cellIndex] < MINE_THRESHOLD;
};

export const buildChunkMineBitmap = (
  chunkX: number,
  chunkY: number,
): ChunkMineBitmap => {
  const chunkStream = getChunkStream(chunkX, chunkY);
  const mineBitmap = Buffer.alloc((CHUNK_SIZE * CHUNK_SIZE) / 8);

  for (let cellIndex = 0; cellIndex < CHUNK_SIZE * CHUNK_SIZE; cellIndex += 1) {
    if (chunkStream[cellIndex] < MINE_THRESHOLD) {
      setBitmapBit(mineBitmap, cellIndex);
    }
  }

  return {
    chunkX,
    chunkY,
    mineBitmap: mineBitmap.toString('hex'),
  };
};
