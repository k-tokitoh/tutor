import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import {
  middleware,
  messagingApi,
  Message as LineMessage,
  WebhookEvent,
  WebhookRequestBody,
} from "@line/bot-sdk";
import { env } from "hono/adapter";
import {
  BedrockRuntimeClient,
  ConverseCommand,
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
  const json: WebhookRequestBody = JSON.parse(c.env.event.body ?? "");
  // 複数のイベントがbatchでwebhookに送られてくることがあるよう
  await Promise.all(
    json.events.map((event) => {
      handleEvent(event).catch((e) => {
        console.error(e);
        if (event.type === "message") {
          client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: e.message }],
          });
        }
      });
    })
  );
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
const handleEvent = async (event: WebhookEvent): Promise<void> => {
  if (event.type !== "message" || event.message.type !== "text") {
    // テキストメッセージ以外はスルー
    return Promise.resolve(undefined);
  }

  const command = new ConverseCommand({
    modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0", // v2もある
    messages: [
      {
        role: "user",
        content: [{ text: event.message.text }],
      },
    ],
    inferenceConfig: { maxTokens: 512 },
  });
  const res = await clientBedrock.send(command);
  console.log({ res });

  const message = {
    type: "text",
    text: res.output?.message?.content?.[0].text ?? "",
  } satisfies LineMessage;

  client.replyMessage({
    replyToken: event.replyToken,
    messages: [message],
  });
};

// ====================

export const handler = handle(app);
