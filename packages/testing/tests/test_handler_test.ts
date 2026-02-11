import { assertEquals } from "@std/assert";
import { TestHandler } from "../src/test_handler.ts";

const echoHandler = (request: Request): Response => {
  const url = new URL(request.url);
  return new Response(
    JSON.stringify({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      hasAuth: request.headers.has("Authorization"),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};

Deno.test("TestHandler - GET request", async () => {
  const t = new TestHandler(echoHandler);
  const res = await t.get("/test");
  const body = await res.json();

  assertEquals(body.method, "GET");
  assertEquals(body.path, "/test");
});

Deno.test("TestHandler - POST with body", async () => {
  const handler = async (request: Request): Promise<Response> => {
    const body = await request.json();
    return new Response(JSON.stringify({ received: body }), {
      headers: { "Content-Type": "application/json" },
    });
  };

  const t = new TestHandler(handler);
  const res = await t.post("/items", { body: { name: "test" } });
  const data = await res.json();

  assertEquals(data.received.name, "test");
});

Deno.test("TestHandler - query params", async () => {
  const t = new TestHandler(echoHandler);
  const res = await t.get("/search", { params: { q: "hello", page: "1" } });
  const body = await res.json();

  assertEquals(body.query.q, "hello");
  assertEquals(body.query.page, "1");
});

Deno.test("TestHandler - custom headers", async () => {
  const t = new TestHandler(echoHandler);
  const res = await t.get("/test", {
    headers: { Authorization: "Bearer token" },
  });
  const body = await res.json();

  assertEquals(body.hasAuth, true);
});

Deno.test("TestHandler - all HTTP methods", async () => {
  const t = new TestHandler(echoHandler);

  for (const method of ["get", "post", "put", "patch", "delete"] as const) {
    const res = await t[method]("/test");
    const body = await res.json();
    assertEquals(body.method, method.toUpperCase());
  }
});

Deno.test("TestHandler - OPTIONS request", async () => {
  const t = new TestHandler(echoHandler);
  const res = await t.options("/test");
  const body = await res.json();

  assertEquals(body.method, "OPTIONS");
});
