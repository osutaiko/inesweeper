import { getBackendUrl } from "@/lib/auth";
import type { BoardConfig, DifficultyName, VariantName } from "@/lib/types";

type LoggedInGameLog = {
  boardConfig: BoardConfig;
  variant: VariantName;
  difficulty: DifficultyName;
  durationMs: number;
};

export const recordLoggedInGameLog = async (run: LoggedInGameLog) => {
  const response = await fetch(`${getBackendUrl()}/game-logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(run),
  });

  if (!response.ok) {
    throw new Error("Failed to record game run");
  }
};
