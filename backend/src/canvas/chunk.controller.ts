import { Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ChunkService } from './chunk.service';

@Controller('canvas/chunks')
export class ChunkController {
  constructor(private readonly chunkService: ChunkService) {}

  @Get('area/:fromChunkX/:fromChunkY/:toChunkX/:toChunkY')
  async getChunkArea(
    @Req() req: Request,
    @Param('fromChunkX', ParseIntPipe) fromChunkX: number,
    @Param('fromChunkY', ParseIntPipe) fromChunkY: number,
    @Param('toChunkX', ParseIntPipe) toChunkX: number,
    @Param('toChunkY', ParseIntPipe) toChunkY: number,
  ) {
    return this.chunkService.getChunkArea(
      req,
      fromChunkX,
      fromChunkY,
      toChunkX,
      toChunkY,
    );
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
