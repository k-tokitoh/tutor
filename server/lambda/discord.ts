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
import { ChatOpenAI } from "@langchain/openai";
import { type } from "os";

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

      await new Promise((resolve) => setTimeout(resolve, 20));

      // ================================

      const question = data.options?.find((opt) => opt.name === "question")
        ?.value as string;

      const messageId = res.resource?.message?.id;

      const threadPromise = await REST.startThreadWithMessage(
        channelId!,
        messageId!,
        {
          name: question,
          autoArchiveDuration: 10080,
        }
      );

      const model = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-3.5-turbo",
      });

      // const messages = [
      //   // new SystemMessage(""),
      //   ...(replies.messages ?? []).map((m) => new HumanMessage(m.text ?? "")),
      // ];

      const answerPromise = model.invoke(question);

      const [thread, answer] = await Promise.all([
        threadPromise,
        answerPromise,
      ]);

      REST.sendFollowupMessage;
      // threadはなんとchannelの一種
      await REST.sendMessage(thread.id, {
        content: answer.content.toString(),
      });

      c.status(202);
      return c.body(null);
    }

    console.error(`unknown command: ${name}`);
    return c.json({ error: "unknown command" }, 400);
  }

  console.error("unknown interaction type", type);
  return c.json({ error: "unknown interaction type" }, 400);
});

// ================================

export const handler = handle(app, 1);
