#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TutorStack } from "../lib/tutor-stack";
import { getSetting } from "../settings";

const app = new cdk.App();

const setting = getSetting(app);

new TutorStack(app, `${setting.stackPrefix}TutorStack`, {
  environment: setting.environment,
  secretsId: setting.secretsId,
  // cdkで規定されたprops
  env: {
    account: setting.accountId,
    region: setting.region,
  },
});
