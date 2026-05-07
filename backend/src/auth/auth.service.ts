import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Request, Response } from 'express';

type ParsedCookie = { name: string; value: string };

@Injectable()
export class AuthService {
  private readonly supabaseUrl = process.env.SUPABASE_URL;
  private readonly supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  private readonly frontendUrl = this.getFrontendUrl();

  private getFrontendUrl() {
    const frontendUrl = process.env.FRONTEND_URL?.trim();

    if (frontendUrl) return frontendUrl.replace(/\/$/, '');
    if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';

    throw new BadRequestException('FRONTEND_URL must be set in production');
  }

  private parseCookies(cookieHeader: string | undefined): ParsedCookie[] {
    if (!cookieHeader) {
      return [];
    }

    return cookieHeader.split(';').flatMap((cookie) => {
      const [rawName, ...rawValue] = cookie.trim().split('=');
      if (!rawName || rawValue.length === 0) {
        return [];
      }

      return [
        {
          name: rawName,
          value: rawValue.join('='),
        },
      ];
    });
  }

  createSupabaseClient(req: Request, res: Response) {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new BadRequestException(
        'SUPABASE_URL and SUPABASE_ANON_KEY must be set',
      );
    }

    return createServerClient(this.supabaseUrl, this.supabaseAnonKey, {
      cookies: {
        getAll: () => this.parseCookies(req.headers.cookie),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions: CookieOptions = {
              ...options,
              sameSite:
                process.env.NODE_ENV === 'production'
                  ? 'none'
                  : options.sameSite,
              secure:
                process.env.NODE_ENV === 'production'
                  ? true
                  : options.secure,
            };

            res.cookie(name, value, cookieOptions);
          });
        },
      },
    });
  };

  async startGoogleLogin(req: Request, res: Response) {
    const supabase = this.createSupabaseClient(req, res);
    const host = req.get('host');

    if (!host) {
      throw new BadRequestException('Request host is missing');
    }

    const redirectTo = `https://${host}/auth/google/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error || !data.url) {
      throw new UnauthorizedException(
        error?.message ?? 'Unable to start Google login',
      );
    }

    return data.url;
  };

  async handleGoogleCallback(
    req: Request,
    res: Response,
    code?: string,
  ) {
    if (!code) {
      throw new BadRequestException('Missing OAuth code');
    }

    const supabase = this.createSupabaseClient(req, res);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return this.frontendUrl;
  }

  async logout(req: Request, res: Response) {
    const supabase = this.createSupabaseClient(req, res);
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return this.frontendUrl;
  }

  async getCurrentUser(req: Request, res: Response) {
    const supabase = this.createSupabaseClient(req, res);
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    const user = data.user;
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email ??
        'User',
      avatarUrl:
        user.user_metadata?.avatar_url ??
        user.user_metadata?.picture ??
        null,
    };
  }
}
