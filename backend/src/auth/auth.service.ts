import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  private readonly supabaseUrl = process.env.SUPABASE_URL;
  private readonly supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  private readonly supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  private assertSupabaseConfig() {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new BadRequestException(
        'SUPABASE_URL and SUPABASE_ANON_KEY must be set',
      );
    }
  }

  private assertServiceRoleConfig() {
    if (!this.supabaseUrl || !this.supabaseServiceRoleKey) {
      throw new BadRequestException(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set',
      );
    }
  }

  private getBearerToken(req: Request) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    return token || null;
  }

  createBearerClient(req: Request) {
    const accessToken = this.getBearerToken(req);

    if (!accessToken) {
      throw new UnauthorizedException('Login required');
    }

    this.assertSupabaseConfig();

    return createClient(this.supabaseUrl!, this.supabaseAnonKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  };

  createServiceRoleClient() {
    this.assertServiceRoleConfig();

    return createClient(this.supabaseUrl!, this.supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  async getCurrentUser(req: Request) {
    const supabase = this.createBearerClient(req);
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
