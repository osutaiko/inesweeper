import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  name:
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email ??
    "User",
  avatarUrl: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
});

export const loadCurrentAuthUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? toAuthUser(user) : null;
};

export const subscribeToAuthUser = (
  onChange: (authUser: AuthUser | null) => void,
) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session?.user ? toAuthUser(session.user) : null);
  });

  return subscription;
};

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
