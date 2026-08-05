import { CHUNK_SIZE } from "./coordinates";
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
const CHUNK_STATE_BY_CODE = {
  o: "open",
  l: "locked",
  s: "solved",
} as const;

const decodeChunkStateBits = (packedStates: string, expectedStateCount: number) => {
  const binaryString = atob(packedStates);
  const states: string[] = [];

  for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex += 1) {
    const byteValue = binaryString.charCodeAt(byteIndex);

    for (let shift = 0; shift < 8; shift += 2) {
      const stateBits = (byteValue >> shift) & 3;

      states.push(stateBits === 0 ? "o" : stateBits === 1 ? "s" : stateBits === 2 ? "l" : "o");
    }
  }

  return states.slice(0, expectedStateCount).join("");
};

const decodeChunkStates = (
  states: string,
  fromChunkX: number,
  fromChunkY: number,
  toChunkX: number,
  toChunkY: number,
  mineBitmaps?: string,
): CanvasChunkAreaResponse => {
  const startX = Math.min(fromChunkX, toChunkX);
  const endX = Math.max(fromChunkX, toChunkX);
  const startY = Math.min(fromChunkY, toChunkY);
  const endY = Math.max(fromChunkY, toChunkY);
  const width = endX - startX + 1;
  const expectedStateCount = width * (endY - startY + 1);
  const chunks: CanvasChunk[] = [];
  const stateStream = decodeChunkStateBits(states, expectedStateCount);

  for (let index = 0; index < stateStream.length; index += 1) {
    const stateCode = stateStream[index] as keyof typeof CHUNK_STATE_BY_CODE;
    if (stateCode === "o" && mineBitmaps === undefined) {
      continue;
    }

    const mineBitmap =
      mineBitmaps
        ? mineBitmaps.slice(
            index * MINE_BITMAP_BASE64_LENGTH,
            (index + 1) * MINE_BITMAP_BASE64_LENGTH,
          )
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
      mineBitmap,
    });
  }

  return {
    fromChunkX: startX,
    fromChunkY: startY,
    toChunkX: endX,
    toChunkY: endY,
    chunks,
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

  for (let index = 0; index < MINE_BITMAP_BYTE_LENGTH; index += 1) {
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
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `${getBackendUrl()}/place/chunks/area/${fromChunkX}/${fromChunkY}/${toChunkX}/${toChunkY}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Chunk area request failed");
  }

  if (response.headers.get("content-type")?.includes("application/json")) {
    const { states, mineBitmaps } = (await response.json()) as {
      states: string;
      mineBitmaps: string;
    };

    return decodeChunkStates(
      states,
      fromChunkX,
      fromChunkY,
      toChunkX,
      toChunkY,
      mineBitmaps,
    );
  }

  return decodeChunkStates(
    await response.text(),
    fromChunkX,
    fromChunkY,
    toChunkX,
    toChunkY,
  );
};

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

export const failCanvasChunk = async () => {
  const accessToken = await getAuthAccessToken();
  if (!accessToken) {
    throw new Error("Login required");
  }

  const response = await fetch(`${getBackendUrl()}/place/chunks/fail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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
