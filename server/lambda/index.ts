import { Hono } from "hono";
import { handle, LambdaContext, LambdaEvent } from "hono/aws-lambda";

type Bindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

// 型引数がcontext.envに追加される
const app = new Hono<{ Bindings: Bindings }>();

app.get("/hono", (c) => c.text("Hello Hono!"));

app.get("/hoge", (c) =>
  c.json({
    greeting: "Hello Hoge!",
    isBase64Encoded: c.env.event.isBase64Encoded,
    awsRequestId: c.env.lambdaContext.awsRequestId,
    requestContext: c.env.event.requestContext,
  })
);

export const handler = handle(app);
