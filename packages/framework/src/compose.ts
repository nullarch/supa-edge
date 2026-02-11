import type { Context, Middleware, Next } from "./types.ts";

/**
 * Compose an array of middleware into a single middleware function
 * using the onion model (Koa/Hono-style recursive dispatch).
 *
 * Each middleware calls `next()` to invoke the next in the chain.
 * Calling `next()` more than once throws an error.
 */
export function compose(middlewares: Middleware[]): Middleware {
  return function composed(ctx: Context, finalNext: Next): Promise<Response> {
    let index = -1;

    function dispatch(i: number): Promise<Response> {
      if (i <= index) {
        return Promise.reject(
          new Error("next() called multiple times in the same middleware"),
        );
      }
      index = i;

      try {
        if (i < middlewares.length) {
          return Promise.resolve(
            middlewares[i](ctx, () => dispatch(i + 1)),
          );
        }
        return Promise.resolve(finalNext());
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}
