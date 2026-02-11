import { assertEquals, assertRejects } from "@std/assert";
import { compose } from "../src/compose.ts";
import { ContextImpl } from "../src/context.ts";
import type { Middleware } from "../src/types.ts";

function makeCtx(path = "/"): ContextImpl {
  return new ContextImpl(new Request(`http://localhost${path}`));
}

Deno.test("compose - executes middleware in onion order", async () => {
  const order: string[] = [];

  const mw1: Middleware = async (_ctx, next) => {
    order.push("mw1-before");
    const res = await next();
    order.push("mw1-after");
    return res;
  };

  const mw2: Middleware = async (_ctx, next) => {
    order.push("mw2-before");
    const res = await next();
    order.push("mw2-after");
    return res;
  };

  const composed = compose([mw1, mw2]);
  const ctx = makeCtx();

  await composed(ctx, () => {
    order.push("handler");
    return Promise.resolve(new Response("ok"));
  });

  assertEquals(order, [
    "mw1-before",
    "mw2-before",
    "handler",
    "mw2-after",
    "mw1-after",
  ]);
});

Deno.test("compose - throws on double next() call", async () => {
  const mw: Middleware = async (_ctx, next) => {
    await next();
    return await next(); // second call should throw
  };

  const composed = compose([mw]);
  const ctx = makeCtx();

  await assertRejects(
    async () => {
      await composed(ctx, () => Promise.resolve(new Response("ok")));
    },
    Error,
    "next() called multiple times",
  );
});

Deno.test("compose - propagates errors from middleware", async () => {
  const mw: Middleware = (_ctx, _next) => {
    throw new Error("test error");
  };

  const composed = compose([mw]);
  const ctx = makeCtx();

  await assertRejects(
    async () => {
      await composed(ctx, () => Promise.resolve(new Response("ok")));
    },
    Error,
    "test error",
  );
});

Deno.test("compose - empty middleware array calls next directly", async () => {
  const composed = compose([]);
  const ctx = makeCtx();

  const res = await composed(ctx, () => Promise.resolve(new Response("final")));
  assertEquals(await res.text(), "final");
});
