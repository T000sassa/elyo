/**
 * Einfacher In-Memory Rate-Limiter (Sliding Window).
 *
 * HINWEIS: Funktioniert nur für Single-Instance-Deployments (z.B. lokal / ein Server).
 * Für Multi-Instance (Vercel, Kubernetes) durch Upstash Redis ersetzen:
 * https://github.com/upstash/ratelimit
 */

interface RateEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateEntry>();

// Cleanup alter Einträge alle 5 Minuten
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now - entry.windowStart > 60_000 * 10) {
      store.delete(key);
    }
  });
}, 5 * 60_000);

/**
 * @param key       Eindeutiger Schlüssel (z.B. IP-Adresse oder "ip:endpoint")
 * @param limit     Max. Anfragen pro Zeitfenster
 * @param windowMs  Zeitfenster in Millisekunden
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetAt = entry.windowStart + windowMs;

  return { allowed: entry.count <= limit, remaining, resetAt };
}

/**
 * Gibt IP-Adresse aus Next.js Request-Headers zurück.
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
