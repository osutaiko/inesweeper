import type { User } from "@supabase/supabase-js";

import { getAuthAccessToken, supabase } from "@/lib/supabase";

export const NICKNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

const toAuthUser = (user: User, nickname: string): AuthUser => ({
  id: user.id,
  email: user.email,
  name: nickname,
  avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
});

const requestNickname = async <T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
) => {
  const token = accessToken ?? (await getAuthAccessToken());
  if (!token) {
    throw new Error("Login required");
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Nickname request failed");
  }

  return (await response.json()) as T;
};

const loadNickname = async (accessToken?: string) => {
  const response = await requestNickname<{ nickname: string }>(
    "/auth/nickname",
    undefined,
    accessToken,
  );
  return response.nickname;
};

export const loadCurrentAuthUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? toAuthUser(user, await loadNickname()) : null;
};

export const subscribeToAuthUser = (
  onChange: (authUser: AuthUser | null) => void,
) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      onChange(null);
      return;
    }

    void loadNickname(session.access_token).then((nickname) => {
      onChange(toAuthUser(session.user, nickname));
    });
  });

  return subscription;
};

export const checkNicknameAvailability = async (nickname: string) =>
  requestNickname<{ available: boolean }>(
    `/auth/nickname/availability/${encodeURIComponent(nickname)}`,
  );

export const updateNickname = async (nickname: string) =>
  requestNickname<{ nickname: string }>("/auth/nickname", {
    method: "PATCH",
    body: JSON.stringify({ nickname }),
  });

export const getBackendUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL?.trim();

  if (backendUrl) {
    return backendUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  throw new Error("VITE_BACKEND_URL must be set in production");
};
