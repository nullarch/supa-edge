import type { MockUser } from "./types.ts";

/**
 * Create Authorization headers with a Bearer token.
 * The token is a dummy JWT by default.
 */
export function authHeaders(
  token = "test-jwt-token",
): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Create a mock user object for testing.
 */
export function createMockUser(
  overrides: Partial<MockUser> = {},
): MockUser {
  return {
    id: overrides.id ?? "test-user-id",
    email: overrides.email ?? "test@example.com",
    role: overrides.role ?? "authenticated",
    user_metadata: overrides.user_metadata ?? {},
  };
}
