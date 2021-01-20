import * as cdk from "@aws-cdk/core";
import { AuthorizationType, GraphqlApi, Schema } from "@aws-cdk/aws-appsync";
import { UserPool } from "@aws-cdk/aws-cognito";
import { CfnOutput } from "@aws-cdk/core";
import { AttributeType, BillingMode, Table } from "@aws-cdk/aws-dynamodb";

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const userPool = new UserPool(this, "AwsChatUserPool", {
      autoVerify: {
        email: true,
      },
      userPoolName: "openh-chat-user-pool",
    });

    const api = new GraphqlApi(this, "AwsChatApi", {
      name: "openh-chat-gql-api",
      schema: Schema.fromAsset("../graphql/schema.graphql"),
      xrayEnabled: true,
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
      },
    });

    new CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl,
    });

    new CfnOutput(this, "GraphQLAPIKey", {
      value: api.apiKey || "",
    });

    new CfnOutput(this, "Stack Region", {
      value: this.region,
    });

    const usersTable = new Table(this, "AwsChatUsersTable", {
      tableName: "openh-chat-users-table",
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });
  }
}
