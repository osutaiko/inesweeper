export type DailyAttemptState = {
  userId: string;
  dateKey: string;
  attemptsUsed: number;
};

export type Chunk = {
  chunkX: number;
  chunkY: number;
  state: 'open' | 'solving' | 'solved';
  solverUserId: string | null;
  solvedAt: string | null;
  lockedUntil: string | null;
};
