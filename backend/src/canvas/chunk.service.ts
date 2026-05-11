import {
  ConflictException,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from '../auth/auth.service';
import type { Chunk, DailyAttemptState } from './chunk.types';

@Injectable()
export class ChunkService {
  private readonly claimDurationMs = 5 * 60 * 1000; // 5 minutes
  private readonly attemptLimit = 5;
  private readonly chunkStore = new Map<string, Chunk>();
  private readonly attemptStore = new Map<string, DailyAttemptState>();

  constructor(private readonly authService: AuthService) {}

  private keyFor(chunkX: number, chunkY: number) {
    return `${chunkX}:${chunkY}`;
  }

  private dateKey(now = new Date()) {
    return now.toISOString().slice(0, 10);
  }

  // Lazy update chunk by checking lockedUntil
  private normalizeChunk(chunk: Chunk, now = new Date()): Chunk {
    if (chunk.state !== 'locked' || !chunk.lockedUntil) {
      return chunk;
    }

    if (new Date(chunk.lockedUntil).getTime() > now.getTime()) {
      return chunk;
    }

    return {
      ...chunk,
      state: 'open',
      lockedByUserId: null,
      lockedByName: null,
      lockedAt: null,
      lockedUntil: null,
      solverUserId: null,
      solverName: null,
      solvedAt: null,
    };
  }

  private getExistingChunkRecord(chunkX: number, chunkY: number) {
    const key = this.keyFor(chunkX, chunkY);
    const existing = this.chunkStore.get(key);

    if (!existing) {
      return null;
    }

    const normalized = this.normalizeChunk(existing);
    this.chunkStore.set(key, normalized);
    return normalized;
  }

  private getOrCreateChunkRecord(chunkX: number, chunkY: number) {
    const existing = this.getExistingChunkRecord(chunkX, chunkY);
    const nextChunk: Chunk =
      existing ??
      {
        chunkX,
        chunkY,
        state: 'open',
        lockedByUserId: null,
        lockedByName: null,
        lockedAt: null,
        solverUserId: null,
        solverName: null,
        solvedAt: null,
        lockedUntil: null,
      };

    const normalized = this.normalizeChunk(nextChunk);
    this.chunkStore.set(this.keyFor(chunkX, chunkY), normalized);
    return normalized;
  }

  private setChunkRecord(chunk: Chunk) {
    this.chunkStore.set(this.keyFor(chunk.chunkX, chunk.chunkY), chunk);
    return chunk;
  }

  private getActiveLockForUser(userId: string) {
    for (const [key, chunk] of this.chunkStore.entries()) {
      const [chunkX, chunkY] = key.split(':').map(Number);
      const normalized = this.normalizeChunk(
        chunk,
      );

      this.chunkStore.set(this.keyFor(chunkX, chunkY), normalized);

      if (
        normalized.state === 'locked' &&
        normalized.lockedByUserId === userId &&
        normalized.lockedUntil &&
        new Date(normalized.lockedUntil).getTime() > Date.now()
      ) {
        return normalized;
      }
    }

    return null;
  }

  private requireUser(req: Request) {
    return this.authService.getCurrentUser(req);
  }

  private lockAttempt(userId: string) {
    const dateKey = this.dateKey();
    const key = `${userId}:${dateKey}`;
    const existing = this.attemptStore.get(key) ?? {
      userId,
      dateKey,
      attemptsUsed: 0,
    };

    if (existing.attemptsUsed >= this.attemptLimit) {
      throw new BadRequestException('Daily chunk attempts exhausted');
    }

    const nextAttempt: DailyAttemptState = {
      ...existing,
      attemptsUsed: existing.attemptsUsed + 1,
    };

    this.attemptStore.set(key, nextAttempt);
    return nextAttempt;
  }

  // Can only lock (or solve) next to already solved chunks
  private hasSolvedCardinalNeighbor(chunkX: number, chunkY: number) {
    const neighbors = [
      [chunkX, chunkY - 1],
      [chunkX + 1, chunkY],
      [chunkX, chunkY + 1],
      [chunkX - 1, chunkY],
    ] as const;

    return neighbors.some(([neighborX, neighborY]) => {
      const neighbor = this.getExistingChunkRecord(neighborX, neighborY);
      return neighbor?.state === 'solved';
    });
  }

  async getChunk(req: Request, chunkX: number, chunkY: number) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    return this.getOrCreateChunkRecord(chunkX, chunkY);
  }

  async lockChunk(req: Request, chunkX: number, chunkY: number) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    this.lockAttempt(user.id);

    const chunk = this.getOrCreateChunkRecord(chunkX, chunkY);
    const activeLock = this.getActiveLockForUser(user.id);

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
      return activeLock;
    }

    if (!this.hasSolvedCardinalNeighbor(chunkX, chunkY)) {
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

    return this.setChunkRecord({
      ...chunk,
      state: 'locked',
      lockedByUserId: user.id,
      lockedByName: user.name,
      lockedAt: lockedAt.toISOString(),
      solverUserId: null,
      solverName: null,
      solvedAt: null,
      lockedUntil: lockedUntil.toISOString(),
    });
  }

  async solveChunk(req: Request, chunkX: number, chunkY: number) {
    const user = await this.requireUser(req);

    if (!user) {
      throw new UnauthorizedException('Must log in to play');
    }

    const chunk = this.getOrCreateChunkRecord(chunkX, chunkY);

    if (chunk.state !== 'locked' || !chunk.lockedByUserId) {
      throw new ConflictException('Chunk must be locked before solving');
    }

    if (chunk.lockedByUserId !== user.id) {
      throw new ConflictException('You are not the user that locked this chunk');
    }

    const solvedAt = new Date();

    return this.setChunkRecord({
      ...chunk,
      state: 'solved',
      solverUserId: user.id,
      solverName: user.name,
      solvedAt: solvedAt.toISOString(),
      lockedUntil: null,
    });
  }
}
