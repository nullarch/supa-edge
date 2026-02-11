import { assertEquals } from "@std/assert";
import { z } from "zod";
import { SupaEdgeApp } from "../../src/app.ts";
import { validator } from "../../src/middleware/validator.ts";

Deno.test("validator - validates valid body", async () => {
  const schema = z.object({ name: z.string(), age: z.number() });

  const app = new SupaEdgeApp();
  app.post(
    "/test",
    validator({ body: schema }),
    (ctx) => ctx.respond.json(ctx.validated.body),
  );

  const res = await app.handler(
    new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", age: 30 }),
    }),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.name, "Alice");
  assertEquals(body.age, 30);
});

Deno.test("validator - rejects invalid body", async () => {
  const schema = z.object({ name: z.string(), age: z.number() });

  const app = new SupaEdgeApp();
  app.post(
    "/test",
    validator({ body: schema }),
    (ctx) => ctx.respond.json(ctx.validated.body),
  );

  const res = await app.handler(
    new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    }),
  );

  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Validation failed: body");
  assertEquals(Array.isArray(body.details.issues), true);
});

Deno.test("validator - validates query params", async () => {
  const schema = z.object({ page: z.string(), limit: z.string() });

  const app = new SupaEdgeApp();
  app.get(
    "/test",
    validator({ query: schema }),
    (ctx) => ctx.respond.json(ctx.validated.query),
  );

  const res = await app.handler(
    new Request("http://localhost/test?page=1&limit=10"),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.page, "1");
  assertEquals(body.limit, "10");
});

Deno.test("validator - rejects invalid query params", async () => {
  const schema = z.object({ page: z.string(), limit: z.string() });

  const app = new SupaEdgeApp();
  app.get(
    "/test",
    validator({ query: schema }),
    (ctx) => ctx.respond.json(ctx.validated.query),
  );

  const res = await app.handler(
    new Request("http://localhost/test?page=1"),
  );

  assertEquals(res.status, 400);
});

Deno.test("validator - validates path params", async () => {
  const schema = z.object({ id: z.string().regex(/^\d+$/) });

  const app = new SupaEdgeApp();
  app.get(
    "/items/:id",
    validator({ params: schema }),
    (ctx) => ctx.respond.json(ctx.validated.params),
  );

  const res = await app.handler(
    new Request("http://localhost/items/42"),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.id, "42");
});

Deno.test("validator - handles multi-value query params", async () => {
  const schema = z.object({
    tag: z.array(z.string()),
    page: z.string(),
  });

  const app = new SupaEdgeApp();
  app.get(
    "/test",
    validator({ query: schema }),
    (ctx) => ctx.respond.json(ctx.validated.query),
  );

  const res = await app.handler(
    new Request("http://localhost/test?tag=a&tag=b&page=1"),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.tag, ["a", "b"]);
  assertEquals(body.page, "1");
});

Deno.test("validator - single query param stays as string", async () => {
  const schema = z.object({ q: z.string() });

  const app = new SupaEdgeApp();
  app.get(
    "/test",
    validator({ query: schema }),
    (ctx) => ctx.respond.json(ctx.validated.query),
  );

  const res = await app.handler(
    new Request("http://localhost/test?q=hello"),
  );

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.q, "hello");
});

Deno.test("validator - rejects invalid JSON body", async () => {
  const schema = z.object({ name: z.string() });

  const app = new SupaEdgeApp();
  app.post(
    "/test",
    validator({ body: schema }),
    (ctx) => ctx.respond.json(ctx.validated.body),
  );

  const res = await app.handler(
    new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }),
  );

  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid JSON body");
});
