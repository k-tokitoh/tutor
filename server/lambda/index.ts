import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { streamHandle } from "hono/aws-lambda";
import { stream, streamText, streamSSE } from "hono/streaming";
import {
  middleware,
  messagingApi,
  Message as LineMessage,
} from "@line/bot-sdk";
import { env } from "hono/adapter";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelResponse,
  Message,
} from "@aws-sdk/client-bedrock-runtime";

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
  // replay完了まで待っているとタイムアウトしてしまう。webhook自体には200を即座に返す。
  c.status(200);

  // 署名を検証する
  console.log({ body: c.env.event.body });
  const json = JSON.parse(c.env.event.body ?? "");
  // 複数のイベントがbatchでwebhookに送られてくることがあるよう
  const result = await Promise.all(
    (json as any).events.map((e: any) => handleEvent(e))
  ).then((result) => {
    console.log({ result });
  });
});

// regionもハードコードはやめる
const clientBedrock = new BedrockRuntimeClient({ region: "us-east-1" });

// secretはどう使われている？
const config = {
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
});

// 個々のイベント（メッセージ）をハンドルする
// このイベントのスキームはline側で定義されているはず
const handleEvent = async (event: any): Promise<any> => {
  if (event.type !== "message" || event.message.type !== "text") {
    // テキストメッセージ以外はスルー
    return Promise.resolve(undefined);
  }

  const command = new InvokeModelCommand({
    // v2もある
    modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: event.message.text }],
        },
      ],
    }),
    accept: "application/json",
    contentType: "application/json",
  });
  console.log({ command });
  const responseBedrock = await clientBedrock.send(command);
  console.log({ responseBedrock });
  const jsonBedrock: Message = JSON.parse(
    Buffer.from(responseBedrock.body).toString("utf-8")
  );
  console.dir({ jsonBedrock }, { depth: null });

  const message = {
    type: "text",
    text: jsonBedrock.content?.[0].text ?? "",
  } satisfies LineMessage;

  console.log("about to reply.");
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [message],
  });
};

// ====================

export const handler = handle(app);
