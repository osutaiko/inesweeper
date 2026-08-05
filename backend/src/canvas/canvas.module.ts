import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChunkController } from './chunk.controller';
import { ChunkService } from './chunk.service';

@Module({
  imports: [AuthModule],
  controllers: [ChunkController],
  providers: [ChunkService],
})
export class CanvasModule {}
