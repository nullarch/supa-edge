import { assertEquals } from "@std/assert";
import { createMockSupabase } from "../src/mock_supabase.ts";

Deno.test("MockSupabase - select returns configured data", async () => {
  const supabase = createMockSupabase()
    .onTable("todos", {
      select: {
        data: [{ id: 1, title: "Test" }],
        error: null,
      },
    })
    .build();

  const { data, error } = await supabase.from("todos").select("*");
  assertEquals(data, [{ id: 1, title: "Test" }]);
  assertEquals(error, null);
});

Deno.test("MockSupabase - insert returns configured data", async () => {
  const supabase = createMockSupabase()
    .onTable("todos", {
      insert: {
        data: { id: 2, title: "New" },
        error: null,
      },
    })
    .build();

  const { data, error } = await supabase
    .from("todos")
    .insert({ title: "New" });
  assertEquals(data, { id: 2, title: "New" });
  assertEquals(error, null);
});

Deno.test("MockSupabase - unconfigured table returns empty array", async () => {
  const supabase = createMockSupabase().build();

  const { data, error } = await supabase.from("unknown").select("*");
  assertEquals(data, []);
  assertEquals(error, null);
});

Deno.test("MockSupabase - chaining methods works", async () => {
  const supabase = createMockSupabase()
    .onTable("todos", {
      select: { data: [{ id: 1 }], error: null },
    })
    .build();

  const { data } = await supabase
    .from("todos")
    .select("*")
    .eq("id", 1)
    .order("id")
    .limit(1);
  assertEquals(data, [{ id: 1 }]);
});

Deno.test("MockSupabase - auth.getUser returns configured user", async () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    role: "authenticated",
    user_metadata: {},
  };

  const supabase = createMockSupabase()
    .onAuth(mockUser)
    .build();

  const { data, error } = await supabase.auth.getUser("token");
  assertEquals(data.user.id, "user-1");
  assertEquals(error, null);
});

Deno.test("MockSupabase - auth.getUser returns error", async () => {
  const supabase = createMockSupabase()
    .onAuth(null, { message: "Invalid token" })
    .build();

  const { data, error } = await supabase.auth.getUser("bad");
  assertEquals(data.user, null);
  assertEquals(error.message, "Invalid token");
});

Deno.test("MockSupabase - single() returns configured data", async () => {
  const supabase = createMockSupabase()
    .onTable("todos", {
      select: { data: { id: 1, title: "Single" }, error: null },
    })
    .build();

  const { data } = await supabase
    .from("todos")
    .select("*")
    .eq("id", 1)
    .single();
  assertEquals(data, { id: 1, title: "Single" });
});

Deno.test("MockSupabase - rpc returns configured data", async () => {
  const supabase = createMockSupabase()
    .onRpc("get_user_count", {
      data: { count: 42 },
      error: null,
    })
    .build();

  const { data, error } = await supabase.rpc("get_user_count");
  assertEquals(data, { count: 42 });
  assertEquals(error, null);
});

Deno.test("MockSupabase - rpc with chaining works", async () => {
  const supabase = createMockSupabase()
    .onRpc("search_todos", {
      data: [{ id: 1, title: "Match" }],
      error: null,
    })
    .build();

  const { data } = await supabase
    .rpc("search_todos", { query: "Match" })
    .limit(10);
  assertEquals(data, [{ id: 1, title: "Match" }]);
});

Deno.test("MockSupabase - unconfigured rpc returns empty array", async () => {
  const supabase = createMockSupabase().build();

  const { data, error } = await supabase.rpc("unknown_fn");
  assertEquals(data, []);
  assertEquals(error, null);
});

Deno.test("MockSupabase - upsert uses own config", async () => {
  const supabase = createMockSupabase()
    .onTable("todos", {
      insert: { data: { id: 1, title: "Inserted" }, error: null },
      upsert: { data: { id: 1, title: "Upserted" }, error: null },
    })
    .build();

  const { data: insertData } = await supabase
    .from("todos")
    .insert({ title: "Inserted" });
  assertEquals(insertData, { id: 1, title: "Inserted" });

  const { data: upsertData } = await supabase
    .from("todos")
    .upsert({ id: 1, title: "Upserted" });
  assertEquals(upsertData, { id: 1, title: "Upserted" });
});

Deno.test("MockSupabase - upsert falls back to insert config", async () => {
  const supabase = createMockSupabase()
    .onTable("todos", {
      insert: { data: { id: 1, title: "Fallback" }, error: null },
    })
    .build();

  const { data } = await supabase
    .from("todos")
    .upsert({ id: 1, title: "Fallback" });
  assertEquals(data, { id: 1, title: "Fallback" });
});
