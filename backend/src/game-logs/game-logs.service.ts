import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
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
  best_time_ms: number;
  updated_at: string;
};

@Injectable()
export class GameLogsService {
  constructor(
    private readonly authService: AuthService,
  ) {}

  async recordCompletedGame(
    req: Request,
    res: Response,
    input: CompletedGameRunInput,
  ) {
    const user = await this.authService.getCurrentUser(req, res);

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

    const supabase = this.authService.createSupabaseClient(req, res);

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

    await this.recordBestTime(req, res, {
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

  private async recordBestTime(req: Request, res: Response, input: BestTimeInput) {
    const user = await this.authService.getCurrentUser(req, res);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const supabase = this.authService.createSupabaseClient(req, res);
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

  async getBestTimes(req: Request, res: Response) {
    const user = await this.authService.getCurrentUser(req, res);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const supabase = this.authService.createSupabaseClient(req, res);

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
}
