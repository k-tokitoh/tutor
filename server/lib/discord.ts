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
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";

export interface DiscordStackProps extends cdk.StackProps {
  // tagOrDigest: string;
  // cpu: number;
  // memory: number;
}

export class Discord extends Construct {
  constructor(scope: Construct, id: string, props: DiscordStackProps) {
    super(scope, id);

    // todo: ちゃんとする
    cdk.Tags.of(scope).add("my_key", "yes");

    const { accountId, region } = new cdk.ScopedAws(this);

    // ================================ 環境変数
    // systems managerのSecureStringは一部のリソースでしか使えないため、SecretsManagerを使う
    const secrets = secretsManager.Secret.fromSecretCompleteArn(
      this,
      "Secrets",
      `arn:aws:secretsmanager:${region}:${accountId}:secret:tutor-rik7JZ`
    );

    // ================================ VPC

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1, // Default is all AZs in region
    });

    // ================================ ECR

    const repository = new ecr.Repository(this, "Repository", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      repositoryName: "tutor-repository",
    });

    // Deploy Image
    // 自動的に生成されるECRリポジトリにpushされる
    const dockerImageAsset = new ecrAssets.DockerImageAsset(this, "DockerImageAsset", {
      directory: path.join(__dirname, ".."),
      platform: ecrAssets.Platform.LINUX_AMD64,
    });

    process.env.NO_PREBUILT_LAMBDA = "1"; // See: https://github.com/cdklabs/cdk-ecr-deployment/issues/1017

    new ecrDeploy.ECRDeployment(this, "DeployDockerImage", {
      src: new ecrDeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrDeploy.DockerImageName(repository.repositoryUriForTag(dockerImageAsset.assetHash)),
    });

    // ================================ ECS

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: "/ecs/tutor",
      retention: logs.RetentionDays.ONE_WEEK, // SREに要相談
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc: vpc });

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 512, // 環境ごとに切り替えたい
      cpu: 256, // 環境ごとに切り替えたい
      taskRole,
    });

    taskDefinition.addContainer("Container", {
      image: ecs.ContainerImage.fromEcrRepository(repository, dockerImageAsset.assetHash),
      logging: new ecs.AwsLogDriver({ logGroup, streamPrefix: "/ecs/tutor" }),
      secrets: {
        DISCORD_BOT_TOKEN: ecs.Secret.fromSecretsManager(secrets, "discord-token"),
      },
    });

    new ecs.FargateService(this, "Service", { cluster, taskDefinition });
  }
}
