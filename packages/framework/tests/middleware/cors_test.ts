import { assertEquals } from "@std/assert";
import { SupaEdgeApp } from "../../src/app.ts";
import { cors } from "../../src/middleware/cors.ts";

Deno.test("cors - OPTIONS preflight returns 204", async () => {
  const app = new SupaEdgeApp();
  app.use(cors());
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", { method: "OPTIONS" }),
  );

  assertEquals(res.status, 204);
  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "*",
  );
  assertEquals(
    res.headers.get("Access-Control-Allow-Methods")?.includes("GET"),
    true,
  );
});

Deno.test("cors - sets CORS headers on normal responses", async () => {
  const app = new SupaEdgeApp();
  app.use(cors());
  app.get("/test", (ctx) => ctx.respond.json({ ok: true }));

  const res = await app.handler(new Request("http://localhost/test"));

  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  assertEquals(res.status, 200);
});

Deno.test("cors - respects string origin", async () => {
  const app = new SupaEdgeApp();
  app.use(cors({ origin: "https://example.com" }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(new Request("http://localhost/test"));

  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://example.com",
  );
});

Deno.test("cors - array origin matches request origin", async () => {
  const app = new SupaEdgeApp();
  app.use(
    cors({ origin: ["https://a.com", "https://b.com"] }),
  );
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Origin: "https://b.com" },
    }),
  );

  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://b.com",
  );
});

Deno.test("cors - array origin rejects unmatched origin", async () => {
  const app = new SupaEdgeApp();
  app.use(cors({ origin: ["https://a.com"] }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Origin: "https://evil.com" },
    }),
  );

  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    null,
  );
});

Deno.test("cors - function origin", async () => {
  const app = new SupaEdgeApp();
  app.use(
    cors({ origin: (o) => o.endsWith(".example.com") }),
  );
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Origin: "https://app.example.com" },
    }),
  );

  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://app.example.com",
  );
});

Deno.test("cors - credentials option", async () => {
  const app = new SupaEdgeApp();
  app.use(cors({ credentials: true }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(new Request("http://localhost/test"));

  assertEquals(
    res.headers.get("Access-Control-Allow-Credentials"),
    "true",
  );
});

Deno.test("cors - credentials with wildcard reflects request origin", async () => {
  const app = new SupaEdgeApp();
  app.use(cors({ credentials: true }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  const res = await app.handler(
    new Request("http://localhost/test", {
      headers: { Origin: "https://myapp.com" },
    }),
  );

  // Should reflect the request origin, not "*"
  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://myapp.com",
  );
  assertEquals(
    res.headers.get("Access-Control-Allow-Credentials"),
    "true",
  );
  assertEquals(
    res.headers.get("Vary")?.includes("Origin"),
    true,
  );
});

Deno.test("cors - credentials without Origin header falls back to wildcard", async () => {
  const app = new SupaEdgeApp();
  app.use(cors({ credentials: true }));
  app.get("/test", (ctx) => ctx.respond.text("ok"));

  // No Origin header (e.g. same-origin or non-browser request)
  const res = await app.handler(new Request("http://localhost/test"));

  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "*",
  );
});
