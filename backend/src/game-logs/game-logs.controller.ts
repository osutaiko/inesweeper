import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { GameLogsService } from './game-logs.service';

@Controller('game-logs')
export class GameLogsController {
  constructor(private readonly gameLogsService: GameLogsService) {}

  @Get('best-times')
  async getBestTimes(@Req() req: Request, @Res() res: Response) {
    const result = await this.gameLogsService.getBestTimes(req);
    return res.json(result);
  }

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
    const result = await this.gameLogsService.recordCompletedGame(req, {
      boardConfig: body.boardConfig ?? {},
      variant: body.variant ?? '',
      difficulty: body.difficulty ?? '',
      durationMs: body.durationMs ?? -1,
    });

    return res.status(201).json(result);
  }
}
