import { assertEquals, assertExists } from "@std/assert";
import { ContextImpl } from "../src/context.ts";

Deno.test("context - basic properties", () => {
  const req = new Request("http://localhost/test?q=1", {
    method: "POST",
  });
  const ctx = new ContextImpl(req);

  assertEquals(ctx.method, "POST");
  assertEquals(ctx.url.pathname, "/test");
  assertEquals(ctx.url.searchParams.get("q"), "1");
  assertExists(ctx.responseHeaders);
  assertEquals(ctx.state, {});
  assertEquals(ctx.validated, {});
});

Deno.test("context - respond.json()", () => {
  const ctx = new ContextImpl(new Request("http://localhost/"));

  const res = ctx.respond.json({ hello: "world" });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "application/json");
});

Deno.test("context - respond.json() with custom status", () => {
  const ctx = new ContextImpl(new Request("http://localhost/"));

  const res = ctx.respond.json({ created: true }, 201);
  assertEquals(res.status, 201);
});

Deno.test("context - respond.text()", () => {
  const ctx = new ContextImpl(new Request("http://localhost/"));

  const res = ctx.respond.text("hello");
  assertEquals(res.status, 200);
  assertEquals(
    res.headers.get("Content-Type"),
    "text/plain; charset=utf-8",
  );
});

Deno.test("context - respond.empty()", () => {
  const ctx = new ContextImpl(new Request("http://localhost/"));

  const res = ctx.respond.empty();
  assertEquals(res.status, 204);
});

Deno.test("context - respond.redirect()", () => {
  const ctx = new ContextImpl(new Request("http://localhost/"));

  const res = ctx.respond.redirect("/new-path");
  assertEquals(res.status, 302);
  assertEquals(res.headers.get("Location"), "/new-path");
});

Deno.test("context - responseHeaders are merged into responses", () => {
  const ctx = new ContextImpl(new Request("http://localhost/"));
  ctx.responseHeaders.set("X-Custom", "test");

  const res = ctx.respond.json({ ok: true });
  assertEquals(res.headers.get("X-Custom"), "test");
});

Deno.test("context - json() body caching", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "test" }),
  });
  const ctx = new ContextImpl(req);

  const body1 = await ctx.json();
  const body2 = await ctx.json();
  assertEquals(body1, { name: "test" });
  assertEquals(body2, { name: "test" });
});

Deno.test("context - text() body caching", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    body: "hello text",
  });
  const ctx = new ContextImpl(req);

  const text1 = await ctx.text();
  const text2 = await ctx.text();
  assertEquals(text1, "hello text");
  assertEquals(text2, "hello text");
});
