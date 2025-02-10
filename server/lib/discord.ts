import * as path from "path";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecrDeploy from "cdk-ecr-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";

export class Discord extends Construct {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id);

    // todo: ちゃんとする
    cdk.Tags.of(scope).add("my_key", "yes");

    const { accountId, region } = new cdk.ScopedAws(this);

    // 環境変数
    const discordPublicKey = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "DiscordPublicKey",
      { parameterName: "tutor-discord-public-key" }
    ).stringValue;

    const discordToken = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "DiscordToken",
      { parameterName: "tutor-discord-token" }
    ).stringValue;

    const openAIApiKey = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "OpenaiApiKey",
      { parameterName: "tutor-openai-api-key" }
    ).stringValue;

    // VPC

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1, // Default is all AZs in region
    });

    // ECR

    const repository = new ecr.Repository(this, "Repository", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      repositoryName: "tutor-repository",
    });

    // Deploy Image
    // 自動的に生成されるECRリポジトリにpushされる
    const dockerImageAsset = new ecrAssets.DockerImageAsset(
      this,
      "DockerImageAsset",
      {
        directory: path.join(__dirname, ".."),
        platform: ecrAssets.Platform.LINUX_AMD64,
      }
    );

    console.log("#######################");
    console.log({
      uri: repository.repositoryUri,
      digest: repository.repositoryUriForDigest("digest"),
      tag: repository.repositoryUriForTag("tag"),
    });
    console.log("#######################");

    // See: https://github.com/cdklabs/cdk-ecr-deployment/issues/1017
    // process.env.NO_PREBUILT_LAMBDA = "1";

    // new ecrDeploy.ECRDeployment(this, "DeployDockerImage", {
    //   src: new ecrDeploy.DockerImageName(dockerImageAsset.imageUri),
    //   dest: new ecrDeploy.DockerImageName(
    //     repository.repositoryUriForDigest(dockerImageAsset.assetHash)
    //     // `${accountId}.dkr.ecr.${region}.amazonaws.com/${repository.repositoryName}:latest`
    //   ),
    // });

    // ECS

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: "/ecs/tutor", // ロググループ名を指定
      retention: logs.RetentionDays.ONE_WEEK, // ログの保持期間を指定（例: 一週間）
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc,
    });

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        taskRole,
      }
    );

    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromEcrRepository(repository, "latest"), // latestじゃない運用はありうる？どういう形？
      logging: new ecs.AwsLogDriver({
        logGroup,
        streamPrefix: "/ecs/tutor",
      }),
      environment: {},
    });

    // new ecs.FargateService(this, "tutor-service", {
    //   cluster,
    //   taskDefinition,
    // });
  }
}
