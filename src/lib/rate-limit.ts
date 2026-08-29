type Entry = { attempts: number; resetAt: number };
const attempts = new Map<string, Entry>();

export function consumeLoginAttempt(key: string, limit = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.attempts >= limit) return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now };
  current.attempts += 1;
  return { allowed: true, remaining: limit - current.attempts };
}

export function clearLoginAttempts(key: string) {
  attempts.delete(key);
}

