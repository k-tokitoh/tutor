// import {
//   Duration,
//   Stack,
//   StackProps,
//   RemovalPolicy,
//   CfnOutput,
// } from "aws-cdk-lib";
// import { Construct } from "constructs";
// import {
//   Runtime,
//   FunctionUrlAuthType,
//   DockerImageFunction,
//   DockerImageCode,
// } from "aws-cdk-lib/aws-lambda";
// import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
// import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
// import { StringParameter } from "aws-cdk-lib/aws-ssm";
// import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
// import {
//   Bucket,
//   BucketEncryption,
//   BlockPublicAccess,
// } from "aws-cdk-lib/aws-s3";
// import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
// import { Distribution } from "aws-cdk-lib/aws-cloudfront";
// import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
// import { channelAccessToken } from "@line/bot-sdk";

// export class Slack extends Construct {
//   constructor(scope: Construct, id: string, props: StackProps) {
//     super(scope, id);

//     // 環境変数
//     const slackToken = StringParameter.fromStringParameterAttributes(
//       this,
//       "tutor-slack-token",
//       { parameterName: "tutor-slack-token" }
//     ).stringValue;

//     const openAIApiKey = StringParameter.fromStringParameterAttributes(
//       this,
//       "tutor-openai-api-key",
//       { parameterName: "tutor-openai-api-key" }
//     ).stringValue;

//     // lambda関数
//     const fn = new NodejsFunction(this, "thoth-lambda", {
//       entry: "lambda/slack.ts",
//       handler: "handler", // entryファイルからexportされたhandler関数を指定
//       runtime: Runtime.NODEJS_22_X,
//       timeout: Duration.seconds(30), // デフォルトは3秒
//       bundling: {
//         bundleAwsSDK: true,
//       },
//       // fn.addEnvironment() でも追加できるよう
//       environment: {
//         SLACK_TOKEN: slackToken,
//         OPENAI_API_KEY: openAIApiKey,
//       },
//     });

//     // api gateway
//     new LambdaRestApi(this, "thoth-api", {
//       handler: fn,
//     });
//   }
// }
