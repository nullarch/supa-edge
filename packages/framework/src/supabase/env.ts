/** Supabase environment variable bundle. */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Read Supabase environment variables with type-safe access.
 * Throws if required variables (SUPABASE_URL, SUPABASE_ANON_KEY) are missing.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) {
    throw new Error("Missing environment variable: SUPABASE_URL");
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!anonKey) {
    throw new Error("Missing environment variable: SUPABASE_ANON_KEY");
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  return { url, anonKey, serviceRoleKey };
}
