import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/hoge", async (c) => {
  return c.text("hoge!!");
});

// ELBのヘルスチェックで200を返す必要あり
app.get("/", async (c) => {
  return c.text("ok");
});

// ================================

serve(app);
