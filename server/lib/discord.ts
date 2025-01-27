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

    const openAIApiKey = StringParameter.fromStringParameterAttributes(
      this,
      "tutor-openai-api-key",
      { parameterName: "tutor-openai-api-key" }
    ).stringValue;

    // interactionで呼び出す関数
    const interactionFn = new NodejsFunction(this, "tutor-discord-lambda", {
      entry: "lambda/discord.ts",
      handler: "handler", // entryファイルからexportされたhandler関数を指定
      runtime: Runtime.NODEJS_22_X,
      // デフォルトは3秒. lambdaの上限は15minだが、api gatewayのデフォルト/上限タイムアウトは29秒であるためlambdaも同等にしておく。
      // api gatewayの上限は申請により引き上げられる。 See: https://aws.amazon.com/jp/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds/
      timeout: Duration.seconds(30),
      bundling: {
        bundleAwsSDK: true,
        sourceMap: true,
      },
      // fn.addEnvironment() でも追加できるよう
      environment: {
        DISCORD_PUBLIC_KEY: discordPublicKey,
        DISCORD_TOKEN: discordToken,
        OPENAI_API_KEY: openAIApiKey,
      },
    });

    // api gateway
    new LambdaRestApi(this, "tutor-discord-api", {
      handler: interactionFn,
    });
  }
}
