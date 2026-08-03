import { Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { ChunkService } from './chunk.service';

@Controller('place/chunks')
export class ChunkController {
  constructor(private readonly chunkService: ChunkService) {}

  @Get('active-lock')
  async getActiveLock(@Req() req: Request) {
    return this.chunkService.getActiveLock(req);
  }

  @Get('area/:fromChunkX/:fromChunkY/:toChunkX/:toChunkY')
  async getChunkArea(
    @Param('fromChunkX', ParseIntPipe) fromChunkX: number,
    @Param('fromChunkY', ParseIntPipe) fromChunkY: number,
    @Param('toChunkX', ParseIntPipe) toChunkX: number,
    @Param('toChunkY', ParseIntPipe) toChunkY: number,
  ) {
    return this.chunkService.getChunkArea(
      fromChunkX,
      fromChunkY,
      toChunkX,
      toChunkY,
    );
  }

  @Get(':chunkX/:chunkY')
  async getChunk(
    @Param('chunkX', ParseIntPipe) chunkX: number,
    @Param('chunkY', ParseIntPipe) chunkY: number,
  ) {
    return this.chunkService.getChunk(chunkX, chunkY);
  }

  @Post(':chunkX/:chunkY/lock')
  async lockChunk(
    @Req() req: Request,
    @Param('chunkX', ParseIntPipe) chunkX: number,
    @Param('chunkY', ParseIntPipe) chunkY: number,
  ) {
    return this.chunkService.lockChunk(req, chunkX, chunkY);
  }

  @Post('solve')
  async solveChunk(@Req() req: Request) {
    return this.chunkService.solveChunk(req);
  }

  @Post('fail')
  async failChunk(@Req() req: Request) {
    return this.chunkService.failChunk(req);
  }
}
