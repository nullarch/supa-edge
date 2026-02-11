import { assertEquals } from "@std/assert";
import { SupaEdgeApp } from "../../src/app.ts";
import { rateLimit } from "../../src/middleware/rate_limit.ts";

Deno.test("rateLimit - allows requests under limit", async () => {
  const app = new SupaEdgeApp();
  app.use(rateLimit({ max: 5, windowMs: 60_000 }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { "x-forwarded-for": "test-ip-1" },
    }),
  );

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("X-RateLimit-Limit"), "5");
  assertEquals(res.headers.get("X-RateLimit-Remaining"), "4");
});

Deno.test("rateLimit - blocks requests over limit", async () => {
  const app = new SupaEdgeApp();
  app.use(rateLimit({ max: 2, windowMs: 60_000 }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const makeReq = () =>
    app.handler(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "test-ip-2" },
      }),
    );

  // First two should pass
  const r1 = await makeReq();
  assertEquals(r1.status, 200);
  const r2 = await makeReq();
  assertEquals(r2.status, 200);

  // Third should be rate limited
  const r3 = await makeReq();
  assertEquals(r3.status, 429);
});

Deno.test("rateLimit - custom key function", async () => {
  const app = new SupaEdgeApp();
  app.use(
    rateLimit({
      max: 1,
      windowMs: 60_000,
      keyFn: (ctx) => ctx.request.headers.get("X-API-Key") ?? "anon",
    }),
  );
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  // First request with key-A passes
  const r1 = await app.handler(
    new Request("http://localhost/test", {
      headers: { "X-API-Key": "key-A" },
    }),
  );
  assertEquals(r1.status, 200);

  // First request with key-B also passes (different key)
  const r2 = await app.handler(
    new Request("http://localhost/test", {
      headers: { "X-API-Key": "key-B" },
    }),
  );
  assertEquals(r2.status, 200);

  // Second request with key-A is rate limited
  const r3 = await app.handler(
    new Request("http://localhost/test", {
      headers: { "X-API-Key": "key-A" },
    }),
  );
  assertEquals(r3.status, 429);
});
