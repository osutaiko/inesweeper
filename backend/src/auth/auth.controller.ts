import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  async startGoogleLogin(@Req() req: Request, @Res() res: Response) {
    const redirectUrl = await this.authService.startGoogleLogin(req, res);
    return res.redirect(redirectUrl);
  }

  @Get('google/callback')
  async handleGoogleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
  ) {
    const redirectUrl = await this.authService.handleGoogleCallback(
      req,
      res,
      code,
    );
    return res.redirect(302, redirectUrl);
  }
}
