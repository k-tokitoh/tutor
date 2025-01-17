import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime, FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class TutorStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // lambdaの関数
    const fn = new NodejsFunction(this, "lambda", {
      entry: "lambda/index.ts",
      handler: "handler", // entryファイルからexportされたhandler関数を指定
      runtime: Runtime.NODEJS_20_X,
    });

    // api gateway経由で呼び出すだけなら、関数URLは不要
    // fn.addFunctionUrl({
    //   // NONE: Lambda は、関数 URL へのリクエストに対して IAM 認証を実行しません。関数に独自の認可ロジックを実装しない限り、URL エンドポイントはパブリックになります。
    //   // AWS_IAM: 認証された IAM ユーザーとロールのみが、関数 URL にリクエストを行うことができます。
    //   authType: FunctionUrlAuthType.NONE,
    // });

    new LambdaRestApi(this, "myapi", {
      handler: fn,
    });
  }
}
