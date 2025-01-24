import { Env, Hono, MiddlewareHandler } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";

type Bindings = {
  event: LambdaEvent;
  lambdaContext?: LambdaContext; // api gatewayをとおさず関数urlとかだとundefinedになるよう
};

// 型引数がcontext.envに追加される
const app = new Hono<{ Bindings: Bindings }>();

// https://blog.lacolaco.net/posts/discord-bot-cfworkers-hono/
// createMiddlewareをつかうのと、clone不要かも
const verifyKeyMiddleware =
  (): MiddlewareHandler<{ Bindings: Env }> => async (c, next) => {
    const signature = c.req.header("X-Signature-Ed25519");
    const timestamp = c.req.header("X-Signature-Timestamp");
    const body = await c.req.raw.clone().text();
    const isValidRequest =
      signature != undefined &&
      timestamp != undefined &&
      (await verifyKey(
        body,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY!
      ));
    if (!isValidRequest) {
      console.log("Invalid request signature");
      return c.text("Bad request signature", 401);
    }
    return await next();
  };

app.use(verifyKeyMiddleware());

import { InvokeCommand, Lambda } from "@aws-sdk/client-lambda";

app.post("/interactions", async (c) => {
  const reqBody = await c.req.json();

  console.log({ reqBody });

  const { type, id, data } = reqBody;

  console.log({ type });
  if (type === InteractionType.PING) {
    console.log("PING");
    return c.json({ type: InteractionResponseType.PONG });
  }

  console.log({ data });

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === "ask") {
      console.log("before invoke");
      const command = new InvokeCommand({
        FunctionName: process.env.DOWNSTREAM_FUNCTION_NAME,
        Payload: JSON.stringify({ foo: "bar" }),
        // Eventだと非同期実行、RequestErrorResponseだと同期実行
        // 同期実行だと、send()をawaitするとタイムアウトしちゃうし、awaitしないと呼び出しができてなさそう
        // 非同期でsend()をawaitすることで、queueに入るまで確実に待つつくりにしたつもり
        InvocationType: "Event",
      });
      const lambda = new Lambda();

      await lambda.send(command);

      return c.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "ちょっとまっててね" },
      });
    }

    console.error(`unknown command: ${name}`);
    return c.json({ error: "unknown command" }, 400);
  }

  console.error("unknown interaction type", type);
  return c.json({ error: "unknown interaction type" }, 400);
});

// ====================

export const handler = handle(app);
