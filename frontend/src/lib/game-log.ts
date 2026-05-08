import { getBackendUrl } from "@/lib/auth";
import { boardConfigLibrary } from "@/lib/constants";
import { getAuthAccessToken } from "@/lib/supabase";
import type {
  BoardConfig,
  DifficultyName,
  TimeRecord,
  VariantName,
} from "@/lib/types";

type LoggedInGameLog = {
  boardConfig: BoardConfig;
  variant: VariantName;
  difficulty: DifficultyName;
  durationMs: number;
};

export const recordLoggedInGameLog = async (run: LoggedInGameLog) => {
  const accessToken = await getAuthAccessToken();

  const response = await fetch(`${getBackendUrl()}/game-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(run),
  });

  if (!response.ok) {
    throw new Error("Failed to record game run");
  }
};

type BestTimeRow = {
  variant: VariantName;
  difficulty: DifficultyName;
  best_time_ms: number;
  updated_at: string;
};

export const loadLoggedInBestTimes = async () => {
  const accessToken = await getAuthAccessToken();

  const response = await fetch(`${getBackendUrl()}/game-logs/best-times`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!response.ok) {
    throw new Error("Failed to load best times");
  }

  const rows = (await response.json()) as BestTimeRow[];

  return rows.map<TimeRecord>((row) => ({
    boardConfig: boardConfigLibrary[row.variant][row.difficulty],
    timeElapsed: row.best_time_ms,
    date: new Date(row.updated_at).getTime(),
    mineArray: [],
  }));
};
