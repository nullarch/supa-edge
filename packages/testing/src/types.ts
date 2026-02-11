/** Options for creating test requests. */
export interface TestRequestOptions {
  /** Request headers. */
  headers?: Record<string, string>;
  /** JSON body (automatically serialized). */
  // deno-lint-ignore no-explicit-any
  body?: any;
  /** URL search params. */
  params?: Record<string, string>;
}

/** A mock user for testing. */
export interface MockUser {
  id: string;
  email?: string;
  role?: string;
  // deno-lint-ignore no-explicit-any
  user_metadata?: Record<string, any>;
}

/** Configuration for a mocked table query result. */
export interface MockQueryResult {
  // deno-lint-ignore no-explicit-any
  data?: any;
  // deno-lint-ignore no-explicit-any
  error?: any;
  count?: number | null;
}

/** Configuration for mocked table operations (select, insert, etc.). */
export interface MockTableConfig {
  select?: MockQueryResult;
  insert?: MockQueryResult;
  update?: MockQueryResult;
  delete?: MockQueryResult;
  upsert?: MockQueryResult;
}

/** Configuration for a mocked RPC result. */
export interface MockRpcConfig {
  /** The result returned when this function is called. */
  result: MockQueryResult;
}
