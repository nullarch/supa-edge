import { assertEquals, assertStringIncludes } from "@std/assert";
import { SupaEdgeApp } from "../src/app.ts";
import { HttpError } from "../src/errors.ts";

Deno.test("app - basic GET route", async () => {
  const app = new SupaEdgeApp();
  app.get("/hello", (ctx) => ctx.respond.json({ message: "hello" }));

  const res = await app.handler(new Request("http://localhost/hello"));
  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(body.message, "hello");
});

Deno.test("app - POST route with body", async () => {
  const app = new SupaEdgeApp();
  app.post("/items", async (ctx) => {
    const body = await ctx.json();
    return ctx.respond.json({ received: body }, 201);
  });

  const res = await app.handler(
    new Request("http://localhost/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    }),
  );

  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.received.name, "test");
});

Deno.test("app - 404 for unmatched route", async () => {
  const app = new SupaEdgeApp();
  app.get("/hello", (ctx) => ctx.respond.text("hi"));

  const res = await app.handler(new Request("http://localhost/unknown"));
  assertEquals(res.status, 404);

  const body = await res.json();
  assertStringIncludes(body.error, "No route matched");
});

Deno.test("app - HttpError is serialized to JSON", async () => {
  const app = new SupaEdgeApp();
  app.get("/fail", (_ctx) => {
    throw HttpError.badRequest("bad input", { field: "name" });
  });

  const res = await app.handler(new Request("http://localhost/fail"));
  assertEquals(res.status, 400);

  const body = await res.json();
  assertEquals(body.error, "bad input");
  assertEquals(body.details.field, "name");
});

Deno.test("app - global middleware runs for all routes", async () => {
  const app = new SupaEdgeApp();
  app.use(async (ctx, next) => {
    ctx.responseHeaders.set("X-Custom", "middleware");
    return await next();
  });
  app.get("/hello", (ctx) => ctx.respond.text("hi"));

  const res = await app.handler(new Request("http://localhost/hello"));
  assertEquals(res.headers.get("X-Custom"), "middleware");
});

Deno.test("app - path params are available in ctx", async () => {
  const app = new SupaEdgeApp();
  app.get("/users/:id", (ctx) => ctx.respond.json({ id: ctx.params.id }));

  const res = await app.handler(
    new Request("http://localhost/users/42"),
  );
  const body = await res.json();
  assertEquals(body.id, "42");
});

Deno.test("app - custom onError handler", async () => {
  const app = new SupaEdgeApp({
    onError: (err, ctx) => {
      const msg = err instanceof Error ? err.message : "unknown";
      return ctx.respond.json({ custom: msg }, 500);
    },
  });
  app.get("/fail", () => {
    throw new Error("boom");
  });

  const res = await app.handler(new Request("http://localhost/fail"));
  assertEquals(res.status, 500);

  const body = await res.json();
  assertEquals(body.custom, "boom");
});

Deno.test("app - strips /functions/v1/{name} prefix", async () => {
  const app = new SupaEdgeApp();
  app.get("/todos", (ctx) => ctx.respond.json({ ok: true }));

  const res = await app.handler(
    new Request("http://localhost/functions/v1/my-fn/todos"),
  );
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.ok, true);
});

Deno.test("app - HEAD returns GET headers without body", async () => {
  const app = new SupaEdgeApp();
  app.get("/data", (ctx) => ctx.respond.json({ items: [1, 2, 3] }));

  const res = await app.handler(
    new Request("http://localhost/data", { method: "HEAD" }),
  );
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "application/json");

  const body = await res.text();
  assertEquals(body, "");
});

Deno.test("app - HEAD on 404 returns no body", async () => {
  const app = new SupaEdgeApp();
  app.get("/exists", (ctx) => ctx.respond.text("hi"));

  const res = await app.handler(
    new Request("http://localhost/nope", { method: "HEAD" }),
  );
  assertEquals(res.status, 404);

  const body = await res.text();
  assertEquals(body, "");
});

Deno.test("app - all HTTP methods", async () => {
  const app = new SupaEdgeApp();
  app.get("/r", (ctx) => ctx.respond.text("GET"));
  app.post("/r", (ctx) => ctx.respond.text("POST"));
  app.put("/r", (ctx) => ctx.respond.text("PUT"));
  app.patch("/r", (ctx) => ctx.respond.text("PATCH"));
  app.delete("/r", (ctx) => ctx.respond.text("DELETE"));

  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const res = await app.handler(
      new Request("http://localhost/r", { method }),
    );
    assertEquals(await res.text(), method);
  }
});
