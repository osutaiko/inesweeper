import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';

type CompletedGameRunInput = {
  boardConfig: Record<string, unknown>;
  variant: string;
  difficulty: string;
  durationMs: number;
};

type BestTimeInput = {
  variant: string;
  difficulty: string;
  durationMs: number;
};

type BestTimeRow = {
  variant: string;
  difficulty: string;
  best_time_ms: number | null;
  updated_at: string;
};

@Injectable()
export class GameLogsService {
  constructor(
    private readonly authService: AuthService,
  ) {}

  async recordCompletedGame(
    req: Request,
    input: CompletedGameRunInput,
  ) {
    const user = await this.authService.getCurrentUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    if (!input.boardConfig || typeof input.boardConfig !== 'object') {
      throw new BadRequestException('boardConfig is required');
    }
    if (!input.variant) {
      throw new BadRequestException('variant is required');
    }
    if (!input.difficulty) {
      throw new BadRequestException('difficulty is required');
    }
    if (!Number.isFinite(input.durationMs) || input.durationMs < 0) {
      throw new BadRequestException('durationMs must be a positive number');
    }

    const supabase = this.authService.createBearerClient(req);

    const { data, error } = await supabase
      .from('game_logs')
      .insert({
        user_id: user.id,
        board_config: input.boardConfig,
        variant: input.variant,
        difficulty: input.difficulty,
        result: 'win',
        duration_ms: Math.round(input.durationMs),
      })
      .select('id, completed_at')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to record game log');
    }

    await this.recordBestTime(req, {
      variant: input.variant,
      difficulty: input.difficulty,
      durationMs: input.durationMs,
    });

    return {
      success: true,
      id: data.id,
      completedAt: data.completed_at,
    };
  }

  private async recordBestTime(req: Request, input: BestTimeInput) {
    const user = await this.authService.getCurrentUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const supabase = this.authService.createBearerClient(req);
    const bestTimeMs = Math.round(input.durationMs);

    const { data: existing, error: existingError } = await supabase
      .from('best_times')
      .select('best_time_ms')
      .eq('user_id', user.id)
      .eq('variant', input.variant)
      .eq('difficulty', input.difficulty)
      .maybeSingle();

    if (existingError) {
      throw new BadRequestException(
        existingError.message ?? 'Unable to read best time',
      );
    }

    if (existing && existing.best_time_ms <= bestTimeMs) {
      return existing;
    }

    const { data, error } = await supabase
      .from('best_times')
      .upsert({
        user_id: user.id,
        variant: input.variant,
        difficulty: input.difficulty,
        best_time_ms: bestTimeMs,
        updated_at: new Date().toISOString(),
      })
      .select('variant, difficulty, best_time_ms, updated_at')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to save best time');
    }

    return data as BestTimeRow;
  }

  async getBestTimes(req: Request) {
    const user = await this.authService.getCurrentUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const supabase = this.authService.createBearerClient(req);

    const { data, error } = await supabase
      .from('best_times')
      .select('variant, difficulty, best_time_ms, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to load best times');
    }

    return data as BestTimeRow[];
  }

  async getGlobalBestTimes() {
    const supabase = this.authService.createServiceRoleClient();

    const { data, error } = await supabase
      .from('best_times')
      .select('variant, difficulty, best_time_ms, updated_at')
      .order('best_time_ms', { ascending: true })
      .order('updated_at', { ascending: true });

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to load global best times');
    }

    const bestTimesByBoard = new Map<string, BestTimeRow>();

    for (const row of data as BestTimeRow[]) {
      if (!Number.isFinite(row.best_time_ms)) {
        continue;
      }

      const key = `${row.variant}:${row.difficulty}`;

      if (!bestTimesByBoard.has(key)) {
        bestTimesByBoard.set(key, row);
      }
    }

    return Array.from(bestTimesByBoard.values());
  }
}
