import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../auth/auth.service';
import { buildChunkMineBitmap } from './chunk-board';
import type { Chunk, ChunkRecord } from './chunk.types';

type ChunkRow = {
  chunk_x: number;
  chunk_y: number;
  state: ChunkRecord['state'];
  locked_by_user_id: string | null;
  locked_at: string | null;
  locked_until: string | null;
  solver_user_id: string | null;
  solved_at: string | null;
};

type ChunkStateRow = Pick<
  ChunkRow,
  'chunk_x' | 'chunk_y' | 'state' | 'locked_until'
>;

const chunkStateCode = {
  open: 'o',
  locked: 'l',
  solved: 's',
} as const satisfies Record<ChunkRecord['state'], string>;

const packChunkStates = (states: string) => {
  const packed = Buffer.alloc(Math.ceil(states.length / 4));

  for (let index = 0; index < states.length; index += 1) {
    const state = states[index];
    const byteIndex = index >> 2;
    const bitOffset = (index & 3) << 1;
    const stateBits =
      state === 'o' ? 0 : state === 's' ? 1 : state === 'l' ? 2 : 0;

    packed[byteIndex] |= stateBits << bitOffset;
  }

  return packed.toString('base64');
};

@Injectable()
export class ChunkService {
  private readonly solveDurationMs = 3 * 60 * 1000; // 3 minutes for chunk solve
  private readonly failureCooldownMs = 60 * 1000; // 60 seconds after failed claim
  private readonly chunkTable = 'canvas_chunks';
  private readonly maxChunkAreaSize = 500_000;
  private readonly maxMineBitmapAreaSize = 1_024;
  private readonly nextLockAtByUserId = new Map<string, number>();

  constructor(private readonly authService: AuthService) {}

  private requireUser(req: Request) {
    return this.authService.getCurrentUser(req);
  }

  private rowToChunk(row: ChunkRow): ChunkRecord {
    return {
      chunkX: row.chunk_x,
      chunkY: row.chunk_y,
      state: row.state,
      lockedByUserId: row.locked_by_user_id,
      lockedAt: row.locked_at,
      lockedUntil: row.locked_until,
      solverUserId: row.solver_user_id,
      solvedAt: row.solved_at,
    };
  }

  private async getChunkRow(
    client: ReturnType<AuthService['createBearerClient']>,
    chunkX: number,
    chunkY: number,
  ) {
    const { data, error } = await client
      .from(this.chunkTable)
      .select('*')
      .eq('chunk_x', chunkX)
      .eq('chunk_y', chunkY)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message ?? 'Unable to read chunk');
    }

    return (data as ChunkRow | null) ?? null;
  }

  private async setChunkRecord(
    client: ReturnType<AuthService['createBearerClient']>,
    chunk: ChunkRecord,
  ) {
    const { data, error } = await client
      .from(this.chunkTable)
      .upsert(
        {
          chunk_x: chunk.chunkX,
          chunk_y: chunk.chunkY,
          state: chunk.state,
          locked_by_user_id: chunk.lockedByUserId,
          locked_at: chunk.lockedAt,
          locked_until: chunk.lockedUntil,
          solver_user_id: chunk.solverUserId,
          solved_at: chunk.solvedAt,
        },
        {
          onConflict: 'chunk_x,chunk_y',
        },
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to save chunk');
    }

    return this.rowToChunk(data as ChunkRow);
  }

  private async getExistingChunkRecord(
    client: ReturnType<AuthService['createBearerClient']>,
    chunkX: number,
    chunkY: number,
  ) {
    const row = await this.getChunkRow(client, chunkX, chunkY);

    if (!row) {
      return null;
    }

    if (
      row.state === 'locked' &&
      row.locked_until &&
      new Date(row.locked_until).getTime() <= Date.now()
    ) {
      const { error } = await client
        .from(this.chunkTable)
        .delete()
        .eq('chunk_x', chunkX)
        .eq('chunk_y', chunkY);

      if (error) {
        throw new BadRequestException(
          error.message ?? 'Unable to delete chunk',
        );
      }

      return null;
    }

    return this.rowToChunk(row);
  }

  private async getOrCreateChunkRecord(
    client: ReturnType<AuthService['createBearerClient']>,
    chunkX: number,
    chunkY: number,
  ) {
    const existing = await this.getExistingChunkRecord(client, chunkX, chunkY);

    if (existing) {
      return existing;
    }

    return {
      chunkX,
      chunkY,
      state: 'open',
      lockedByUserId: null,
      lockedAt: null,
      lockedUntil: null,
      solverUserId: null,
      solvedAt: null,
    } satisfies ChunkRecord;
  }

  private getChunkMineBitmap(chunkX: number, chunkY: number) {
    return buildChunkMineBitmap(chunkX, chunkY);
  }

  private withChunkMineBitmap(
    chunk: ChunkRecord,
    userId: string | null,
    userName: string | null,
  ): Chunk {
    const canRevealBoard =
      chunk.state === 'solved' ||
      (chunk.state === 'locked' && chunk.lockedByUserId === userId);
    const names = {
      lockedByName: chunk.lockedByUserId === userId ? userName : null,
      solverName: chunk.solverUserId === userId ? userName : null,
    };

    if (!canRevealBoard) {
      return {
        ...chunk,
        ...names,
        mineBitmap: null,
      };
    }

    const mineBitmap = this.getChunkMineBitmap(chunk.chunkX, chunk.chunkY);

    return {
      ...chunk,
      ...names,
      mineBitmap: mineBitmap.mineBitmap,
    };
  }

  private async getActiveLockForUser(
    client: ReturnType<AuthService['createBearerClient']>,
    userId: string,
  ) {
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from(this.chunkTable)
      .select('*')
      .eq('locked_by_user_id', userId)
      .eq('state', 'locked')
      .gt('locked_until', nowIso)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Unable to read active lock',
      );
    }

    if (!data) {
      return null;
    }

    return this.rowToChunk(data as ChunkRow);
  }

  private ensureLockCooldownElapsed(userId: string) {
    const nextLockAt = this.nextLockAtByUserId.get(userId) ?? 0;

    if (nextLockAt > Date.now()) {
      throw new ConflictException(
        `Must wait ${Math.ceil((nextLockAt - Date.now()) / 1000)} seconds before locking another chunk`,
      );
    }
  }

  // Can only lock (or solve) next to already solved chunks
  private async hasSolvedCardinalNeighbor(
    client: ReturnType<AuthService['createBearerClient']>,
    chunkX: number,
    chunkY: number,
  ) {
    if (chunkX === 0 && chunkY === 0) {
      return true;
    }

    const neighbors = [
      [chunkX, chunkY - 1],
      [chunkX + 1, chunkY],
      [chunkX, chunkY + 1],
      [chunkX - 1, chunkY],
    ] as const;

    for (const [neighborX, neighborY] of neighbors) {
      const neighbor = await this.getExistingChunkRecord(
        client,
        neighborX,
        neighborY,
      );

      if (neighbor?.state === 'solved') {
        return true;
      }
    }

    return false;
  }

  async getChunkArea(
    fromChunkX: number,
    fromChunkY: number,
    toChunkX: number,
    toChunkY: number,
  ) {
    const client = this.authService.createServiceRoleClient();

    const startX = Math.min(fromChunkX, toChunkX);
    const endX = Math.max(fromChunkX, toChunkX);
    const startY = Math.min(fromChunkY, toChunkY);
    const endY = Math.max(fromChunkY, toChunkY);
    const width = endX - startX + 1;
    const height = endY - startY + 1;
    const areaSize = width * height;

    if (
      !Number.isSafeInteger(areaSize) ||
      areaSize > this.maxChunkAreaSize
    ) {
      throw new BadRequestException('Requested chunk area is too large');
    }

    const now = Date.now();
    const { data, error } = await client
      .from(this.chunkTable)
      .select('chunk_x, chunk_y, state, locked_until')
      .gte('chunk_x', startX)
      .lte('chunk_x', endX)
      .gte('chunk_y', startY)
      .lte('chunk_y', endY);

    if (error) {
      throw new BadRequestException(error.message ?? 'Unable to read chunks');
    }

    const rows = (data ?? []) as ChunkStateRow[];
    const stateByCoordinate = new Map(
      rows
        .filter(
          (row) =>
            row.state !== 'locked' ||
            !row.locked_until ||
            new Date(row.locked_until).getTime() > now,
        )
        .map((row) => [
          `${row.chunk_x}:${row.chunk_y}`,
          chunkStateCode[row.state],
        ] as const),
    );
    const states: string[] = [];
    const mineBitmaps: string[] = [];
    const includeMineBitmaps = areaSize <= this.maxMineBitmapAreaSize;

    for (let chunkY = endY; chunkY >= startY; chunkY -= 1) {
      for (let chunkX = startX; chunkX <= endX; chunkX += 1) {
        const state = stateByCoordinate.get(`${chunkX}:${chunkY}`) ?? 'o';
        states.push(state);

        if (includeMineBitmaps && state === 's') {
          mineBitmaps.push(
            this.getChunkMineBitmap(chunkX, chunkY).mineBitmap,
          );
        }
      }
    }

    return includeMineBitmaps
      ? {
          states: packChunkStates(states.join('')),
          mineBitmaps: mineBitmaps.join(''),
        }
      : packChunkStates(states.join(''));
  }

  async getStats(req: Request) {
    const user = req.headers.authorization
      ? await this.requireUser(req)
      : null;
    const client = this.authService.createServiceRoleClient();
    const { data, error } = await client.rpc('get_canvas_stats', {
      target_user_id: user?.id ?? null,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async getChunk(chunkX: number, chunkY: number) {
    const client = this.authService.createServiceRoleClient();
    const chunk = await this.getOrCreateChunkRecord(client, chunkX, chunkY);
    const userId = chunk.lockedByUserId ?? chunk.solverUserId;
    let userName: string | null = null;

    if (userId) {
      const { data, error } = await client
        .from('user_profiles')
        .select('nickname')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new BadRequestException(error.message);
      }

      userName = (data as { nickname: string } | null)?.nickname ?? null;
    }

    return {
      ...chunk,
      lockedByName: chunk.lockedByUserId ? userName : null,
      solverName: chunk.solverUserId ? userName : null,
      mineBitmap:
        chunk.state === 'solved'
          ? this.getChunkMineBitmap(chunkX, chunkY).mineBitmap
          : null,
    };
  }

  async getActiveLock(req: Request) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const client = this.authService.createBearerClient(req);
    const activeLock = await this.getActiveLockForUser(client, user.id);

    return activeLock
      ? this.withChunkMineBitmap(activeLock, user.id, user.nickname)
      : null;
  }

  async lockChunk(req: Request, chunkX: number, chunkY: number) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const client = this.authService.createBearerClient(req);
    const chunk = await this.getOrCreateChunkRecord(client, chunkX, chunkY);
    const activeLock = await this.getActiveLockForUser(client, user.id);

    // User can only lock 1 chunk at once
    if (
      activeLock &&
      (activeLock.chunkX !== chunkX || activeLock.chunkY !== chunkY)
    ) {
      throw new ConflictException('You already have another locked chunk');
    }

    if (
      activeLock &&
      activeLock.chunkX === chunkX &&
      activeLock.chunkY === chunkY
    ) {
      return this.withChunkMineBitmap(activeLock, user.id, user.nickname);
    }

    if (!(await this.hasSolvedCardinalNeighbor(client, chunkX, chunkY))) {
      throw new ConflictException(
        'Chunk must touch an already solved cardinal neighbor',
      );
    }

    if (chunk.state === 'solved') {
      throw new ConflictException('Chunk already solved');
    }

    if (
      chunk.state === 'locked' &&
      chunk.lockedUntil &&
      new Date(chunk.lockedUntil).getTime() > Date.now() &&
      chunk.lockedByUserId !== user.id
    ) {
      throw new ConflictException('Chunk is already locked');
    }

    const lockedAt = new Date();
    const lockedUntil = new Date(lockedAt.getTime() + this.solveDurationMs);
    this.ensureLockCooldownElapsed(user.id);

    const saved = await this.setChunkRecord(client, {
      ...chunk,
      state: 'locked',
      lockedByUserId: user.id,
      lockedAt: lockedAt.toISOString(),
      solverUserId: null,
      solvedAt: null,
      lockedUntil: lockedUntil.toISOString(),
    });
    this.nextLockAtByUserId.set(
      user.id,
      lockedUntil.getTime() + this.failureCooldownMs,
    );

    return this.withChunkMineBitmap(saved, user.id, user.nickname);
  }

  async solveChunk(req: Request) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Must log in to play');
    }

    const client = this.authService.createBearerClient(req);
    const chunk = await this.getActiveLockForUser(client, user.id);

    if (!chunk) {
      throw new ConflictException('You do not have a locked chunk');
    }

    const solvedAt = new Date();
    const saved = await this.setChunkRecord(client, {
      ...chunk,
      state: 'solved',
      lockedByUserId: null,
      // lockedAt: null,
      lockedUntil: null,
      solverUserId: user.id,
      solvedAt: solvedAt.toISOString(),
    });
    this.nextLockAtByUserId.delete(user.id);

    return this.withChunkMineBitmap(saved, user.id, user.nickname);
  }

  async failChunk(req: Request) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Must log in to play');
    }

    const client = this.authService.createBearerClient(req);
    const { data, error } = await client
      .from(this.chunkTable)
      .select('*')
      .eq('locked_by_user_id', user.id)
      .eq('state', 'locked')
      .order('locked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Unable to read locked chunk',
      );
    }

    if (!data) {
      throw new ConflictException('You do not have a locked chunk');
    }

    const row = data as ChunkRow;
    const failedAt = Date.now();
    const saved = await this.setChunkRecord(client, {
      ...this.rowToChunk(row),
      state: 'open',
      lockedByUserId: null,
      lockedAt: null,
      lockedUntil: null,
      solverUserId: null,
      solvedAt: null,
    });
    const nextLockAt = failedAt + this.failureCooldownMs;
    this.nextLockAtByUserId.set(user.id, nextLockAt);

    return {
      ...this.withChunkMineBitmap(saved, user.id, user.nickname),
      nextLockAt: new Date(nextLockAt).toISOString(),
    };
  }
}
