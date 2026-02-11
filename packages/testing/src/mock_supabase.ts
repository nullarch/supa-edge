import type { MockQueryResult, MockRpcConfig, MockTableConfig } from "./types.ts";

/**
 * A builder-pattern mock for Supabase client.
 * Allows setting per-table responses for select/insert/update/delete/upsert
 * and per-function responses for rpc().
 */
export class MockSupabaseBuilder {
  private tables: Map<string, MockTableConfig> = new Map();
  private rpcs: Map<string, MockRpcConfig> = new Map();
  // deno-lint-ignore no-explicit-any
  private authUser: any = null;
  // deno-lint-ignore no-explicit-any
  private authError: any = null;

  /** Configure mock results for a table. */
  onTable(name: string, config: MockTableConfig): this {
    this.tables.set(name, config);
    return this;
  }

  /** Configure mock result for an rpc() function call. */
  onRpc(name: string, result: MockQueryResult): this {
    this.rpcs.set(name, { result });
    return this;
  }

  /** Configure the auth.getUser() response. */
  // deno-lint-ignore no-explicit-any
  onAuth(user: any, error?: any): this {
    this.authUser = user;
    this.authError = error ?? null;
    return this;
  }

  /** Build the mock Supabase client. */
  // deno-lint-ignore no-explicit-any
  build(): any {
    const tables = this.tables;
    const rpcs = this.rpcs;
    const authUser = this.authUser;
    const authError = this.authError;

    // deno-lint-ignore no-explicit-any
    function createChain(result: MockQueryResult): any {
      const chain = {
        select: () => chain,
        single: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        eq: () => chain,
        neq: () => chain,
        gt: () => chain,
        lt: () => chain,
        gte: () => chain,
        lte: () => chain,
        like: () => chain,
        ilike: () => chain,
        is: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        range: () => chain,
        match: () => chain,
        filter: () => chain,
        or: () => chain,
        not: () => chain,
        then: (
          resolve: (v: MockQueryResult) => void,
          reject?: (e: unknown) => void,
        ) => {
          if (result.error && reject) return reject(result.error);
          return resolve(result);
        },
      };
      return chain;
    }

    const defaultResult: MockQueryResult = { data: [], error: null };

    return {
      from: (table: string) => {
        const config = tables.get(table) ?? {};
        return {
          select: (..._args: unknown[]) =>
            createChain(config.select ?? defaultResult),
          insert: (_data: unknown) =>
            createChain(config.insert ?? defaultResult),
          update: (_data: unknown) =>
            createChain(config.update ?? defaultResult),
          upsert: (_data: unknown) =>
            createChain(config.upsert ?? config.insert ?? defaultResult),
          delete: () => createChain(config.delete ?? defaultResult),
        };
      },
      rpc: (name: string, _params?: unknown) => {
        const rpcConfig = rpcs.get(name);
        return createChain(rpcConfig?.result ?? defaultResult);
      },
      auth: {
        getUser: (_token?: string) => {
          return Promise.resolve({
            data: { user: authUser },
            error: authError,
          });
        },
      },
    };
  }
}

/**
 * Create a mock Supabase client with builder pattern.
 *
 * @example
 * ```ts
 * const supabase = createMockSupabase()
 *   .onTable("todos", {
 *     select: { data: [{ id: 1, title: "Test" }], error: null }
 *   })
 *   .build();
 * ```
 */
export function createMockSupabase(): MockSupabaseBuilder {
  return new MockSupabaseBuilder();
}
