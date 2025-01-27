import * as cdk from "aws-cdk-lib";
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
import { Repository } from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import {
  Bucket,
  BucketEncryption,
  BlockPublicAccess,
} from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";

export class Discord extends Construct {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
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

    // ================================ server

    // // ECR
    const repository = new Repository(this, "AppRunnerExampleRepository", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // // Roles
    // const instanceRole = new iam.Role(scope, "AppRunnerInstanceRole", {
    //   assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    // });

    // const accessRole = new iam.Role(scope, "AppRunnerAccessRole", {
    //   assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
    // });

    // // App Runner
    // // cfn: cloud formation
    // new apprunner.CfnService(scope, "AppRunnerExampleService", {
    //   sourceConfiguration: {
    //     authenticationConfiguration: {
    //       accessRoleArn: appRunnerECRAccessRole,
    //     },
    //     imageRepository: {
    //       imageIdentifier: repository.repositoryUriForTag("v1"), // ?
    //       imageRepositoryType: "ECR",
    //       imageConfiguration: {
    //         port: "3000",
    //         runtimeEnvironmentVariables: [],
    //       },
    //     },
    //   },
    // });

    new cdk.CfnOutput(this, "repo uri output", {
      value: repository.repositoryUri,
      description: "repo uri output",
    });

    const vpc = new ec2.Vpc(this, "tutor-vpc", {
      maxAzs: 2, // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "tutor-cluster", {
      vpc: vpc,
    });

    // Create a load-balanced Fargate service and make it public
    new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "MyFargateService",
      {
        cluster: cluster, // Required
        cpu: 256, // Default is 256
        desiredCount: 1, // Default is 1
        taskImageOptions: {
          // 上記のECRで作成したリポジトリを指定
          image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
          containerPort: 3000,
        },
        memoryLimitMiB: 512, // Default is 512
        publicLoadBalancer: true, // ?? Default is true
        // healthCheck: {
        //   interval: cdk.Duration.seconds(5),
        //   retries: 2,
        // },
      }
    );

    // ================================ serverless

    // // interactionで呼び出す関数
    // const interactionFn = new NodejsFunction(this, "tutor-discord-lambda", {
    //   entry: "lambda/discord.ts",
    //   handler: "handler", // entryファイルからexportされたhandler関数を指定
    //   runtime: Runtime.NODEJS_22_X,
    //   // デフォルトは3秒. lambdaの上限は15minだが、api gatewayのデフォルト/上限タイムアウトは29秒であるためlambdaも同等にしておく。
    //   // api gatewayの上限は申請により引き上げられる。 See: https://aws.amazon.com/jp/about-aws/whats-new/2024/06/amazon-api-gateway-integration-timeout-limit-29-seconds/
    //   timeout: Duration.seconds(30),
    //   bundling: {
    //     bundleAwsSDK: true,
    //     sourceMap: true,
    //   },
    //   // fn.addEnvironment() でも追加できるよう
    //   environment: {
    //     DISCORD_PUBLIC_KEY: discordPublicKey,
    //     DISCORD_TOKEN: discordToken,
    //     OPENAI_API_KEY: openAIApiKey,
    //   },
    // });

    // // api gateway
    // new LambdaRestApi(this, "tutor-discord-api", {
    //   handler: interactionFn,
    // });
  }
}
