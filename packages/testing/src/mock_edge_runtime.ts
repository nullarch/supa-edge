// deno-lint-ignore no-explicit-any
declare const globalThis: any;

/**
 * Mock EdgeRuntime.waitUntil for testing.
 * Returns an object with the captured promises and a cleanup function.
 */
export function mockEdgeRuntime(): {
  /** All promises passed to waitUntil(). */
  promises: Promise<unknown>[];
  /** Wait for all captured promises to settle. */
  flush(): Promise<void>;
  /** Remove the mock EdgeRuntime from globalThis. */
  cleanup(): void;
} {
  const promises: Promise<unknown>[] = [];
  const hadEdgeRuntime = "EdgeRuntime" in globalThis;
  const originalEdgeRuntime = globalThis.EdgeRuntime;

  globalThis.EdgeRuntime = {
    waitUntil(promise: Promise<unknown>) {
      promises.push(promise);
    },
  };

  return {
    promises,
    async flush() {
      await Promise.allSettled(promises);
    },
    cleanup() {
      if (hadEdgeRuntime) {
        globalThis.EdgeRuntime = originalEdgeRuntime;
      } else {
        delete globalThis.EdgeRuntime;
      }
    },
  };
}
