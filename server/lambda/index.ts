import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { streamHandle } from "hono/aws-lambda";
import { stream, streamText, streamSSE } from "hono/streaming";
import { middleware, messagingApi } from "@line/bot-sdk";
import { env } from "hono/adapter";

type Bindings = {
  event: LambdaEvent;
  lambdaContext?: LambdaContext; // api gatewayをとおさず関数urlとかだとundefinedになるよう
};

// 型引数がcontext.envに追加される
const app = new Hono<{ Bindings: Bindings }>();

// ====================

app.get("/hono", (c) => c.text("Hello Hono!"));

app.get("/hoge", (c) =>
  c.json({
    greeting: "Hello Hoge!",
    isBase64Encoded: c.env.event.isBase64Encoded,
    awsRequestId: c.env.lambdaContext?.awsRequestId,
    requestContext: c.env.event.requestContext,
  })
);

// ====================

app.post("/webhook", async (c) => {
  console.log({ body: c.env.event.body });
  const json = JSON.parse(c.env.event.body ?? "");
  // 複数のイベントがbatchでwebhookに送られてくることがあるよう
  const result = await Promise.all((json as any).events.map(handleEvent));
  console.log({ result });
  return c.json(result);
});

// secretはどう使われている？
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
});

// 個々のイベント（メッセージ）をハンドルする
// このイベントのスキームはline側で定義されているはず
const handleEvent = (event: any) => {
  if (event.type !== "message" || event.message.type !== "text") {
    // テキストメッセージ以外はスルー
    return Promise.resolve(undefined);
  }

  const echo: any = { type: "text", text: event.message.text };

  //
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [echo],
  });
};

// ====================

export const handler = handle(app);
