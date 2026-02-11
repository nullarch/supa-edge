import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";

/** User-extensible state bag carried on Context. */
// deno-lint-ignore no-explicit-any
export type State = Record<string, any>;

/** Authenticated user info injected by auth middleware. */
export interface User {
  id: string;
  email?: string;
  role?: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/** Validated data set by validator middleware. */
export interface ValidatedData {
  // deno-lint-ignore no-explicit-any
  body?: any;
  // deno-lint-ignore no-explicit-any
  query?: Record<string, any>;
  // deno-lint-ignore no-explicit-any
  params?: Record<string, any>;
}

/** Response builder helpers available on ctx.respond. */
export interface ResponseBuilder {
  /** Return a JSON response. */
  // deno-lint-ignore no-explicit-any
  json(data: any, status?: number): Response;
  /** Return a plain text response. */
  text(data: string, status?: number): Response;
  /** Return an empty 204 response. */
  empty(): Response;
  /** Return a redirect response. */
  redirect(url: string, status?: 301 | 302 | 307 | 308): Response;
}

/** The request context passed to every handler and middleware. */
export interface Context {
  /** The original Request object. */
  readonly request: Request;
  /** HTTP method (GET, POST, etc.) */
  readonly method: string;
  /** Parsed URL object. */
  readonly url: URL;
  /** Path parameters extracted by the router. */
  params: Record<string, string>;
  /** User-extensible state bag. */
  state: State;
  /** Authenticated user (set by auth middleware). */
  user?: User;
  /** Validated data (set by validator middleware). */
  validated: ValidatedData;
  /** Response headers merged into every response. */
  responseHeaders: Headers;
  /** Response builder helpers. */
  readonly respond: ResponseBuilder;
  /** Lazy Supabase client using the request's Authorization header. */
  readonly supabase: SupabaseClient;
  /** Lazy Supabase admin client using the service role key. */
  readonly supabaseAdmin: SupabaseClient;
  /** Parse request body as JSON (cached). */
  // deno-lint-ignore no-explicit-any
  json(): Promise<any>;
  /** Parse request body as text (cached). */
  text(): Promise<string>;
  /** Parse request body as FormData. */
  formData(): Promise<FormData>;
  /** Delegate to EdgeRuntime.waitUntil if available. */
  waitUntil(promise: Promise<unknown>): void;
}

/** Async function called after current middleware; invokes next in chain. */
export type Next = () => Promise<Response>;

/** Middleware function: receives context and next, returns Response. */
export type Middleware = (
  ctx: Context,
  next: Next,
) => Response | Promise<Response>;

/** Route handler: receives context, returns Response. */
export type Handler = (ctx: Context) => Response | Promise<Response>;

/** A registered route entry. */
export interface Route {
  method: string;
  pattern: URLPattern;
  middlewares: Middleware[];
  handler: Handler;
}

/** Options for SupaEdgeApp. */
export interface AppOptions {
  /** Base path to strip (e.g. "/functions/v1/my-fn"). Auto-detected if omitted. */
  basePath?: string;
  /** Custom error handler. */
  onError?: (error: unknown, ctx: Context) => Response | Promise<Response>;
}

/** Options for cors() middleware. */
export interface CorsOptions {
  /** Allowed origins. Defaults to "*". */
  origin?: string | string[] | ((origin: string) => boolean);
  /** Allowed methods. Defaults to common methods. */
  methods?: string[];
  /** Allowed headers. */
  allowedHeaders?: string[];
  /** Exposed headers. */
  exposedHeaders?: string[];
  /** Whether to include credentials. */
  credentials?: boolean;
  /** Max age for preflight cache in seconds. */
  maxAge?: number;
}

/** Options for auth() middleware. */
export interface AuthOptions {
  /** If true, missing/invalid auth does not reject — ctx.user is just undefined. */
  optional?: boolean;
}

/** Options for rateLimit() middleware. */
export interface RateLimitOptions {
  /** Maximum requests per window. Default 100. */
  max?: number;
  /** Window size in milliseconds. Default 60_000 (1 minute). */
  windowMs?: number;
  /** Function to derive a key from the request. Defaults to IP-based. */
  keyFn?: (ctx: Context) => string;
}

/** Options for validator() middleware. */
export interface ValidatorOptions {
  /** Zod schema for the JSON body. */
  body?: ZodType;
  /** Zod schema for URL search params. */
  query?: ZodType;
  /** Zod schema for path params. */
  params?: ZodType;
}

/**
 * Infer validated data types from a ValidatorOptions object.
 *
 * @example
 * ```ts
 * const opts = { body: z.object({ title: z.string() }) } satisfies ValidatorOptions;
 * type Data = InferValidated<typeof opts>;
 * // Data.body = { title: string }
 * ```
 */
export type InferValidated<T extends ValidatorOptions> = {
  body: T["body"] extends ZodType<infer O> ? O : undefined;
  query: T["query"] extends ZodType<infer O> ? O : undefined;
  params: T["params"] extends ZodType<infer O> ? O : undefined;
};
