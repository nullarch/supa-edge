import { assertEquals } from "@std/assert";
import {
  auth,
  cors,
  HttpError,
  SupaEdgeApp,
  validator,
} from "@supa-edge/framework";
import type { Middleware } from "@supa-edge/framework";
import {
  authHeaders,
  createMockSupabase,
  createMockUser,
  mockEnv,
  TestHandler,
} from "@supa-edge/testing";
import { z } from "zod";

// Build a test version of the app with mock supabase
function createTestApp() {
  const mockUser = createMockUser();

  const mockSupabase = createMockSupabase()
    .onAuth(mockUser)
    .onTable("todos", {
      select: {
        data: [
          { id: 1, title: "Buy groceries", completed: false },
          { id: 2, title: "Clean house", completed: true },
        ],
        error: null,
      },
      insert: {
        data: { id: 3, title: "New todo", completed: false },
        error: null,
      },
      update: {
        data: { id: 1, title: "Updated", completed: true },
        error: null,
      },
      delete: { data: null, error: null },
    })
    .build();

  // Middleware that injects the mock supabase
  const mockSupabaseMw: Middleware = async (ctx, next) => {
    Object.defineProperty(ctx, "supabase", {
      value: mockSupabase,
      writable: false,
      configurable: true,
    });
    return await next();
  };

  const app = new SupaEdgeApp();
  app.use(cors());
  app.use(mockSupabaseMw);
  app.use(auth());

  const createSchema = z.object({
    title: z.string().min(1).max(255),
    completed: z.boolean().optional().default(false),
  });

  app.get("/todos", async (ctx) => {
    const { data, error } = await ctx.supabase
      .from("todos")
      .select("*");
    if (error) throw HttpError.internal(error.message);
    return ctx.respond.json(data);
  });

  app.post(
    "/todos",
    validator({ body: createSchema }),
    async (ctx) => {
      const { title, completed } = ctx.validated.body;
      const { data, error } = await ctx.supabase
        .from("todos")
        .insert({ title, completed, user_id: ctx.user!.id });
      if (error) throw HttpError.internal(error.message);
      return ctx.respond.json(data, 201);
    },
  );

  app.delete("/todos/:id", async (ctx) => {
    const { error } = await ctx.supabase
      .from("todos")
      .delete()
      .eq("id", ctx.params.id);
    if (error) throw HttpError.internal(error.message);
    return ctx.respond.empty();
  });

  return new TestHandler(app.handler);
}

let cleanup: () => void;
let t: TestHandler;

function setup() {
  cleanup = mockEnv();
  t = createTestApp();
}

function teardown() {
  cleanup();
}

Deno.test("todos - GET /todos returns list", async () => {
  setup();
  try {
    const res = await t.get("/todos", { headers: authHeaders() });
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.length, 2);
    assertEquals(body[0].title, "Buy groceries");
  } finally {
    teardown();
  }
});

Deno.test("todos - GET /todos requires auth", async () => {
  setup();
  try {
    const res = await t.get("/todos");
    assertEquals(res.status, 401);
  } finally {
    teardown();
  }
});

Deno.test("todos - POST /todos creates a todo", async () => {
  setup();
  try {
    const res = await t.post("/todos", {
      headers: authHeaders(),
      body: { title: "New todo" },
    });
    assertEquals(res.status, 201);

    const body = await res.json();
    assertEquals(body.title, "New todo");
  } finally {
    teardown();
  }
});

Deno.test("todos - POST /todos validates body", async () => {
  setup();
  try {
    const res = await t.post("/todos", {
      headers: authHeaders(),
      body: { title: "" }, // min length 1
    });
    assertEquals(res.status, 400);
  } finally {
    teardown();
  }
});

Deno.test("todos - DELETE /todos/:id returns 204", async () => {
  setup();
  try {
    const res = await t.delete("/todos/1", { headers: authHeaders() });
    assertEquals(res.status, 204);
  } finally {
    teardown();
  }
});

Deno.test("todos - OPTIONS returns CORS preflight", async () => {
  setup();
  try {
    const res = await t.options("/todos");
    assertEquals(res.status, 204);
    assertEquals(
      res.headers.get("Access-Control-Allow-Origin"),
      "*",
    );
  } finally {
    teardown();
  }
});
