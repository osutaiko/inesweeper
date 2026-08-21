import { CHUNK_SIZE } from "./coordinates";
import { getBackendUrl } from "@/lib/auth";
import { getAuthAccessToken } from "@/lib/supabase";

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
  failedMines: number[];
  mineBitmap: string | null;
  edgeNibbleMap: string | null;
  isSolvedByMe?: boolean;
};

export type CanvasChunkAreaResponse = {
  fromChunkX: number;
  fromChunkY: number;
  toChunkX: number;
  toChunkY: number;
  chunks: CanvasChunk[];
  mineBitmaps: string | null;
  edgeNibbleMaps: string | null;
  mySolvedMask: string | null;
};

export type CanvasStats = {
  chunksSolved: number;
  yourChunksSolved: number | null;
  leaderboard: {
    nickname: string;
    chunksSolved: number;
  }[];
};

type CanvasChunkFailureResponse = CanvasChunk & {
  nextLockAt: string;
};

const MINE_BITMAP_BYTE_LENGTH = (CHUNK_SIZE * CHUNK_SIZE) / 8;
const MINE_BITMAP_BASE64_LENGTH = Math.ceil(MINE_BITMAP_BYTE_LENGTH / 3) * 4;
const EDGE_NIBBLE_MAP_BYTE_LENGTH = (CHUNK_SIZE * 4 - 4) / 2;
const EDGE_NIBBLE_MAP_BASE64_LENGTH =
  Math.ceil(EDGE_NIBBLE_MAP_BYTE_LENGTH / 3) * 4;
const CHUNK_STATE_BY_CODE = {
  o: "open",
  l: "locked",
  s: "solved",
} as const;
const CHUNK_BOUNDARY_COUNT_LENGTH = 60;

const decodeChunkStateBits = (packedStates: string, expectedStateCount: number) => {
  const binaryString = atob(packedStates);
  const states: string[] = [];

  for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex++) {
    const byteValue = binaryString.charCodeAt(byteIndex);

    for (let shift = 0; shift < 8; shift += 2) {
      const stateBits = (byteValue >> shift) & 3;

      states.push(stateBits === 0 ? "o" : stateBits === 1 ? "s" : stateBits === 2 ? "l" : "o");
    }
  }

  return states.slice(0, expectedStateCount).join("");
};

const decodeChunkBitMask = (
  packedBits: string | null,
  expectedBitCount: number,
) => {
  if (!packedBits) {
    return Array.from({ length: expectedBitCount }, () => false);
  }

  const binaryString = atob(packedBits);
  const bits: boolean[] = [];

  for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex++) {
    const byteValue = binaryString.charCodeAt(byteIndex);

    for (let shift = 0; shift < 8; shift++) {
      bits.push((byteValue & (1 << shift)) !== 0);
    }
  }

  return bits.slice(0, expectedBitCount);
};

const decodeEdgeNibbleMap = (packedCounts: string | null) => {
  if (!packedCounts) {
    return null;
  }

  const binaryString = atob(packedCounts);
  const counts: number[] = [];

  for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex++) {
    const byteValue = binaryString.charCodeAt(byteIndex);
    counts.push(byteValue & 0x0f);
    counts.push(byteValue >> 4);
  }

  return counts.slice(0, CHUNK_BOUNDARY_COUNT_LENGTH);
};

const decodeChunkStates = (
  states: string,
  fromChunkX: number,
  fromChunkY: number,
  toChunkX: number,
  toChunkY: number,
  mineBitmaps: string | null,
  edgeNibbleMaps: string | null,
  mySolvedMask: string | null,
): CanvasChunkAreaResponse => {
  const startX = Math.min(fromChunkX, toChunkX);
  const endX = Math.max(fromChunkX, toChunkX);
  const startY = Math.min(fromChunkY, toChunkY);
  const endY = Math.max(fromChunkY, toChunkY);
  const width = endX - startX + 1;
  const expectedStateCount = width * (endY - startY + 1);
  const chunks: CanvasChunk[] = [];
  const stateStream = decodeChunkStateBits(states, expectedStateCount);
  const solvedByMeStream = decodeChunkBitMask(mySolvedMask, expectedStateCount);
  const mineBitmapChunkLength = MINE_BITMAP_BASE64_LENGTH;
  const edgeNibbleMapChunkLength = EDGE_NIBBLE_MAP_BASE64_LENGTH;

  for (let index = 0; index < stateStream.length; index ++) {
    const stateCode = stateStream[index] as keyof typeof CHUNK_STATE_BY_CODE;
    const mineBitmap = mineBitmaps
      ? mineBitmaps.slice(index * mineBitmapChunkLength, (index + 1) * mineBitmapChunkLength)
      : null;
    const edgeNibbleMap = edgeNibbleMaps
      ? edgeNibbleMaps.slice(index * edgeNibbleMapChunkLength, (index + 1) * edgeNibbleMapChunkLength)
      : null;

    chunks.push({
      chunkX: startX + (index % width),
      chunkY: endY - Math.floor(index / width),
      state: CHUNK_STATE_BY_CODE[stateCode],
      lockedByUserId: null,
      lockedByName: null,
      lockedAt: null,
      lockedUntil: null,
      solverUserId: null,
      solverName: null,
      solvedAt: null,
      failedMines: [],
      mineBitmap,
      edgeNibbleMap,
      isSolvedByMe: solvedByMeStream[index] ?? false,
    });
  }

  return {
    fromChunkX: startX,
    fromChunkY: startY,
    toChunkX: endX,
    toChunkY: endY,
    chunks,
    mineBitmaps,
    edgeNibbleMaps,
    mySolvedMask,
  };
};

export const decodeMineBitmap = (mineBitmap: string | null) => {
  if (!mineBitmap || mineBitmap.length !== MINE_BITMAP_BASE64_LENGTH) {
    return null;
  }

  const binaryString = atob(mineBitmap);

  if (binaryString.length !== MINE_BITMAP_BYTE_LENGTH) {
    return null;
  }

  const decoded = new Uint8Array(MINE_BITMAP_BYTE_LENGTH);

  for (let index = 0; index < MINE_BITMAP_BYTE_LENGTH; index++) {
    decoded[index] = binaryString.charCodeAt(index);
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

export const getCanvasChunkArea = async (
  fromChunkX: number,
  fromChunkY: number,
  toChunkX: number,
  toChunkY: number,
  signal?: AbortSignal,
) => {
  const accessToken = await getAuthAccessToken();
  const response = await fetch(
    `${getBackendUrl()}/place/chunks/area/${fromChunkX}/${fromChunkY}/${toChunkX}/${toChunkY}`,
    {
      signal,
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : undefined,
    },
  );

  if (!response.ok) {
    throw new Error("Chunk area request failed");
  }

  const { states, mineBitmaps, edgeNibbleMaps, mySolvedMask } = (await response.json()) as {
    states: string;
    mineBitmaps: string | null;
    edgeNibbleMaps: string | null;
    mySolvedMask: string | null;
  };

  return decodeChunkStates(
    states,
    fromChunkX,
    fromChunkY,
    toChunkX,
    toChunkY,
    mineBitmaps,
    edgeNibbleMaps,
    mySolvedMask,
  );
};

export { decodeEdgeNibbleMap };

export const getCanvasChunk = async (
  chunkX: number,
  chunkY: number,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `${getBackendUrl()}/place/chunks/${chunkX}/${chunkY}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Chunk request failed");
  }

  return (await response.json()) as CanvasChunk;
};

export const lockCanvasChunk = async (chunkX: number, chunkY: number) => {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) {
    throw new Error("Login required");
  }

  const response = await fetch(
    `${getBackendUrl()}/place/chunks/${chunkX}/${chunkY}/lock`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Unable to lock chunk");
  }

  return (await response.json()) as CanvasChunk;
};

export const solveCanvasChunk = async () => {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) {
    throw new Error("Login required");
  }

  const response = await fetch(
    `${getBackendUrl()}/place/chunks/solve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Unable to solve chunk");
  }

  return (await response.json()) as CanvasChunk;
};

export const failCanvasChunk = async (failedMineIndex?: number) => {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) {
    throw new Error("Login required");
  }

  const response = await fetch(`${getBackendUrl()}/place/chunks/fail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ failedMineIndex }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Unable to fail chunk");
  }

  return (await response.json()) as CanvasChunkFailureResponse;
};

export const getActiveCanvasLock = async () => {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) {
    return null;
  }

  const response = await fetch(
    `${getBackendUrl()}/place/chunks/active-lock`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load active lock");
  }

  return (await response.json()) as CanvasChunk | null;
};

export const getCanvasStats = async () => {
  const accessToken = await getAuthAccessToken();
  const response = await fetch(`${getBackendUrl()}/place/chunks/stats`, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });

  if (!response.ok) {
    throw new Error("Unable to load Place stats");
  }

  return (await response.json()) as CanvasStats;
};

