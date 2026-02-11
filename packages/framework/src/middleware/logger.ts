import type { Middleware } from "../types.ts";

/**
 * Request/response logging middleware.
 * Logs: [supa-edge] GET /todos 200 (12.3ms)
 */
export function logger(): Middleware {
  return async (ctx, next) => {
    const start = performance.now();
    const { method } = ctx;
    const pathname = ctx.url.pathname;

    let response: Response;
    try {
      response = await next();
    } catch (err) {
      const elapsed = (performance.now() - start).toFixed(1);
      console.error(`[supa-edge] ${method} ${pathname} ERR (${elapsed}ms)`);
      throw err;
    }

    const elapsed = (performance.now() - start).toFixed(1);
    console.log(
      `[supa-edge] ${method} ${pathname} ${response.status} (${elapsed}ms)`,
    );

    return response;
  };
}
