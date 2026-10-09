const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(keyId: string, limit: number, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = store.get(keyId);

  if (!entry || now > entry.resetAt) {
    store.set(keyId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRateLimitReset(keyId: string): number {
  const entry = store.get(keyId);
  return entry ? Math.max(0, entry.resetAt - Date.now()) : 0;
}
