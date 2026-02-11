import type { AppOptions, Context, Handler, Middleware } from "./types.ts";
import { HttpError } from "./errors.ts";
import { ContextImpl } from "./context.ts";
import { compose } from "./compose.ts";
import { Router } from "./router.ts";

/**
 * Main application class for supa-edge.
 * Provides middleware registration, routing, and Deno.serve() integration.
 */
export class SupaEdgeApp {
  private globalMiddlewares: Middleware[] = [];
  private router: Router;
  private options: AppOptions;

  constructor(options: AppOptions = {}) {
    this.options = options;
    const basePath = options.basePath ?? "";
    this.router = new Router(basePath);
  }

  /** Register a global middleware. */
  use(middleware: Middleware): this {
    this.globalMiddlewares.push(middleware);
    return this;
  }

  /** Register a GET route with optional route-level middleware. */
  get(path: string, ...args: [...Middleware[], Handler]): this {
    this.router.get(path, ...args);
    return this;
  }

  /** Register a POST route. */
  post(path: string, ...args: [...Middleware[], Handler]): this {
    this.router.post(path, ...args);
    return this;
  }

  /** Register a PUT route. */
  put(path: string, ...args: [...Middleware[], Handler]): this {
    this.router.put(path, ...args);
    return this;
  }

  /** Register a PATCH route. */
  patch(path: string, ...args: [...Middleware[], Handler]): this {
    this.router.patch(path, ...args);
    return this;
  }

  /** Register a DELETE route. */
  delete(path: string, ...args: [...Middleware[], Handler]): this {
    this.router.delete(path, ...args);
    return this;
  }

  /**
   * Build a Request → Response handler function.
   * Useful for testing without starting a server.
   */
  get handler(): (request: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
      const ctx = new ContextImpl(request);

      let response: Response;
      try {
        // Detect basePath from Supabase edge function URL if not set
        const effectiveUrl = this.resolveUrl(request);

        // Match route
        const matched = this.router.match(request.method, effectiveUrl);

        if (!matched) {
          // Build the full middleware chain even for 404
          // so CORS and other global middleware still run
          const allMiddleware = [...this.globalMiddlewares];
          const composed = compose(allMiddleware);
          response = await composed(ctx, () => {
            throw HttpError.notFound(
              `No route matched: ${request.method} ${ctx.url.pathname}`,
            );
          });
        } else {
          const { route, params } = matched;
          ctx.params = params;

          // Compose: global middleware → route middleware → handler
          const allMiddleware = [
            ...this.globalMiddlewares,
            ...route.middlewares,
          ];
          const composed = compose(allMiddleware);
          response = await composed(
            ctx,
            () => Promise.resolve(route.handler(ctx)),
          );
        }
      } catch (error) {
        response = await this.handleError(error, ctx);
      }

      // HEAD responses must not include a body (RFC 7231 §4.3.2)
      if (request.method === "HEAD") {
        return new Response(null, {
          status: response.status,
          headers: response.headers,
        });
      }

      return response;
    };
  }

  /** Start serving with Deno.serve(). Returns the server instance for lifecycle control. */
  serve(options?: Deno.ServeOptions): Deno.HttpServer {
    if (options) {
      return Deno.serve(options, this.handler);
    }
    return Deno.serve(this.handler);
  }

  /** Resolve URL, stripping auto-detected basePath for Supabase edge functions. */
  private resolveUrl(request: Request): string {
    if (this.options.basePath) {
      // basePath is already baked into router patterns
      return request.url;
    }

    // Auto-detect /functions/v1/{name} prefix
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/functions\/v1\/[^/]+/);
    if (match) {
      // Rewrite URL so routes match without the prefix
      const stripped = url.pathname.slice(match[0].length) || "/";
      const rewritten = new URL(stripped, url.origin);
      rewritten.search = url.search;
      return rewritten.toString();
    }

    return request.url;
  }

  /** Convert errors to JSON responses. */
  private async handleError(error: unknown, ctx: Context): Promise<Response> {
    if (this.options.onError) {
      try {
        return await this.options.onError(error, ctx);
      } catch {
        // Fall through to default handling
      }
    }

    const headers = new Headers(ctx.responseHeaders);
    headers.set("Content-Type", "application/json");

    if (error instanceof HttpError) {
      return new Response(JSON.stringify(error.toJSON()), {
        status: error.status,
        headers,
      });
    }

    const message = error instanceof Error
      ? error.message
      : "Internal Server Error";
    console.error("[supa-edge] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: message, status: 500 }),
      { status: 500, headers },
    );
  }
}
