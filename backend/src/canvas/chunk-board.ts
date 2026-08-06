import { chacha20 } from '@noble/ciphers/chacha.js';

import { CHUNK_SIZE, worldToChunkCoordinate } from './coordinates';

const MINE_THRESHOLD = 40;
const CHUNK_BOUNDARY_COORDINATES = [
  ...Array.from({ length: CHUNK_SIZE }, (_, localX) => ({ localX, localY: CHUNK_SIZE - 1 })),
  ...Array.from({ length: CHUNK_SIZE - 2 }, (_, index) => ({
    localX: CHUNK_SIZE - 1,
    localY: CHUNK_SIZE - 2 - index,
  })),
  ...Array.from({ length: CHUNK_SIZE }, (_, index) => ({
    localX: CHUNK_SIZE - 1 - index,
    localY: 0,
  })),
  ...Array.from({ length: CHUNK_SIZE - 2 }, (_, index) => ({
    localX: 0,
    localY: index + 1,
  })),
] as const;

let boardKey: Buffer | null = null;

const getBoardSecretEnv = () => {
  const value = process.env['CANVAS_BOARD_SECRET']?.trim();

  if (!value) {
    throw new Error('Requires CANVAS_BOARD_SECRET env to generate chunk');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      'CANVAS_BOARD_SECRET must be a hex string of length 64 (256b)',
    );
  }

  return value;
};

const getBoardKey = () => {
  boardKey ??= Buffer.from(getBoardSecretEnv(), 'hex');

  return boardKey;
};

const getChunkStream = (chunkX: number, chunkY: number) => {
  const nonce = Buffer.alloc(12);
  nonce.writeUInt32BE(1, 0);
  nonce.writeInt32BE(chunkX, 4);
  nonce.writeInt32BE(chunkY, 8);

  return Buffer.from(
    chacha20(getBoardKey(), nonce, new Uint8Array(CHUNK_SIZE * CHUNK_SIZE)),
  );
};

const setBitmapBit = (bitmap: Buffer, bitIndex: number) => {
  const byteIndex = bitIndex >> 3;
  const bitMask = 1 << (bitIndex & 7);
  bitmap[byteIndex] |= bitMask;
};

const packChunkNibbles = (values: number[]) => {
  const packed = Buffer.alloc(Math.ceil(values.length / 2));

  for (let index = 0; index < values.length; index++) {
    const value = values[index] ?? 0;
    const byteIndex = index >> 1;
    const shift = (index & 1) << 2;
    packed[byteIndex] |= (value & 0x0f) << shift;
  }

  return packed.toString('base64');
};

export const isMineAtWorldCoordinate = (worldX: number, worldY: number) => {
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
): string => {
  const chunkStream = getChunkStream(chunkX, chunkY);
  const mineBitmap = Buffer.alloc((CHUNK_SIZE * CHUNK_SIZE) / 8);

  for (let cellIndex = 0; cellIndex < CHUNK_SIZE * CHUNK_SIZE; cellIndex++) {
    if (chunkStream[cellIndex] < MINE_THRESHOLD) {
      setBitmapBit(mineBitmap, cellIndex);
    }
  }

  return mineBitmap.toString('base64');
};

export const buildChunkEdgeNibbleMap = (
  chunkX: number,
  chunkY: number,
): string => {
  const edgeNibbleMap = CHUNK_BOUNDARY_COORDINATES.map(({ localX, localY }) => {
    const worldX = chunkX * CHUNK_SIZE + localX;
    const worldY = chunkY * CHUNK_SIZE + localY;
    let count = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) {
          continue;
        }

        const neighborWorldX = worldX + dx;
        const neighborWorldY = worldY + dy;
        const neighborChunk = worldToChunkCoordinate(
          neighborWorldX,
          neighborWorldY,
        );

        if (
          neighborChunk.chunkX !== chunkX ||
          neighborChunk.chunkY !== chunkY
        ) {
          if (isMineAtWorldCoordinate(neighborWorldX, neighborWorldY)) {
            count++;
          }
        }
      }
    }

    return count;
  });

  return packChunkNibbles(edgeNibbleMap);
};

