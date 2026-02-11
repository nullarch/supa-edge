import { assertEquals, assertNotEquals } from "@std/assert";
import { Router } from "../src/router.ts";
import type { Handler, Middleware } from "../src/types.ts";

Deno.test("router - matches GET route", () => {
  const router = new Router();
  router.get("/hello", (ctx) => ctx.respond.text("hi"));

  const result = router.match("GET", "http://localhost/hello");
  assertNotEquals(result, null);
  assertEquals(result!.params, {});
});

Deno.test("router - extracts path params", () => {
  const router = new Router();
  router.get("/users/:id", (ctx) => ctx.respond.text(ctx.params.id));

  const result = router.match("GET", "http://localhost/users/123");
  assertNotEquals(result, null);
  assertEquals(result!.params.id, "123");
});

Deno.test("router - returns null for unmatched path", () => {
  const router = new Router();
  router.get("/hello", (ctx) => ctx.respond.text("hi"));

  const result = router.match("GET", "http://localhost/world");
  assertEquals(result, null);
});

Deno.test("router - returns null for wrong method", () => {
  const router = new Router();
  router.get("/hello", (ctx) => ctx.respond.text("hi"));

  const result = router.match("POST", "http://localhost/hello");
  assertEquals(result, null);
});

Deno.test("router - supports all HTTP methods", () => {
  const router = new Router();
  const handler: Handler = () => new Response("ok");

  router.get("/a", handler);
  router.post("/b", handler);
  router.put("/c", handler);
  router.patch("/d", handler);
  router.delete("/e", handler);

  assertNotEquals(router.match("GET", "http://localhost/a"), null);
  assertNotEquals(router.match("POST", "http://localhost/b"), null);
  assertNotEquals(router.match("PUT", "http://localhost/c"), null);
  assertNotEquals(router.match("PATCH", "http://localhost/d"), null);
  assertNotEquals(router.match("DELETE", "http://localhost/e"), null);
});

Deno.test("router - supports basePath", () => {
  const router = new Router("/api");
  router.get("/hello", () => new Response("hi"));

  const result = router.match("GET", "http://localhost/api/hello");
  assertNotEquals(result, null);
});

Deno.test("router - supports route-level middleware", () => {
  const router = new Router();
  const mw: Middleware = async (_ctx, next) => await next();

  router.get("/hello", mw, () => new Response("hi"));

  const result = router.match("GET", "http://localhost/hello");
  assertNotEquals(result, null);
  assertEquals(result!.route.middlewares.length, 1);
});

Deno.test("router - HEAD matches GET routes", () => {
  const router = new Router();
  router.get("/hello", () => new Response("hi"));

  const result = router.match("HEAD", "http://localhost/hello");
  assertNotEquals(result, null);
});

Deno.test("router - HEAD does not match POST routes", () => {
  const router = new Router();
  router.post("/hello", () => new Response("hi"));

  const result = router.match("HEAD", "http://localhost/hello");
  assertEquals(result, null);
});
