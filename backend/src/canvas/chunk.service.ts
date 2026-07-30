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

type UserProfileNameRow = {
  user_id: string;
  nickname: string;
};

@Injectable()
export class ChunkService {
  private readonly claimDurationMs = 5 * 60 * 1000; // 5 minutes
  private readonly chunkTable = 'canvas_chunks';
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
      throw new ConflictException(`Must wait ${nextLockAt - Date.now()} ms before locking another chunk`);
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
    const now = Date.now();
    const { data, error } = await client
      .from(this.chunkTable)
      .select('*')
      .gte('chunk_x', startX)
      .lte('chunk_x', endX)
      .gte('chunk_y', startY)
      .lte('chunk_y', endY);

    if (error) {
      throw new BadRequestException(error.message ?? 'Unable to read chunks');
    }

    const rows = (data ?? []) as ChunkRow[];
    const userIds = new Set<string>();

    for (const row of rows) {
      if (row.locked_by_user_id) {
        userIds.add(row.locked_by_user_id);
      }
      if (row.solver_user_id) {
        userIds.add(row.solver_user_id);
      }
    }

    const nameByUserId = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: profiles, error: profileError } = await client
        .from('user_profiles')
        .select('user_id, nickname')
        .in('user_id', Array.from(userIds));

      if (profileError) {
        throw new BadRequestException(
          profileError.message ?? 'Unable to read user names',
        );
      }

      for (const profile of (profiles ?? []) as UserProfileNameRow[]) {
        nameByUserId.set(profile.user_id, profile.nickname);
      }
    }

    const chunkMap = new Map<string, ChunkRecord>();

    for (const row of rows) {
      if (
        row.state === 'locked' &&
        row.locked_until &&
        new Date(row.locked_until).getTime() <= now
      ) {
        continue;
      }

      const chunk = this.rowToChunk(row);
      chunkMap.set(`${chunk.chunkX}:${chunk.chunkY}`, chunk);
    }

    const chunks: Chunk[] = [];

    for (let chunkY = endY; chunkY >= startY; chunkY -= 1) {
      for (let chunkX = startX; chunkX <= endX; chunkX += 1) {
        const chunk =
          chunkMap.get(`${chunkX}:${chunkY}`) ??
          ({
            chunkX,
            chunkY,
            state: 'open',
            lockedByUserId: null,
            lockedAt: null,
            lockedUntil: null,
            solverUserId: null,
            solvedAt: null,
          } satisfies ChunkRecord);
        chunks.push({
          ...chunk,
          lockedByName: chunk.lockedByUserId
            ? nameByUserId.get(chunk.lockedByUserId) ?? null
            : null,
          solverName: chunk.solverUserId
            ? nameByUserId.get(chunk.solverUserId) ?? null
            : null,
          mineBitmap: this.getChunkMineBitmap(chunk.chunkX, chunk.chunkY)
            .mineBitmap,
        });
      }
    }

    return {
      fromChunkX: startX,
      fromChunkY: startY,
      toChunkX: endX,
      toChunkY: endY,
      chunks,
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
    const lockedUntil = new Date(lockedAt.getTime() + this.claimDurationMs);
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
    this.nextLockAtByUserId.set(user.id, lockedUntil.getTime());

    return this.withChunkMineBitmap(saved, user.id, user.nickname);
  }

  async solveChunk(req: Request, chunkX: number, chunkY: number) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Must log in to play');
    }

    const client = this.authService.createBearerClient(req);
    const chunk = await this.getOrCreateChunkRecord(client, chunkX, chunkY);

    if (chunk.state !== 'locked' || !chunk.lockedByUserId) {
      throw new ConflictException('Chunk must be locked before solving');
    }

    if (chunk.lockedByUserId !== user.id) {
      throw new ConflictException('You are not the user that locked this chunk');
    }

    const solvedAt = new Date();
    const saved = await this.setChunkRecord(client, {
      ...chunk,
      state: 'solved',
      solverUserId: user.id,
      solvedAt: solvedAt.toISOString(),
      lockedUntil: null,
    });

    return this.withChunkMineBitmap(saved, user.id, user.nickname);
  }
}
