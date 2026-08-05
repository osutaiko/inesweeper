import { useEffect, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
};

export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  }

  const [matches, setMatches] = useState<boolean>(getMatches(query))

  function handleChange() {
    setMatches(getMatches(query))
  }

  useEffect(() => {
    const matchMedia = window.matchMedia(query)

    // Triggered at the first client-side load and if query changes
    handleChange()

    // Listen matchMedia
    if (matchMedia.addListener) {
      matchMedia.addListener(handleChange)
    } else {
      matchMedia.addEventListener('change', handleChange)
    }

    return () => {
      if (matchMedia.removeListener) {
        matchMedia.removeListener(handleChange)
      } else {
        matchMedia.removeEventListener('change', handleChange)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return matches
};

export function formatTimeMs(ms: number): string {
  return (Math.floor(ms / 10) / 100).toFixed(2);
}

export function timeLeftUntil(until: string | null): number {
  return until
    ? Math.max(0, new Date(until).getTime() - Date.now())
    : 0;
}

export function getMsParts(ms: number) {
  const totalMs = Math.max(0, Math.floor(ms));

  return {
    hours: Math.floor(totalMs / 3600000),
    minutes: Math.floor(totalMs / 60000) % 60,
    seconds: Math.floor(totalMs / 1000) % 60,
    ms: totalMs % 1000,
  };
}
