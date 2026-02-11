import {
  auth,
  cors,
  HttpError,
  logger,
  SupaEdgeApp,
  validator,
} from "@supa-edge/framework";
import type { InferValidated, ValidatorOptions } from "@supa-edge/framework";
import { z } from "zod";

const app = new SupaEdgeApp();

// Global middleware
app.use(cors());
app.use(logger());
app.use(auth());

// GET /todos - List all todos
app.get("/todos", async (ctx) => {
  const { data, error } = await ctx.supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw HttpError.internal(error.message);
  return ctx.respond.json(data);
});

// GET /todos/:id - Get a single todo
app.get("/todos/:id", async (ctx) => {
  const { data, error } = await ctx.supabase
    .from("todos")
    .select("*")
    .eq("id", ctx.params.id)
    .single();

  if (error) throw HttpError.notFound("Todo not found");
  return ctx.respond.json(data);
});

// POST /todos - Create a todo
const createOpts = {
  body: z.object({
    title: z.string().min(1).max(255),
    completed: z.boolean().optional().default(false),
  }),
} satisfies ValidatorOptions;

app.post(
  "/todos",
  validator(createOpts),
  async (ctx) => {
    const { title, completed } = ctx.validated.body as InferValidated<
      typeof createOpts
    >["body"];

    const { data, error } = await ctx.supabase
      .from("todos")
      .insert({ title, completed, user_id: ctx.user!.id })
      .select()
      .single();

    if (error) throw HttpError.internal(error.message);
    return ctx.respond.json(data, 201);
  },
);

// PATCH /todos/:id - Update a todo
const updateOpts = {
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    completed: z.boolean().optional(),
  }),
} satisfies ValidatorOptions;

app.patch(
  "/todos/:id",
  validator(updateOpts),
  async (ctx) => {
    const { data, error } = await ctx.supabase
      .from("todos")
      .update(ctx.validated.body)
      .eq("id", ctx.params.id)
      .select()
      .single();

    if (error) throw HttpError.notFound("Todo not found");
    return ctx.respond.json(data);
  },
);

// DELETE /todos/:id - Delete a todo
app.delete("/todos/:id", async (ctx) => {
  const { error } = await ctx.supabase
    .from("todos")
    .delete()
    .eq("id", ctx.params.id);

  if (error) throw HttpError.internal(error.message);
  return ctx.respond.empty();
});

app.serve();
