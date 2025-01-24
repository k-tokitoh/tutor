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

    // lambda関数
    const fn = new NodejsFunction(this, "tutor-discord-lambda", {
      entry: "lambda/discord.ts",
      handler: "handler", // entryファイルからexportされたhandler関数を指定
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30), // デフォルトは3秒
      bundling: {
        bundleAwsSDK: true,
      },
      // fn.addEnvironment() でも追加できるよう
      environment: {
        DISCORD_PUBLIC_KEY: discordPublicKey,
      },
    });

    // api gateway
    new LambdaRestApi(this, "tutor-discord-api", {
      handler: fn,
    });
  }
}
