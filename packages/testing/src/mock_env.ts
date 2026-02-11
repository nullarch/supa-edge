/**
 * Stub Deno.env with Supabase defaults and optional custom overrides.
 * Returns a cleanup function that restores original values.
 */
export function mockEnv(
  overrides: Record<string, string> = {},
): () => void {
  const defaults: Record<string, string> = {
    SUPABASE_URL: "http://localhost:54321",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  };

  const merged = { ...defaults, ...overrides };
  const originals = new Map<string, string | undefined>();

  // Save originals and set new values
  for (const [key, value] of Object.entries(merged)) {
    originals.set(key, Deno.env.get(key));
    Deno.env.set(key, value);
  }

  // Return cleanup function
  return () => {
    for (const [key, original] of originals) {
      if (original === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, original);
      }
    }
  };
}
