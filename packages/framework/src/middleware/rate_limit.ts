import type { Middleware, RateLimitOptions } from "../types.ts";
import { HttpError } from "../errors.ts";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter middleware.
 * Uses a simple counter per key with periodic lazy cleanup.
 *
 * **Important:** This stores counters in process memory. In Supabase Edge
 * Functions, each deployment instance keeps its own store, and instances may
 * be recycled between requests. This makes in-memory rate limiting
 * best-effort rather than strict. For strict distributed rate limiting,
 * use an external store (e.g. Redis, Supabase database) with a custom
 * middleware instead.
 */
export function rateLimit(options: RateLimitOptions = {}): Middleware {
  const {
    max = 100,
    windowMs = 60_000,
    keyFn,
  } = options;

  const store = new Map<string, RateLimitEntry>();
  let lastCleanup = Date.now();

  function getKey(ctx: Parameters<Middleware>[0]): string {
    if (keyFn) return keyFn(ctx);
    // Default: use X-Forwarded-For or X-Real-IP or "unknown"
    return ctx.request.headers.get("x-forwarded-for") ??
      ctx.request.headers.get("x-real-ip") ??
      "unknown";
  }

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < windowMs) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }

  return async (ctx, next) => {
    cleanup();

    const key = getKey(ctx);
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    ctx.responseHeaders.set("X-RateLimit-Limit", String(max));
    ctx.responseHeaders.set(
      "X-RateLimit-Remaining",
      String(Math.max(0, max - entry.count)),
    );
    ctx.responseHeaders.set(
      "X-RateLimit-Reset",
      String(Math.ceil(entry.resetAt / 1000)),
    );

    if (entry.count > max) {
      throw HttpError.tooManyRequests("Rate limit exceeded");
    }

    return await next();
  };
}
