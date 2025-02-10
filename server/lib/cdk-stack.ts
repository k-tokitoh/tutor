import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Slack } from "./slack";
import { Discord } from "./discord";

export class TutorStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // new Slack(this, "slack", props);
    new Discord(this, "Discord", props);
  }
}
