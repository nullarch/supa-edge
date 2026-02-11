import type { TestRequestOptions } from "./types.ts";

/**
 * Test handler that invokes an app's handler directly without Deno.serve().
 * Provides convenience methods for each HTTP method.
 */
export class TestHandler {
  private handler: (request: Request) => Response | Promise<Response>;
  private baseUrl: string;

  constructor(
    handler: (request: Request) => Response | Promise<Response>,
    baseUrl = "http://localhost",
  ) {
    this.handler = handler;
    this.baseUrl = baseUrl;
  }

  /** Send a GET request. */
  get(path: string, options?: TestRequestOptions): Promise<Response> {
    return this.request("GET", path, options);
  }

  /** Send a POST request. */
  post(path: string, options?: TestRequestOptions): Promise<Response> {
    return this.request("POST", path, options);
  }

  /** Send a PUT request. */
  put(path: string, options?: TestRequestOptions): Promise<Response> {
    return this.request("PUT", path, options);
  }

  /** Send a PATCH request. */
  patch(path: string, options?: TestRequestOptions): Promise<Response> {
    return this.request("PATCH", path, options);
  }

  /** Send a DELETE request. */
  delete(path: string, options?: TestRequestOptions): Promise<Response> {
    return this.request("DELETE", path, options);
  }

  /** Send an OPTIONS request. */
  options(path: string, options?: TestRequestOptions): Promise<Response> {
    return this.request("OPTIONS", path, options);
  }

  /** Send a request with the given method. */
  async request(
    method: string,
    path: string,
    options: TestRequestOptions = {},
  ): Promise<Response> {
    const url = new URL(path, this.baseUrl);

    // Add query params
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers = new Headers(options.headers ?? {});
    let bodyStr: string | undefined;

    if (options.body !== undefined) {
      bodyStr = JSON.stringify(options.body);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    }

    const request = new Request(url.toString(), {
      method,
      headers,
      body: bodyStr,
    });

    return await this.handler(request);
  }
}
