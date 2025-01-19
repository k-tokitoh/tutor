import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Runtime,
  FunctionUrlAuthType,
  DockerImageFunction,
  DockerImageCode,
} from "aws-cdk-lib/aws-lambda";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";

export class TutorStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // 環境変数
    const channelAccessToken = StringParameter.fromStringParameterAttributes(
      this,
      "tutor-channel-access-token",
      { parameterName: "tutor-channel-access-token" }
    ).stringValue;

    const channelSecret = StringParameter.fromStringParameterAttributes(
      this,
      "tutor-channel-secret",
      { parameterName: "tutor-channel-secret" }
    ).stringValue;

    // lambda関数
    const fn = new NodejsFunction(this, "lambda", {
      entry: "lambda/index.ts",
      handler: "handler", // entryファイルからexportされたhandler関数を指定
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30), // デフォルトは3秒
      bundling: {
        bundleAwsSDK: true,
      },
      // fn.addEnvironment() でも追加できるよう
      environment: {
        CHANNEL_ACCESS_TOKEN: channelAccessToken,
        CHANNEL_SECRET: channelSecret,
      },
    });

    const policyBedrock = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["bedrock:InvokeModel"],
      resources: ["*"], // リソースを限定したい
    });
    fn.addToRolePolicy(policyBedrock);

    // api gateway経由で呼び出すだけなら、関数URLは不要
    // fn.addFunctionUrl({
    //   // NONE: Lambda は、関数 URL へのリクエストに対して IAM 認証を実行しません。関数に独自の認可ロジックを実装しない限り、URL エンドポイントはパブリックになります。
    //   // AWS_IAM: 認証された IAM ユーザーとロールのみが、関数 URL にリクエストを行うことができます。
    //   authType: FunctionUrlAuthType.NONE,
    // });

    // api gateway
    new LambdaRestApi(this, "myapi", {
      handler: fn,
    });
  }
}
