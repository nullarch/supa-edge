import { cors, SupaEdgeApp } from "@supa-edge/framework";

const app = new SupaEdgeApp();

app.use(cors());

app.get("/", (ctx) => {
  return ctx.respond.json({ message: "Hello from supa-edge!" });
});

app.get("/greet/:name", (ctx) => {
  return ctx.respond.json({ message: `Hello, ${ctx.params.name}!` });
});

app.serve();
