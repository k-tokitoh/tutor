import * as path from "path";

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecrDeploy from "cdk-ecr-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import { fileURLToPath } from "url";
import "path";
import { platform } from "os";

export const environments = ["dev", "edge-infra"] as const;
export type Environment = (typeof environments)[number];

export interface TutorStackProps extends cdk.StackProps {
  environment: Environment;
  secretsId: string;
}

export class TutorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TutorStackProps) {
    super(scope, id, props);

    // todo: ちゃんとする
    cdk.Tags.of(scope).add("my_key", "yes");

    const { accountId, region } = new cdk.ScopedAws(this);

    // ================================ 環境変数
    // systems managerのSecureStringは一部のリソースでしか使えないため、SecretsManagerを使う
    // 参考: https://dev.classmethod.jp/articles/aws-cdk-ssm-secrets-manager/
    const secrets = secretsManager.Secret.fromSecretCompleteArn(
      this,
      "Secrets",
      `arn:aws:secretsmanager:${region}:${accountId}:secret:${props.secretsId}` //
    );
    const discordBotToken = ecs.Secret.fromSecretsManager(secrets, "discord-token");

    // ================================ VPC

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1, // Default is all AZs in region
    });

    // ================================ ECR

    const repository = new ecr.Repository(this, "Repository", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      repositoryName: `${props.environment}-tutor-repository`,
    });

    // Deploy Image

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 自動的に生成されるECRリポジトリにpushされる
    const dockerImageAsset = new ecrAssets.DockerImageAsset(this, "DockerImageAsset", {
      directory: path.join(__dirname, "../../app"),
      platform: ecrAssets.Platform.LINUX_AMD64,
    });

    process.env.NO_PREBUILT_LAMBDA = "1"; // See: https://github.com/cdklabs/cdk-ecr-deployment/issues/1017

    new ecrDeploy.ECRDeployment(this, "DeployDockerImage", {
      src: new ecrDeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrDeploy.DockerImageName(repository.repositoryUriForTag(dockerImageAsset.assetHash)),
    });

    // ================================ ECS

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: `/ecs/tutor/${props.environment}`,
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
      logging: new ecs.AwsLogDriver({ logGroup, streamPrefix: `/ecs/tutor/${props.environment}` }),
      secrets: {
        DISCORD_BOT_TOKEN: discordBotToken,
      },
    });

    new ecs.FargateService(this, "Service", { cluster, taskDefinition });
  }
}
