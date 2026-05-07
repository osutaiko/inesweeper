import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';

type CompletedGameRunInput = {
  boardConfig: Record<string, unknown>;
  variant: string;
  difficulty: string;
  durationMs: number;
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

    return {
      success: true,
      id: data.id,
      completedAt: data.completed_at,
    };
  }
}
