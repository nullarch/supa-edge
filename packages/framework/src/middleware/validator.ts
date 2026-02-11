import type { Middleware, ValidatorOptions } from "../types.ts";
import { HttpError } from "../errors.ts";

/**
 * Validation middleware using Zod schemas.
 * Validates body, query params, and/or path params.
 * Validated results are stored in ctx.validated.
 */
export function validator(options: ValidatorOptions): Middleware {
  return async (ctx, next) => {
    // Validate body
    if (options.body) {
      let rawBody: unknown;
      try {
        rawBody = await ctx.json();
      } catch {
        throw HttpError.badRequest("Invalid JSON body");
      }

      const result = options.body.safeParse(rawBody);
      if (!result.success) {
        throw HttpError.badRequest("Validation failed: body", {
          issues: result.error.issues,
        });
      }
      ctx.validated.body = result.data;
    }

    // Validate query params
    if (options.query) {
      const queryObj: Record<string, string | string[]> = {};
      for (const [key, value] of ctx.url.searchParams) {
        const existing = queryObj[key];
        if (existing === undefined) {
          queryObj[key] = value;
        } else if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          queryObj[key] = [existing, value];
        }
      }

      const result = options.query.safeParse(queryObj);
      if (!result.success) {
        throw HttpError.badRequest("Validation failed: query", {
          issues: result.error.issues,
        });
      }
      ctx.validated.query = result.data;
    }

    // Validate path params
    if (options.params) {
      const result = options.params.safeParse(ctx.params);
      if (!result.success) {
        throw HttpError.badRequest("Validation failed: params", {
          issues: result.error.issues,
        });
      }
      ctx.validated.params = result.data;
    }

    return await next();
  };
}
