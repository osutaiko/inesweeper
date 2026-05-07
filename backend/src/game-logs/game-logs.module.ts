import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GameLogsController } from './game-logs.controller';
import { GameLogsService } from './game-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [GameLogsController],
  providers: [GameLogsService],
})
export class GameLogsModule {}
