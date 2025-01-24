import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import {
  messagingApi,
  Message as LineMessage,
  WebhookEvent,
  WebhookRequestBody,
} from "@line/bot-sdk";
import { ChatBedrockConverse } from "@langchain/aws";

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
  // ...と思ったけどreturnしないとレスポンスは返らないので、webhook的にはエラ-になってたくさんretryされていると思われる。
  // 解決するにはlambdaを分割するなどの対応が必要
  c.status(200);

  // 署名を検証する
  console.log({ body: c.env.event.body });
  const json: WebhookRequestBody = JSON.parse(c.env.event.body ?? "");
  // 複数のイベントがbatchでwebhookに送られてくることがあるよう
  await Promise.all(
    json.events.map((event) =>
      handleEvent(event).catch((e) => {
        // lineでエラーを検知したいのでreplyする
        console.error(e);
        if (event.type === "message") {
          client.replyMessage({
            replyToken: event.replyToken,
            messages: [{ type: "text", text: e.message }],
          });
        }
      })
    )
  );
});

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN!,
});

// 個々のイベント（メッセージ）をハンドルする
// このイベントのスキームはline側で定義されているはず
const handleEvent = async (event: WebhookEvent): Promise<void> => {
  console.log("start handleEvent");

  if (event.type !== "message" || event.message.type !== "text") {
    console.log("handleEvent early return");
    // テキストメッセージ以外はスルー
    return Promise.resolve(undefined);
  }

  const llm = new ChatBedrockConverse({
    model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  });

  const res = await llm.invoke(event.message.text);

  const message = {
    type: "text",
    text: res!.content.toString() ?? "",
  } satisfies LineMessage;

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [message],
  });
};

// ====================

export const handler = handle(app);
