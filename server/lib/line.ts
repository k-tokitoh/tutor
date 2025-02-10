// import {
//   Stack,
//   StackProps,
//   Duration,
//   RemovalPolicy,
//   CfnOutput,
// } from "aws-cdk-lib";
// import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
// import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
// import { Source } from "aws-cdk-lib/aws-codebuild";
// import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
// import { Runtime } from "aws-cdk-lib/aws-lambda";
// import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
// import { Distribution } from "aws-cdk-lib/aws-logs";
// import {
//   Bucket,
//   BucketEncryption,
//   BlockPublicAccess,
// } from "aws-cdk-lib/aws-s3";
// import { BucketDeployment } from "aws-cdk-lib/aws-s3-deployment";
// import { StringParameter } from "aws-cdk-lib/aws-ssm";
// import { Construct } from "constructs";

// export class LineStack extends Stack {
//   constructor(scope: Construct, id: string, props: StackProps) {
//     super(scope, id, props);

//     // 環境変数
//     const channelAccessToken = StringParameter.fromStringParameterAttributes(
//       this,
//       "tutor-channel-access-token",
//       { parameterName: "tutor-channel-access-token" }
//     ).stringValue;

//     const channelSecret = StringParameter.fromStringParameterAttributes(
//       this,
//       "tutor-channel-secret",
//       { parameterName: "tutor-channel-secret" }
//     ).stringValue;

//     // lambda関数
//     const fn = new NodejsFunction(this, "lambda", {
//       entry: "lambda/line.ts",
//       handler: "handler", // entryファイルからexportされたhandler関数を指定
//       runtime: Runtime.NODEJS_22_X,
//       timeout: Duration.seconds(30), // デフォルトは3秒
//       bundling: {
//         bundleAwsSDK: true,
//       },
//       // fn.addEnvironment() でも追加できるよう
//       environment: {
//         CHANNEL_ACCESS_TOKEN: channelAccessToken,
//         CHANNEL_SECRET: channelSecret,
//       },
//     });

//     const policyBedrock = new PolicyStatement({
//       effect: Effect.ALLOW,
//       actions: ["bedrock:InvokeModel"],
//       resources: ["*"], // リソースを限定したい
//     });
//     fn.addToRolePolicy(policyBedrock);

//     // api gateway経由で呼び出すだけなら、関数URLは不要
//     // fn.addFunctionUrl({
//     //   // NONE: Lambda は、関数 URL へのリクエストに対して IAM 認証を実行しません。関数に独自の認可ロジックを実装しない限り、URL エンドポイントはパブリックになります。
//     //   // AWS_IAM: 認証された IAM ユーザーとロールのみが、関数 URL にリクエストを行うことができます。
//     //   authType: FunctionUrlAuthType.NONE,
//     // });

//     // api gateway
//     new LambdaRestApi(this, "myapi", {
//       handler: fn,
//     });

//     // s3
//     const destinationBucket = new Bucket(this, "S3Bucket", {
//       // グローバルに一意な必要あり
//       bucketName: "tutor-cdk-static-file-deploy",
//       encryption: BucketEncryption.S3_MANAGED,
//       versioned: false,
//       blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
//       publicReadAccess: true,
//       removalPolicy: RemovalPolicy.RETAIN,
//       enforceSSL: true,
//     });

//     // cloudfront
//     const distribution = new Distribution(this, "WebsiteDistribution", {
//       defaultRootObject: "index.html",
//       defaultBehavior: {
//         origin: S3BucketOrigin.withOriginAccessControl(destinationBucket),
//       },
//       // hoge.com/foo にアクセスしたら cfは hoge.com/foo/index.html にアクセスしてしまう。
//       // この場合に hoge.com/index.html を返す。ブラウザは /foo を持っているので、jsがよしなにroutingする
//       errorResponses: [
//         {
//           httpStatus: 403,
//           responseHttpStatus: 200,
//           responsePagePath: "/index.html",
//         },
//       ],
//     });

//     // bucketにデプロイ
//     new BucketDeployment(this, "S3Deployment", {
//       sources: [Source.asset("../client/dist")],
//       destinationBucket,
//       distribution,
//       distributionPaths: ["/*"],
//     });

//     new CfnOutput(this, "Hosting URL", {
//       value: "https://" + distribution.distributionDomainName,
//     });
//   }
// }
