# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

supa-edge is a Deno monorepo providing two JSR packages for Supabase Edge Functions:
- `@supa-edge/framework` — router, middleware, context with lazy Supabase client, response helpers
- `@supa-edge/testing` — mocking utilities for testing edge functions without a server

## Commands

```bash
# All commands run from the repo root

# Type check
deno check packages/framework/mod.ts packages/testing/mod.ts

# Lint
deno lint packages/ examples/

# Format
deno fmt packages/ examples/

# Run all tests
deno test --allow-env --allow-net packages/

# Run example tests
deno test --allow-env --allow-net examples/

# Run a single test file
deno test --allow-env --allow-net packages/framework/tests/app_test.ts

# Run tests matching a name pattern
deno test --allow-env --allow-net --filter "cors" packages/
```

## Architecture

### Request Flow

`SupaEdgeApp.handler` (a getter returning `Request → Promise<Response>`):
1. Creates `ContextImpl` from the raw Request
2. Auto-strips `/functions/v1/{fn-name}` prefix from URLs (Supabase edge function convention)
3. Matches route via `Router` using `URLPattern` API — HEAD requests fall back to GET routes
4. Composes global + route middleware chain, handler as the final `next`
5. On unmatched routes, global middleware still runs (for CORS), then throws `HttpError.notFound`
6. `handleError` catches thrown errors — `HttpError` becomes structured JSON; others become 500
7. HEAD responses have their body stripped after both success and error paths (RFC 7231)

### Middleware Model (Onion/Koa-style)

`compose.ts` implements recursive dispatch: each middleware calls `next()` to proceed, with execution wrapping around inner middleware. The app composes middleware as: **global middleware → route-level middleware → handler**. Double `next()` calls throw.

### Context

`ContextImpl` is created per-request. Key patterns:
- **Lazy Supabase clients**: `ctx.supabase` (user-context, uses request's Authorization header) and `ctx.supabaseAdmin` (service role key) are created on first access via getters
- **Body caching**: `ctx.json()` and `ctx.text()` clone the request and cache the promise. `ctx.formData()` clones but does NOT cache
- **Response headers**: `ctx.responseHeaders` is a `Headers` object merged into every response built via `ctx.respond.*`. This is how CORS headers propagate — the cors middleware sets them on `ctx.responseHeaders` early, and all response helpers copy them

### Route Registration

Routes accept variadic args: `app.get("/path", ...middlewares, handler)`. The last arg is always the Handler; all preceding args are route-level Middleware. The Router stores `URLPattern` instances and matches against full URLs.

### CORS Behavior

When `credentials: true` with wildcard origin (default `"*"`), the middleware reflects the request's `Origin` header instead of returning `"*"` (browsers reject `Access-Control-Allow-Origin: *` with credentials). A `Vary: Origin` header is added in this case.

### Validator Type Safety

`ValidatorOptions` fields are typed as `ZodType`. Use `InferValidated<T>` to extract typed validated data:

```ts
const opts = { body: z.object({ title: z.string() }) } satisfies ValidatorOptions;
app.post("/items", validator(opts), (ctx) => {
  const { title } = ctx.validated.body as InferValidated<typeof opts>["body"];
});
```

Multi-value query params (`?tag=a&tag=b`) are collected into arrays. Single values stay as strings.

### Testing Without Supabase

Tests that touch `ctx.supabase` must either:
- Mock env vars with `mockEnv()` from `@supa-edge/testing` (sets SUPABASE_URL, SUPABASE_ANON_KEY)
- Override the supabase property via `Object.defineProperty(ctx, "supabase", { value: mockClient })` in a middleware that runs before `auth()`

The `TestHandler` class wraps `app.handler` and provides `get/post/put/patch/delete/options` convenience methods that build Request objects.

`createMockSupabase()` supports `onTable()` (select/insert/update/delete/upsert), `onRpc()`, and `onAuth()` via builder pattern. Upsert falls back to insert config if not explicitly set.

### Package Dependencies

`@supa-edge/testing` depends on `@supa-edge/framework` (workspace reference). Both use `@std/assert` for tests. Framework depends on `npm:zod` and `npm:@supabase/supabase-js`. The `examples/` workspace member imports both packages via relative paths.

## Conventions

- All public API is re-exported through `mod.ts` at each package root
- Test files are `*_test.ts` in `tests/` directories mirroring `src/`
- Use `@std/assert` (JSR) for assertions — never bare `https://` imports
- Middleware functions are factory functions returning `Middleware` (e.g., `cors()` returns a middleware, not is one)
- `HttpError` static factories (`HttpError.badRequest()`, `.unauthorized()`, etc.) are the standard way to signal HTTP errors from handlers
- `serve()` returns `Deno.HttpServer` for lifecycle control; called without args when no options needed
