import { Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ChunkService } from './chunk.service';

@Controller('canvas/chunks')
export class ChunkController {
  constructor(private readonly chunkService: ChunkService) {}

  @Get(':chunkX/:chunkY')
  async getChunk(
    @Req() req: Request,
    @Param('chunkX', ParseIntPipe) chunkX: number,
    @Param('chunkY', ParseIntPipe) chunkY: number,
  ) {
    return this.chunkService.getChunk(req, chunkX, chunkY);
  }

  @Post(':chunkX/:chunkY/lock')
  async lockChunk(
    @Req() req: Request,
    @Param('chunkX', ParseIntPipe) chunkX: number,
    @Param('chunkY', ParseIntPipe) chunkY: number,
  ) {
    return this.chunkService.lockChunk(req, chunkX, chunkY);
  }

  @Post(':chunkX/:chunkY/solve')
  async solveChunk(
    @Req() req: Request,
    @Param('chunkX', ParseIntPipe) chunkX: number,
    @Param('chunkY', ParseIntPipe) chunkY: number,
  ) {
    return this.chunkService.solveChunk(req, chunkX, chunkY);
  }
}
