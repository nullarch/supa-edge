import type { ZodType } from "zod";
import type { Context } from "./types.ts";
import { HttpError } from "./errors.ts";

/** A type-safe RPC definition created by defineRpc(). */
export interface RpcDefinition<
  TParams extends ZodType,
  TReturns extends ZodType,
> {
  /** The RPC function name in Supabase. */
  readonly name: string;
  /** Zod schema for parameters. */
  readonly params: TParams;
  /** Zod schema for return type (used for type inference, not runtime validation). */
  readonly returns: TReturns;
  /** Call the RPC using ctx.supabase (user context). */
  call(
    ctx: Context,
    params: TParams["_output"],
  ): Promise<TReturns["_output"]>;
  /** Call the RPC using ctx.supabaseAdmin (service role). */
  callAdmin(
    ctx: Context,
    params: TParams["_output"],
  ): Promise<TReturns["_output"]>;
}

/** Options for defineRpc(). */
export interface RpcOptions<
  TParams extends ZodType,
  TReturns extends ZodType,
> {
  /** The RPC function name in Supabase. */
  name: string;
  /** Zod schema for validating parameters. */
  params: TParams;
  /** Zod schema for the return type (type inference only, no runtime validation). */
  returns: TReturns;
}

/**
 * Define a type-safe Supabase RPC caller.
 *
 * @example
 * ```ts
 * const getTotal = defineRpc({
 *   name: "get_total",
 *   params: z.object({ user_id: z.string().uuid() }),
 *   returns: z.number(),
 * });
 *
 * app.get("/total", async (ctx) => {
 *   const total = await getTotal.call(ctx, { user_id: ctx.user!.id });
 *   return ctx.respond.json({ total });
 * });
 * ```
 */
export function defineRpc<TParams extends ZodType, TReturns extends ZodType>(
  options: RpcOptions<TParams, TReturns>,
): RpcDefinition<TParams, TReturns> {
  const { name, params, returns } = options;

  async function execute(
    // deno-lint-ignore no-explicit-any
    client: any,
    rawParams: TParams["_output"],
  ): Promise<TReturns["_output"]> {
    const parsed = params.safeParse(rawParams);
    if (!parsed.success) {
      throw HttpError.badRequest("RPC parameter validation failed", {
        rpc: name,
        issues: parsed.error.issues,
      });
    }

    const { data, error } = await client.rpc(name, parsed.data);
    if (error) {
      throw HttpError.internal("RPC call failed", {
        rpc: name,
        message: error.message,
      });
    }

    return data as TReturns["_output"];
  }

  return {
    name,
    params,
    returns,
    call: (ctx, rawParams) => execute(ctx.supabase, rawParams),
    callAdmin: (ctx, rawParams) => execute(ctx.supabaseAdmin, rawParams),
  };
}
