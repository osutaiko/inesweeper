import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('nickname')
  async getCurrentNickname(@Req() req: Request) {
    return this.authService.getCurrentNickname(req);
  }

  @Get('nickname/availability/:nickname')
  async getNicknameAvailability(
    @Req() req: Request,
    @Param('nickname') nickname: string,
  ) {
    return this.authService.getNicknameAvailability(req, nickname);
  }

  @Patch('nickname')
  async updateNickname(
    @Req() req: Request,
    @Body() body: { nickname?: string },
  ) {
    return this.authService.updateNickname(req, body.nickname ?? '');
  }
}
