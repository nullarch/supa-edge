import type { AuthOptions, Middleware } from "../types.ts";
import { HttpError } from "../errors.ts";

/**
 * Authentication middleware.
 * Extracts the JWT from the Authorization header, validates it via
 * supabase.auth.getUser(), and sets ctx.user.
 */
export function auth(options: AuthOptions = {}): Middleware {
  const { optional = false } = options;

  return async (ctx, next) => {
    const authHeader = ctx.request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (optional) {
        return await next();
      }
      throw HttpError.unauthorized("Missing or invalid Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const { data, error } = await ctx.supabase.auth.getUser(token);
      if (error || !data.user) {
        if (optional) {
          return await next();
        }
        throw HttpError.unauthorized(error?.message ?? "Invalid token");
      }

      ctx.user = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        ...data.user.user_metadata,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (optional) {
        return await next();
      }
      throw HttpError.unauthorized("Authentication failed");
    }

    return await next();
  };
}
