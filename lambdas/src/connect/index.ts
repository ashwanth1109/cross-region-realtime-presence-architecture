import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import PutItemInput = DocumentClient.PutItemInput;
import QueryInput = DocumentClient.QueryInput;
import ApiGatewayManagementApi from "aws-sdk/clients/apigatewaymanagementapi";
import DeleteItemInput = DocumentClient.DeleteItemInput;

const AWS_REGION = process.env.AWS_REGION;
const TABLE_NAME = process.env.TABLE_NAME || "";

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

export async function handler(event: any) {
  console.log("Connect lambda fired");
  console.log(event);
  const { spaceId, userId } = event.headers;

  const putParams: PutItemInput = {
    TableName: TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId,
      spaceId,
      userId,
      timestamp: Date.now(),
    },
  };

  const queryParams: QueryInput = {
    TableName: TABLE_NAME,
    IndexName: "space-index",
    ExpressionAttributeNames: { "#sid": "spaceId" },
    KeyConditionExpression: "#sid = :sid",
    ExpressionAttributeValues: { ":sid": spaceId },
  };

  let Items = [];
  try {
    const promises: any = [];
    // Create User Presence item in DDB
    promises.push(ddb.put(putParams).promise());
    promises.push(ddb.query(queryParams).promise());

    const results = await Promise.all(promises);
    ({ Items } = results[1] as any);
    console.log(JSON.stringify(Items));
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: `Failed to connect online: ${JSON.stringify(err)}`,
    };
  }

  const apigwManagementApi = new ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint:
      event.requestContext.domainName + "/" + event.requestContext.stage,
  });

  const promises = Items.map(async ({ connectionId }: any) => {
    try {
      await apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: "USER_CAME_ONLINE",
            userId,
          }),
        })
        .promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb
          .delete({ TableName: TABLE_NAME, Key: { connectionId } })
          .promise();
      } else {
        // What should be the error handling here?
        throw e;
      }
    }
  });

  try {
    await Promise.all(promises);
  } catch (e) {
    console.log(e);
    // Should we delete current connection?
    const deleteParams: DeleteItemInput = {
      TableName: TABLE_NAME || "",
      Key: {
        connectionId: event.requestContext.connectionId,
      },
    };

    try {
      await ddb.delete(deleteParams).promise();
    } catch (e) {
      // what happens here?
    }

    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "Connected." };
}
