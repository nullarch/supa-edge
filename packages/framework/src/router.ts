import type { Handler, Middleware, Route } from "./types.ts";

/**
 * URLPattern-based router.
 * Matches routes by method and path, extracts path parameters.
 */
export class Router {
  readonly routes: Route[] = [];
  private basePath: string;

  constructor(basePath = "") {
    this.basePath = basePath;
  }

  /** Register a route with optional route-level middleware. */
  add(
    method: string,
    path: string,
    ...args: [...Middleware[], Handler]
  ): this {
    const handler = args.pop() as Handler;
    const middlewares = args as Middleware[];
    const fullPath = this.basePath + path;

    const pattern = new URLPattern({ pathname: fullPath });

    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      middlewares,
      handler,
    });
    return this;
  }

  /** Register a GET route. */
  get(path: string, ...args: [...Middleware[], Handler]): this {
    return this.add("GET", path, ...args);
  }

  /** Register a POST route. */
  post(path: string, ...args: [...Middleware[], Handler]): this {
    return this.add("POST", path, ...args);
  }

  /** Register a PUT route. */
  put(path: string, ...args: [...Middleware[], Handler]): this {
    return this.add("PUT", path, ...args);
  }

  /** Register a PATCH route. */
  patch(path: string, ...args: [...Middleware[], Handler]): this {
    return this.add("PATCH", path, ...args);
  }

  /** Register a DELETE route. */
  delete(path: string, ...args: [...Middleware[], Handler]): this {
    return this.add("DELETE", path, ...args);
  }

  /**
   * Match a request against registered routes.
   * Returns the matched route and extracted path parameters, or null.
   */
  match(
    method: string,
    url: string,
  ): { route: Route; params: Record<string, string> } | null {
    const upperMethod = method.toUpperCase();
    for (const route of this.routes) {
      if (
        route.method !== upperMethod &&
        route.method !== "ALL" &&
        !(upperMethod === "HEAD" && route.method === "GET")
      ) {
        continue;
      }
      const result = route.pattern.exec(url);
      if (result) {
        const params: Record<string, string> = {};
        const groups = result.pathname.groups;
        for (const [key, value] of Object.entries(groups)) {
          if (value !== undefined) {
            params[key] = value;
          }
        }
        return { route, params };
      }
    }
    return null;
  }
}
