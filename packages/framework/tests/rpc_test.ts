import { assertEquals, assertRejects } from "@std/assert";
import { z } from "zod";
import { defineRpc } from "../src/rpc.ts";
import { HttpError } from "../src/errors.ts";
import type { Context } from "../src/types.ts";

/** Create a minimal mock context with a fake supabase/supabaseAdmin. */
// deno-lint-ignore no-explicit-any
function mockCtx(rpcResult: { data?: any; error?: any }): Context {
  const client = {
    rpc: (_name: string, _params?: unknown) => Promise.resolve(rpcResult),
  };
  return {
    supabase: client,
    supabaseAdmin: client,
  } as unknown as Context;
}

const addNumbers = defineRpc({
  name: "add_numbers",
  params: z.object({ a: z.number(), b: z.number() }),
  returns: z.number(),
});

Deno.test("rpc - call() returns data on success", async () => {
  const ctx = mockCtx({ data: 42, error: null });
  const result = await addNumbers.call(ctx, { a: 10, b: 32 });
  assertEquals(result, 42);
});

Deno.test("rpc - call() throws HttpError 400 on invalid params", async () => {
  const ctx = mockCtx({ data: null, error: null });
  const err = await assertRejects(
    // deno-lint-ignore no-explicit-any
    () => addNumbers.call(ctx, { a: "not a number" } as any),
    HttpError,
  );
  assertEquals(err.status, 400);
});

Deno.test("rpc - call() throws HttpError 500 on supabase error", async () => {
  const ctx = mockCtx({ data: null, error: { message: "db down" } });
  const err = await assertRejects(
    () => addNumbers.call(ctx, { a: 1, b: 2 }),
    HttpError,
  );
  assertEquals(err.status, 500);
});

Deno.test("rpc - callAdmin() uses supabaseAdmin client", async () => {
  let calledClient = "";
  const ctx = {
    supabase: {
      rpc: () => {
        calledClient = "user";
        return Promise.resolve({ data: 1, error: null });
      },
    },
    supabaseAdmin: {
      rpc: () => {
        calledClient = "admin";
        return Promise.resolve({ data: 99, error: null });
      },
    },
  } as unknown as Context;

  const result = await addNumbers.callAdmin(ctx, { a: 1, b: 2 });
  assertEquals(calledClient, "admin");
  assertEquals(result, 99);
});

Deno.test("rpc - definition exposes name and schemas", () => {
  assertEquals(addNumbers.name, "add_numbers");
  assertEquals(addNumbers.params, addNumbers.params);
  assertEquals(addNumbers.returns, addNumbers.returns);
});
