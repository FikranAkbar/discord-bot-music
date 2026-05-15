/** Simple in-memory rate limiter: 1 command per user per 2 seconds */
const COOLDOWN_MS = 2000;
const timestamps = new Map<string, number>();

/**
 * Returns true if the user is allowed to execute a command.
 * Returns false if the user is still on cooldown.
 */
export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastUsed = timestamps.get(userId) ?? 0;

  if (now - lastUsed < COOLDOWN_MS) {
    return false;
  }

  timestamps.set(userId, now);
  return true;
}

/** Returns remaining cooldown in milliseconds, or 0 if not on cooldown */
export function getRemainingCooldown(userId: string): number {
  const lastUsed = timestamps.get(userId) ?? 0;
  const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
  return Math.max(0, remaining);
}
