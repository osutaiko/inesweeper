import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';

const NICKNAME_PATTERN = /^[a-z0-9_]{3,32}$/;
const NICKNAME_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

type UserProfileRow = {
  user_id: string;
  nickname: string;
};

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

  private createRandomNickname() {
    const random = randomBytes(4);
    let suffix = '';

    for (const value of random) {
      suffix += NICKNAME_ALPHABET[value % NICKNAME_ALPHABET.length];
    }

    return `sweeper_${suffix}`;
  }

  private validateNickname(nickname: string) {
    if (!NICKNAME_PATTERN.test(nickname)) {
      throw new BadRequestException(
        'Nickname must be 3-32 lowercase letters, numbers, or underscores',
      );
    }
  }

  private async getAuthenticatedUser(req: Request) {
    const supabase = this.createBearerClient(req);
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  private async findProfile(userId: string) {
    const supabase = this.createServiceRoleClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, nickname')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as UserProfileRow | null;
  }

  private async ensureNickname(userId: string) {
    const existing = await this.findProfile(userId);

    if (existing) {
      return existing.nickname;
    }

    const supabase = this.createServiceRoleClient();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const nickname = this.createRandomNickname();
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          nickname,
        })
        .select('nickname')
        .single();

      if (!error && data) {
        return (data as Pick<UserProfileRow, 'nickname'>).nickname;
      }

      if (error?.code !== '23505') {
        throw new BadRequestException(
          error?.message ?? 'Unable to create nickname',
        );
      }

      const concurrentProfile = await this.findProfile(userId);
      if (concurrentProfile) {
        return concurrentProfile.nickname;
      }
    }

    throw new ConflictException('Unable to generate a unique nickname');
  }

  async getCurrentUser(req: Request) {
    const user = await this.getAuthenticatedUser(req);
    if (!user) {
      return null;
    }

    const nickname = await this.ensureNickname(user.id);
    const metadata = user.user_metadata as Record<string, unknown>;
    const avatarUrl =
      typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url
        : typeof metadata.picture === 'string'
          ? metadata.picture
          : null;

    return {
      id: user.id,
      email: user.email,
      nickname,
      avatarUrl,
    };
  }

  async getCurrentNickname(req: Request) {
    const user = await this.getAuthenticatedUser(req);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    return {
      nickname: await this.ensureNickname(user.id),
    };
  }

  async getNicknameAvailability(req: Request, nickname: string) {
    this.validateNickname(nickname);

    const user = await this.getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    const supabase = this.createServiceRoleClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('nickname', nickname)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const profile = data as Pick<UserProfileRow, 'user_id'> | null;
    return {
      available: !profile || profile.user_id === user.id,
    };
  }

  async updateNickname(req: Request, nickname: string) {
    this.validateNickname(nickname);

    const user = await this.getAuthenticatedUser(req);
    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    await this.ensureNickname(user.id);

    const supabase = this.createServiceRoleClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        nickname,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select('nickname')
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('Nickname already taken');
    }

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? 'Unable to update nickname',
      );
    }

    return data as Pick<UserProfileRow, 'nickname'>;
  }
}
