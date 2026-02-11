import type { CorsOptions, Middleware } from "../types.ts";

const DEFAULT_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const DEFAULT_HEADERS = [
  "Authorization",
  "X-Client-Info",
  "Content-Type",
  "Accept",
  "apikey",
];

/**
 * CORS middleware with automatic OPTIONS preflight handling.
 */
export function cors(options: CorsOptions = {}): Middleware {
  const {
    origin = "*",
    methods = DEFAULT_METHODS,
    allowedHeaders = DEFAULT_HEADERS,
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400,
  } = options;

  function resolveOrigin(requestOrigin: string | null): string {
    if (typeof origin === "function") {
      return requestOrigin && origin(requestOrigin) ? requestOrigin : "";
    }
    if (Array.isArray(origin)) {
      return requestOrigin && origin.includes(requestOrigin)
        ? requestOrigin
        : "";
    }
    // When credentials is true, wildcard "*" is not allowed by browsers.
    // Reflect the request Origin instead (same behavior as Express cors).
    if (origin === "*" && credentials && requestOrigin) {
      return requestOrigin;
    }
    if (typeof origin === "string") return origin;
    return "*";
  }

  function setCorsHeaders(headers: Headers, requestOrigin: string | null) {
    const resolvedOrigin = resolveOrigin(requestOrigin);
    if (resolvedOrigin) {
      headers.set("Access-Control-Allow-Origin", resolvedOrigin);
    }
    if (credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    if (exposedHeaders.length > 0) {
      headers.set("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    }
    // If origin is dynamic, add Vary header
    if (
      typeof origin === "function" ||
      Array.isArray(origin) ||
      (origin === "*" && credentials)
    ) {
      headers.append("Vary", "Origin");
    }
  }

  return async (ctx, next) => {
    const requestOrigin = ctx.request.headers.get("Origin");

    // Set CORS headers on responseHeaders so they're included in all responses
    setCorsHeaders(ctx.responseHeaders, requestOrigin);

    // Handle preflight
    if (ctx.method === "OPTIONS") {
      const headers = new Headers(ctx.responseHeaders);
      headers.set("Access-Control-Allow-Methods", methods.join(", "));
      headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      headers.set("Access-Control-Max-Age", String(maxAge));
      return new Response(null, { status: 204, headers });
    }

    return await next();
  };
}
