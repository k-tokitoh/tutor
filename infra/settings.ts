import { App } from "aws-cdk-lib";
import { environments, Environment } from "./lib/tutor-stack";

const validateEnvironment = (value: string): value is Environment => {
  return environments.includes(value as Environment);
};

abstract class BaseSetting<T extends Environment = Environment> {
  abstract readonly environment: T;
  abstract readonly secretsId: string;
  abstract readonly accountId: string;
  abstract readonly region: string;

  get stackPrefix(): string {
    return this.environment.replace(/(^\w|-\w)/g, (match) => match.replace("-", "").toUpperCase());
  }
}

class EdgeInfra extends BaseSetting {
  override readonly environment = "edge-infra" as const;
  override readonly secretsId = "tutor/edge-infra-j17NpR";
  override readonly accountId = "470855045134";
  override readonly region = "us-east-1";
}

class Dev extends BaseSetting {
  override readonly environment = "dev" as const;
  override readonly secretsId = "tutor/dev-rF2wDi";
  override readonly accountId = "470855045134";
  override readonly region = "us-east-1";
}

const settings = {
  "edge-infra": new EdgeInfra(),
  dev: new Dev(),
} satisfies { [key in Environment]: BaseSetting<key> };

export const getSetting = (app: App): BaseSetting => {
  const env = app.node.tryGetContext("env");
  if (!validateEnvironment(env)) {
    throw new Error(`Invalid environment name: ${env}`);
  }

  return settings[env];
};
