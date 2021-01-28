import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import PutItemInput = DocumentClient.PutItemInput;
import QueryInput = DocumentClient.QueryInput;
import ApiGatewayManagementApi from "aws-sdk/clients/apigatewaymanagementapi";

const AWS_REGION = process.env.AWS_REGION;
const TABLE_NAME = process.env.TABLE_NAME || "";

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

export async function handler(event: any) {
  console.log("Connect lambda fired", AWS_REGION);
  console.log(event);
  const { spaceId, userId, timestamp } = event.headers;

  const queryParams: QueryInput = {
    TableName: TABLE_NAME,
    IndexName: "space-index",
    ExpressionAttributeNames: { "#sid": "spaceId", "#r": "region" },
    KeyConditionExpression: "#sid = :sid AND #r = :r",
    ExpressionAttributeValues: { ":sid": spaceId, ":r": AWS_REGION },
  };

  let Items;
  try {
    ({ Items } = await ddb.query(queryParams).promise());

    // Create User Presence item in DDB
    const putParams: PutItemInput = {
      TableName: TABLE_NAME,
      Item: {
        connectionId: event.requestContext.connectionId,
        region: AWS_REGION,
        spaceId,
        userId,
        timestamp,
      },
    };
    const createdItem = await ddb.put(putParams).promise();
    console.log(JSON.stringify(Items), createdItem);
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: `Failed to connect online: ${JSON.stringify(err)}`,
    };
  }

  const apiGwOptions = {
    apiVersion: "2018-11-29",
    endpoint:
      event.requestContext.domainName + "/" + event.requestContext.stage,
  };
  console.log(apiGwOptions);
  const apigwManagementApi = new ApiGatewayManagementApi(apiGwOptions);

  const promises = Items?.map(async ({ connectionId, region }: any) => {
    try {
      if (region === AWS_REGION) {
        await apigwManagementApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              spaceId,
              userId,
              timestamp,
              type: "USER_CAME_ONLINE",
            }),
          })
          .promise();
      }
    } catch (e) {
      console.log(e);
    }
  });

  try {
    await Promise.all(promises as any);
  } catch (e) {
    console.log(e);
    // Should we delete current connection - or have client call a cleanup action on delete

    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "Connected." };
}
