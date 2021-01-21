import { NestedStack, NestedStackProps } from "@aws-cdk/core";
import { DeployStack } from "./deploy-stack";
import { AttributeType, BillingMode, Table } from "@aws-cdk/aws-dynamodb";
import { HttpApi } from "@aws-cdk/aws-apigatewayv2";

export class WssGatewayStack extends NestedStack {
  constructor(scope: DeployStack, id: string, props: NestedStackProps) {
    super(scope, id, props);

    // WSS Gateway Stack
    new Table(this, "WSSConnectionsTable", {
      tableName: "openh-wss-connections-table",
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: AttributeType.STRING,
      },
    });

    new HttpApi(this, "WssHttpApi", {
      apiName: "openh-wss-http-api",
    });
  }
}
