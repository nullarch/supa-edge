import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Context,
  ResponseBuilder,
  State,
  User,
  ValidatedData,
} from "./types.ts";
import { getSupabaseEnv } from "./supabase/env.ts";

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

/**
 * Concrete Context implementation.
 * Provides lazy Supabase clients, body caching, and response helpers.
 */
export class ContextImpl implements Context {
  readonly request: Request;
  readonly method: string;
  readonly url: URL;
  params: Record<string, string> = {};
  state: State = {};
  user?: User;
  validated: ValidatedData = {};
  responseHeaders: Headers;

  private _supabase?: SupabaseClient;
  private _supabaseAdmin?: SupabaseClient;
  private _jsonCache?: Promise<unknown>;
  private _textCache?: Promise<string>;

  constructor(request: Request, responseHeaders?: Headers) {
    this.request = request;
    this.method = request.method;
    this.url = new URL(request.url);
    this.responseHeaders = responseHeaders ?? new Headers();
  }

  /** Lazy Supabase client using the request's Authorization header. */
  get supabase(): SupabaseClient {
    if (!this._supabase) {
      const env = getSupabaseEnv();
      const authHeader = this.request.headers.get("Authorization") ?? "";
      this._supabase = createClient(env.url, env.anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
    }
    return this._supabase;
  }

  /** Lazy Supabase admin client using the service role key. */
  get supabaseAdmin(): SupabaseClient {
    if (!this._supabaseAdmin) {
      const env = getSupabaseEnv();
      if (!env.serviceRoleKey) {
        throw new Error(
          "Missing environment variable: SUPABASE_SERVICE_ROLE_KEY",
        );
      }
      this._supabaseAdmin = createClient(env.url, env.serviceRoleKey);
    }
    return this._supabaseAdmin;
  }

  /** Parse request body as JSON (cached). */
  // deno-lint-ignore no-explicit-any
  json(): Promise<any> {
    if (!this._jsonCache) {
      this._jsonCache = this.request.clone().json();
    }
    return this._jsonCache;
  }

  /** Parse request body as text (cached). */
  text(): Promise<string> {
    if (!this._textCache) {
      this._textCache = this.request.clone().text();
    }
    return this._textCache;
  }

  /** Parse request body as FormData. */
  formData(): Promise<FormData> {
    return this.request.clone().formData();
  }

  /** Delegate to EdgeRuntime.waitUntil if available. */
  waitUntil(promise: Promise<unknown>): void {
    try {
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(promise);
      }
    } catch {
      // EdgeRuntime not available (local dev / tests), ignore
    }
  }

  /** Response builder that merges responseHeaders into every response. */
  get respond(): ResponseBuilder {
    return {
      // deno-lint-ignore no-explicit-any
      json: (data: any, status = 200): Response => {
        const headers = new Headers(this.responseHeaders);
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(data), { status, headers });
      },

      text: (data: string, status = 200): Response => {
        const headers = new Headers(this.responseHeaders);
        headers.set("Content-Type", "text/plain; charset=utf-8");
        return new Response(data, { status, headers });
      },

      empty: (): Response => {
        const headers = new Headers(this.responseHeaders);
        return new Response(null, { status: 204, headers });
      },

      redirect: (
        url: string,
        status: 301 | 302 | 307 | 308 = 302,
      ): Response => {
        const headers = new Headers(this.responseHeaders);
        headers.set("Location", url);
        return new Response(null, { status, headers });
      },
    };
  }
}
