import * as cdk from "@aws-cdk/core";
import { CfnOutput, ConcreteDependable } from "@aws-cdk/core";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from "@aws-cdk/aws-dynamodb";
import {
  Code,
  EventSourceMapping,
  Function,
  LayerVersion,
  Runtime,
  StartingPosition,
} from "@aws-cdk/aws-lambda";
import {
  CfnApi,
  CfnDeployment,
  CfnIntegration,
  CfnRoute,
  CfnStage,
} from "@aws-cdk/aws-apigatewayv2";
import { constructIntegUri, withEnv } from "../util";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "@aws-cdk/aws-iam";

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
        name: "connectionId",
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      replicationRegions: ["ap-south-1"],
    });

    table.addGlobalSecondaryIndex({
      indexName: "space-index",
      partitionKey: { name: "spaceId", type: AttributeType.STRING },
      sortKey: { name: "region", type: AttributeType.STRING },
    });

    const layer = new LayerVersion(this, withEnv("lambda-layer"), {
      code: Code.fromAsset("./lib/layer/"),
      compatibleRuntimes: [Runtime.NODEJS_12_X],
      description: "Agent Lambda Dependencies",
    });

    const lambda_policy = new PolicyStatement({
      actions: [
        "dynamodb:GetItem",
        "dynamodb:DeleteItem",
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem",
        "dynamodb:DescribeTable",
        "dynamodb:ConditionCheckItem",
      ],
      resources: [table.tableArn, `${table.tableArn}/index/space-index`],
    });

    const manage_sockets_policy = new PolicyStatement({
      actions: ["execute-api:ManageConnections"],
      resources: ["*"],
    });

    const environment = {
      TABLE_NAME: table.tableName,
    };

    const lambdaRole = new Role(this, "wss-lambda-role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    lambdaRole.addToPolicy(lambda_policy);
    // Narrow this policy down
    lambdaRole.addToPolicy(manage_sockets_policy);
    lambdaRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    const streamLambdaPolicy = new PolicyStatement({
      actions: ["dynamodb:*", "lambda:*"],
      resources: ["*"],
    });

    lambdaRole.addToPolicy(streamLambdaPolicy);

    const functionParams = {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset("../dist/"),
      memorySize: 128,
      role: lambdaRole,
      environment,
    };

    const streamLambda = new Function(this, "streamLambda", {
      ...functionParams,
      handler: "stream/index.handler",
    });

    new EventSourceMapping(this, "LambdaDdbStream", {
      target: streamLambda,
      eventSourceArn: table.tableStreamArn || "",
      batchSize: 1,
      startingPosition: StartingPosition.LATEST,
    });

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
        name: "heartbeat",
        key: "heartbeat",
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

    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [
        routes[0].lambda.functionArn,
        routes[1].lambda.functionArn,
        routes[2].lambda.functionArn,
      ],
      actions: ["lambda:InvokeFunction"],
    });

    const role = new Role(this, `wss-iam-role`, {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });
    role.addToPolicy(policy);

    const routeConstructs = routes.map((route) => {
      const integName = withEnv(`${route.name}-integration`);
      const integUri = constructIntegUri(route.lambda.functionArn, this.region);
      const integration = new CfnIntegration(this, integName, {
        apiId: wssApi.ref,
        integrationType: "AWS_PROXY",
        integrationUri: integUri,
        credentialsArn: role.roleArn,
      });

      const routeName = withEnv(`${route.name}-route`);
      return new CfnRoute(this, routeName, {
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

    const dependencies = new ConcreteDependable();
    routeConstructs.map((routeConstruct) => {
      dependencies.add(routeConstruct);
    });

    wssDeployment.node.addDependency(dependencies);

    const wssUrl = `wss://${wssApi.ref}.execute-api.${this.region}.amazonaws.com/${stageName}`;
    new CfnOutput(this, "WssUrl", {
      value: wssUrl,
    });
  }
}
