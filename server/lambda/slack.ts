import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { ChatBedrockConverse } from "@langchain/aws";
import { text } from "stream/consumers";
import { WebClient } from "@slack/web-api";

const web = new WebClient(process.env.SLACK_TOKEN);

type Bindings = {
  event: LambdaEvent;
  lambdaContext?: LambdaContext; // api gatewayをとおさず関数urlとかだとundefinedになるよう
};

// 型引数がcontext.envに追加される
const app = new Hono<{ Bindings: Bindings }>();

app.post("/webhook", async (c) => {
  const req = await c.req.json();

  if (req.type === "url_verification") {
    return c.text(req.challenge);
  }

  // lambdaで直ちにレスポンスしても、たぶんcold startのせいで3秒ルールに引っかかってリトライされてしまうので、雑に回避
  if (c.req.header("X-Slack-Retry-Num") !== undefined) return;

  await web.chat.postMessage({
    channel: "#知恵",
    text: `using sdk.`,
  });

  return;
});

// ====================

export const handler = handle(app);
