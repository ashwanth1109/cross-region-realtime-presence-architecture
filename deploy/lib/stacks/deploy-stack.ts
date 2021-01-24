import * as cdk from "@aws-cdk/core";
import { AuthorizationType, GraphqlApi, Schema } from "@aws-cdk/aws-appsync";
import { UserPool } from "@aws-cdk/aws-cognito";
import { CfnOutput } from "@aws-cdk/core";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from "@aws-cdk/aws-dynamodb";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import {
  CfnApi,
  CfnDeployment,
  CfnIntegration,
  CfnRoute,
  CfnStage,
} from "@aws-cdk/aws-apigatewayv2";
import { constructIntegUri, withEnv } from "../util";

export class DeployStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // Cross-region replication of dynamodb tables with stream
    const tableName = withEnv("user-presence");
    const table = new Table(this, tableName, {
      tableName,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: "ttl",
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      replicationRegions: ["ap-south-1"],
    });

    const environment = {
      TABLE_NAME: table.tableName,
    };

    const functionParams = {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset("../dist/"),
      memorySize: 128,
      environment,
    };

    const wssRouteNames = [
      {
        name: "connect",
        key: "$connect",
      },
      {
        name: "disconnect",
        key: "$disconnect",
      },
      {
        name: "message",
        key: "message",
      },
    ];

    const routes = wssRouteNames.map((route) => {
      const lambdaName = withEnv(`${route.name}-function`);
      return {
        name: route.name,
        key: route.key,
        lambda: new Function(this, lambdaName, {
          ...functionParams,
          handler: `${route.name}/index.handler`,
        }),
      };
    });

    const wssApiName = withEnv("wss-api");
    const wssApi = new CfnApi(this, wssApiName, {
      name: wssApiName,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    routes.map((route) => {
      const integName = withEnv(`${route.name}-integration`);
      const integUri = constructIntegUri(route.lambda.functionArn, this.region);
      const integration = new CfnIntegration(this, integName, {
        apiId: wssApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: integUri,
      });

      const routeName = withEnv(`${route.name}-route`);
      new CfnRoute(this, routeName, {
        apiId: wssApi.ref,
        routeKey: route.key,
        authorizationType: "NONE",
        target: `integrations/${integration.ref}`,
      });
    });

    const wssDeployment = new CfnDeployment(this, withEnv("wss-deployment"), {
      apiId: wssApi.ref,
    });

    const stageName = "test";
    new CfnStage(this, withEnv("wss-stage"), {
      stageName,
      apiId: wssApi.ref,
      deploymentId: wssDeployment.ref,
    });

    new CfnOutput(this, "WssUrl", {
      value: `wss://${wssApi.ref}.execute-api.${this.region}.amazonaws.com/${stageName}`,
    });

    // const userPool = new UserPool(this, "AwsChatUserPool", {
    //   autoVerify: {
    //     email: true,
    //   },
    //   userPoolName: "openh-chat-user-pool",
    // });
    //
    // const api = new GraphqlApi(this, "AwsChatApi", {
    //   name: "openh-chat-gql-api",
    //   schema: Schema.fromAsset("../graphql/schema.graphql"),
    //   xrayEnabled: true,
    //   authorizationConfig: {
    //     defaultAuthorization: {
    //       authorizationType: AuthorizationType.USER_POOL,
    //       userPoolConfig: {
    //         userPool,
    //       },
    //     },
    //   },
    // });
    //
    // new CfnOutput(this, "GraphQLAPIURL", {
    //   value: api.graphqlUrl,
    // });
    //
    // new CfnOutput(this, "GraphQLAPIKey", {
    //   value: api.apiKey || "",
    // });
    //
    // new CfnOutput(this, "Stack Region", {
    //   value: this.region,
    // });
    //
    // const usersLambda = new Function(this, "AwsChatUsersLambda", {
    //   runtime: Runtime.NODEJS_12_X,
    //   handler: "main.handler",
    //   code: Code.fromAsset("../dist"),
    //   memorySize: 256,
    // });
    //
    // const usersLambdaDs = api.addLambdaDataSource(
    //   "UsersLambdaDataSource",
    //   usersLambda
    // );
    //
    // usersLambdaDs.createResolver({
    //   typeName: "Query",
    //   fieldName: "listUsers",
    // });
    //
    // const usersTable = new Table(this, "AwsChatUsersTable", {
    //   tableName: "openh-chat-users-table",
    //   billingMode: BillingMode.PAY_PER_REQUEST,
    //   partitionKey: {
    //     name: "id",
    //     type: AttributeType.STRING,
    //   },
    // });
    //
    // usersTable.grantFullAccess(usersLambdaDs);
    // usersLambda.addEnvironment("USERS_TABLE", usersTable.tableName);
  }
}
