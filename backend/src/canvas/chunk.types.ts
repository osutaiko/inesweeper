export type DailyAttemptState = {
  userId: string;
  dateKey: string;
  attemptsUsed: number;
};

export type Chunk = {
  chunkX: number;
  chunkY: number;
  state: 'open' | 'locked' | 'solved';
  lockedByUserId: string | null;
  lockedByName: string | null;
  lockedAt: string | null;
  lockedUntil: string | null;
  solverUserId: string | null;
  solverName: string | null;
  solvedAt: string | null;
};
