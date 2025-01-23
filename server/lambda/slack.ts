import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { WebClient } from "@slack/web-api";
import type { AppMentionEvent } from "@slack/types";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const web = new WebClient(process.env.SLACK_TOKEN);

type Bindings = {
  event: LambdaEvent;
  lambdaContext?: LambdaContext; // api gatewayをとおさず関数urlとかだとundefinedになるよう
};

// 型引数がcontext.envに追加される
const app = new Hono<{ Bindings: Bindings }>();

app.post("/webhook", async (c) => {
  const reqBody = await c.req.json();
  const event: AppMentionEvent = reqBody.event;

  if (reqBody.type === "url_verification") {
    return c.text(reqBody.challenge);
  }

  // lambdaで直ちにレスポンスしても、たぶんcold startのせいで3秒ルールに引っかかってリトライされてしまうので、雑に回避
  if (c.req.header("X-Slack-Retry-Num") !== undefined) return;

  const replies = await web.conversations.replies({
    channel: event.channel,
    // スレッド全体を取得するには以下を指定する必要あり
    // - スレッド内2つめ以降のメッセージの場合
    //   - event.thread_ts を利用する
    // - スレッドの最初のメッセージの場合
    //   - event.ts を利用する（thread_tsはundefined）
    ts: event.thread_ts ?? event.ts,
    limit: 10,
  });

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-3.5-turbo",
  });

  const messages = [
    // new SystemMessage(""),
    ...(replies.messages ?? []).map((m) => new HumanMessage(m.text ?? "")),
  ];

  const res = await model.invoke(messages);

  await web.chat.postMessage({
    channel: event.channel,
    text: res.content.toString(),
    thread_ts: event.ts,
  });

  return;
});

// ====================

export const handler = handle(app);
