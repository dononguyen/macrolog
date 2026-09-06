/**
 * A sliding-window rate limiter held in process memory.
 *
 * Scope, stated plainly: this protects a single running instance. Behind
 * several instances, or on a serverless platform where a cold start begins
 * with an empty map, the effective limit multiplies by however many instances
 * are live. It still does the main job — one client cannot sit in a loop
 * against a warm instance — but it is a throttle on casual abuse, not a hard
 * global cap. A deployment that needs the latter wants a shared store (Redis
 * or the platform's own limiter) behind the same interface.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Seconds until the window frees up, for a Retry-After header. */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check(key: string, now?: number): RateLimitResult;
  /** Tracked keys, exposed for tests. */
  size(): number;
};

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  /**
   * Ceiling on distinct keys held at once. Without it, a flood of spoofed
   * addresses would grow the map until the process runs out of memory — the
   * limiter itself becomes the denial of service.
   */
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  function sweep(now: number) {
    for (const [key, times] of hits) {
      const live = times.filter((t) => now - t < windowMs);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      // Drop expired keys before considering the cap, so a busy-but-legitimate
      // server is not evicting live entries while stale ones sit in the map.
      if (hits.size >= maxKeys) {
        sweep(now);
        if (hits.size >= maxKeys && !hits.has(key)) {
          // Still full of live keys: fail closed rather than grow without
          // bound. Under an attack of this size everyone is degraded anyway.
          return { allowed: false, remaining: 0, retryAfterSeconds: 1 };
        }
      }

      const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

      if (times.length >= limit) {
        const oldest = times[0];
        hits.set(key, times);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((windowMs - (now - oldest)) / 1000),
          ),
        };
      }

      times.push(now);
      hits.set(key, times);
      return {
        allowed: true,
        remaining: limit - times.length,
        retryAfterSeconds: 0,
      };
    },

    size() {
      return hits.size;
    },
  };
}

/**
 * Best-effort client identity.
 *
 * How much this can be trusted depends entirely on what sits in front of the
 * app. A managed platform (Vercel, Cloudflare, most load balancers) overwrites
 * X-Forwarded-For with the real client address, and there the left-most entry
 * is sound. Running the server directly on an open port, a client can simply
 * send the header itself and pick its own bucket.
 *
 * So: fine for rate limiting, never for authorisation.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // The left-most entry is the original client, when the proxy is honest.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}
