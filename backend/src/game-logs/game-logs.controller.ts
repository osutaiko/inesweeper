import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GameLogsService } from './game-logs.service';

@Controller('game-logs')
export class GameLogsController {
  constructor(private readonly gameLogsService: GameLogsService) {}

  @Post()
  async recordCompletedGame(
    @Req() req: Request,
    @Res() res: Response,
    @Body()
    body: {
      boardConfig?: Record<string, unknown>;
      variant?: string;
      difficulty?: string;
      durationMs?: number;
    },
  ) {
    const result = await this.gameLogsService.recordCompletedGame(req, res, {
      boardConfig: body.boardConfig ?? {},
      variant: body.variant ?? '',
      difficulty: body.difficulty ?? '',
      durationMs: body.durationMs ?? -1,
    });

    return res.status(201).json(result);
  }
}
