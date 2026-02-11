import { assertEquals } from "@std/assert";
import { mockEnv } from "../src/mock_env.ts";

Deno.test("mockEnv - sets default Supabase env vars", () => {
  const cleanup = mockEnv();
  try {
    assertEquals(Deno.env.get("SUPABASE_URL"), "http://localhost:54321");
    assertEquals(Deno.env.get("SUPABASE_ANON_KEY"), "test-anon-key");
    assertEquals(
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      "test-service-role-key",
    );
  } finally {
    cleanup();
  }
});

Deno.test("mockEnv - applies custom overrides", () => {
  const cleanup = mockEnv({
    SUPABASE_URL: "https://custom.supabase.co",
    MY_VAR: "custom-value",
  });
  try {
    assertEquals(Deno.env.get("SUPABASE_URL"), "https://custom.supabase.co");
    assertEquals(Deno.env.get("MY_VAR"), "custom-value");
    // Defaults still applied for non-overridden
    assertEquals(Deno.env.get("SUPABASE_ANON_KEY"), "test-anon-key");
  } finally {
    cleanup();
  }
});

Deno.test("mockEnv - cleanup restores original values", () => {
  const originalUrl = Deno.env.get("SUPABASE_URL");

  const cleanup = mockEnv();
  assertEquals(Deno.env.get("SUPABASE_URL"), "http://localhost:54321");

  cleanup();

  assertEquals(Deno.env.get("SUPABASE_URL"), originalUrl);
});

Deno.test("mockEnv - cleanup removes vars that did not exist", () => {
  const uniqueKey = `TEST_VAR_${Date.now()}`;
  assertEquals(Deno.env.get(uniqueKey), undefined);

  const cleanup = mockEnv({ [uniqueKey]: "temp" });
  assertEquals(Deno.env.get(uniqueKey), "temp");

  cleanup();
  assertEquals(Deno.env.get(uniqueKey), undefined);
});
