import "source-map-support/register";
import { Env, Hono, MiddlewareHandler } from "hono";
import {
  ApiGatewayRequestContext,
  handle,
  LambdaContext,
  LambdaEvent,
} from "hono/aws-lambda";
// discordenoで代替できるかも。expressに対する不要な依存が発生しちゃう
import {
  // InteractionType,
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import {
  DiscordInteraction,
  InteractionResponseTypes,
  InteractionTypes,
} from "@discordeno/types";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
  requestContext: ApiGatewayRequestContext;
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
import { createRestManager } from "@discordeno/rest";

app.post("/interactions", async (c) => {
  console.log({ env: c.env });

  const interaction: DiscordInteraction = await c.req.json();

  const { type, id, data, token, channel_id: channelId } = interaction;
  console.log({ interaction });
  console.log({ data });

  if (type === InteractionTypes.Ping) {
    return c.json({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionTypes.ApplicationCommand) {
    if (data?.name === "ask") {
      const REST = createRestManager({ token: process.env.DISCORD_TOKEN! });

      const options = {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: { content: "ちょっとまっててね" },
      };
      const params = { withResponse: true };
      const res = await REST.sendInteractionResponse(
        id,
        token,
        options,
        params
      );

      if (res && "resource" in res) {
        console.log({ message: res.resource?.message });
      }

      if (!res) return;

      // ================================

      const command = new InvokeCommand({
        FunctionName: process.env.DOWNSTREAM_FUNCTION_NAME,
        Payload: JSON.stringify({
          channelId,
          messageId: res.resource?.message?.id,
        }),
        // Eventだと非同期実行、RequestErrorResponseだと同期実行
        // 同期実行だと、send()をawaitするとタイムアウトしちゃうし、awaitしないと呼び出しができてなさそう
        // 非同期でsend()をawaitすることで、queueに入るまで確実に待つつくりにしたつもり
        InvocationType: "Event",
      });
      const lambda = new Lambda();
      await lambda.send(command);
      return c.status(202);
    }

    console.error(`unknown command: ${name}`);
    return c.json({ error: "unknown command" }, 400);
  }

  console.error("unknown interaction type", type);
  return c.json({ error: "unknown interaction type" }, 400);
});

// ================================

export const handler = handle(app, 1);
