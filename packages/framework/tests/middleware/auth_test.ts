import { assertEquals } from "@std/assert";
import { SupaEdgeApp } from "../../src/app.ts";
import { auth } from "../../src/middleware/auth.ts";
import type { Middleware } from "../../src/types.ts";

/** Create a middleware that injects a mock supabase client into ctx. */
function mockSupabaseMiddleware(
  // deno-lint-ignore no-explicit-any
  authResult: { data: { user: any }; error: any },
): Middleware {
  return async (ctx, next) => {
    // Override supabase getter via state
    const mockClient = {
      auth: {
        getUser: () => Promise.resolve(authResult),
      },
    };
    // Override the supabase property on context
    Object.defineProperty(ctx, "supabase", {
      value: mockClient,
      writable: false,
      configurable: true,
    });
    return await next();
  };
}

Deno.test("auth - rejects missing Authorization header", async () => {
  const app = new SupaEdgeApp();
  app.use(auth());
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(new Request("http://localhost/test"));
  assertEquals(res.status, 401);
});

Deno.test("auth - rejects invalid token", async () => {
  const app = new SupaEdgeApp();
  app.use(
    mockSupabaseMiddleware({
      data: { user: null },
      error: { message: "Invalid token" },
    }),
  );
  app.use(auth());
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Authorization: "Bearer bad-token" },
    }),
  );
  assertEquals(res.status, 401);
});

Deno.test("auth - sets ctx.user on valid token", async () => {
  const app = new SupaEdgeApp();
  app.use(
    mockSupabaseMiddleware({
      data: {
        user: {
          id: "user-1",
          email: "test@example.com",
          role: "authenticated",
          user_metadata: {},
        },
      },
      error: null,
    }),
  );
  app.use(auth());
  app.get("/test", (ctx) => ctx.respond.json({ userId: ctx.user?.id }));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Authorization: "Bearer valid-token" },
    }),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.userId, "user-1");
});

Deno.test("auth - optional mode allows missing auth", async () => {
  const app = new SupaEdgeApp();
  app.use(auth({ optional: true }));
  app.get("/test", (ctx) => ctx.respond.json({ hasUser: !!ctx.user }));

  const res = await app.handler(new Request("http://localhost/test"));
  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(body.hasUser, false);
});

Deno.test("auth - optional mode allows invalid token", async () => {
  const app = new SupaEdgeApp();
  app.use(
    mockSupabaseMiddleware({
      data: { user: null },
      error: { message: "Invalid" },
    }),
  );
  app.use(auth({ optional: true }));
  app.get("/test", (ctx) => ctx.respond.json({ hasUser: !!ctx.user }));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Authorization: "Bearer bad" },
    }),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.hasUser, false);
});
