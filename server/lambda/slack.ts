import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { ChatBedrockConverse } from "@langchain/aws";
import { WebClient } from "@slack/web-api";
import type { AppMentionEvent } from "@slack/types";

const web = new WebClient(process.env.SLACK_TOKEN);

type Bindings = {
  event: LambdaEvent;
  lambdaContext?: LambdaContext; // api gatewayをとおさず関数urlとかだとundefinedになるよう
};

// 型引数がcontext.envに追加される
const app = new Hono<{ Bindings: Bindings }>();

app.post("/webhook", async (c) => {
  // todo: sdkが型を提供している気がする。@slack/webhookかな
  const reqBody = await c.req.json();
  const event: AppMentionEvent = reqBody.event;

  // console.log({ req }, { depth: null });

  if (reqBody.type === "url_verification") {
    return c.text(reqBody.challenge);
  }

  // lambdaで直ちにレスポンスしても、たぶんcold startのせいで3秒ルールに引っかかってリトライされてしまうので、雑に回避
  if (c.req.header("X-Slack-Retry-Num") !== undefined) return;

  const llm = new ChatBedrockConverse({
    model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  });

  const res = await llm.invoke(event.text);

  await web.chat.postMessage({
    channel: event.channel,
    text: res.content.toString(),
    thread_ts: event.ts,
  });

  return;
});

// ====================

export const handler = handle(app);
