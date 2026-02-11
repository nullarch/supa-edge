import { assertEquals } from "@std/assert";
import { SupaEdgeApp } from "../../src/app.ts";
import { logger } from "../../src/middleware/logger.ts";

Deno.test("logger - logs request and returns response", async () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    const app = new SupaEdgeApp();
    app.use(logger());
    app.get("/test", (ctx) => ctx.respond.text("ok"));

    const res = await app.handler(new Request("http://localhost/test"));

    assertEquals(res.status, 200);
    assertEquals(logs.length, 1);
    assertEquals(logs[0].includes("[supa-edge]"), true);
    assertEquals(logs[0].includes("GET"), true);
    assertEquals(logs[0].includes("/test"), true);
    assertEquals(logs[0].includes("200"), true);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("logger - logs ERR on error", async () => {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => errors.push(args.join(" "));

  // Also suppress the unhandled error log from app.handleError
  const originalLog = console.log;

  try {
    const app = new SupaEdgeApp();
    app.use(logger());
    app.get("/fail", () => {
      throw new Error("boom");
    });

    const res = await app.handler(new Request("http://localhost/fail"));
    // The error is caught by the app, so we still get a response
    assertEquals(res.status, 500);
    // Logger should have logged the ERR
    const hasErrLog = errors.some((e) => e.includes("ERR"));
    assertEquals(hasErrLog, true);
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
});
