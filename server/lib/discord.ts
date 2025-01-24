import {
  Duration,
  Stack,
  StackProps,
  RemovalPolicy,
  CfnOutput,
} from "aws-cdk-lib";
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
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
} from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";

export class Discord extends Construct {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id);

    // 環境変数
    const discordPublicKey = StringParameter.fromStringParameterAttributes(
      this,
      "tutor-discord-public-key",
      { parameterName: "tutor-discord-public-key" }
    ).stringValue;

    const discordToken = StringParameter.fromStringParameterAttributes(
      this,
      "tutor-discord-token",
      { parameterName: "tutor-discord-token" }
    ).stringValue;

    const replyFn = new NodejsFunction(this, "tutor-discord-lambda-reply", {
      entry: "lambda/discord-reply.ts",
      handler: "handler", // entryファイルからexportされたhandler関数を指定
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30), // デフォルトは3秒
      bundling: {
        bundleAwsSDK: true,
      },
      // fn.addEnvironment() でも追加できるよう
      environment: {
        DISCORD_TOKEN: discordToken,
      },
    });

    // webhookで呼び出す関数
    const webhookFn = new NodejsFunction(this, "tutor-discord-lambda-webhook", {
      entry: "lambda/discord-webhook.ts",
      handler: "handler", // entryファイルからexportされたhandler関数を指定
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30), // デフォルトは3秒
      bundling: {
        bundleAwsSDK: true,
      },
      // fn.addEnvironment() でも追加できるよう
      environment: {
        DISCORD_PUBLIC_KEY: discordPublicKey,
        DOWNSTREAM_FUNCTION_NAME: replyFn.functionName,
      },
    });

    // webhookFnがreplyFnを呼び出せるように権限を設定
    replyFn.grantInvoke(webhookFn);

    // api gateway
    new LambdaRestApi(this, "tutor-discord-api", {
      handler: webhookFn,
    });
  }
}
