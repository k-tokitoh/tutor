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
import { readFileSync } from "fs";
import * as logs from "aws-cdk-lib/aws-logs";

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

    const logGroup = new logs.LogGroup(this, "tutor-log-group", {
      logGroupName: "/ecs/tutor-nonpattern", // ロググループ名を指定
      retention: logs.RetentionDays.ONE_WEEK, // ログの保持期間を指定（例: 一週間）
    });

    const repository = new Repository(this, "AppRunnerExampleRepository", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const vpc = new ec2.Vpc(this, "tutor-vpc", {
      maxAzs: 2, // Default is all AZs in region
    });

    const nonPatternCluster = new ecs.Cluster(this, "non-pattern-cluster", {
      vpc: vpc,
    });

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "non-pattern", {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
    });

    taskDefinition.addContainer("non-pattern-container", {
      image: ecs.ContainerImage.fromEcrRepository(repository, "latest"), // latestじゃない運用はありうる？どういう形？
      logging: new ecs.AwsLogDriver({
        logGroup,
        streamPrefix: "/ecs/tutor-nonpattern",
      }),
      environment: {},
    });

    new ecs.FargateService(this, "non-pattern-service", {
      cluster: nonPatternCluster,
      taskDefinition,
    });

    // ================================

    // const cluster = new ecs.Cluster(this, "tutor-cluster", {
    //   vpc: vpc,
    // });

    // Create a load-balanced Fargate service and make it public
    // new ecs_patterns.ApplicationLoadBalancedFargateService(
    //   this,
    //   "MyFargateService",
    //   {
    //     cluster: cluster, // Required
    //     cpu: 256, // Default is 256
    //     desiredCount: 1, // Default is 1
    //     taskImageOptions: {
    //       // 上記のECRで作成したリポジトリを指定
    //       image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
    //       containerPort: 3000,
    //     },
    //     memoryLimitMiB: 512, // Default is 512
    //     publicLoadBalancer: true, // ?? Default is true
    //     // healthCheck: {
    //     //   interval: cdk.Duration.seconds(5),
    //     //   retries: 2,
    //     // },
    //   }
    // );
  }
}
