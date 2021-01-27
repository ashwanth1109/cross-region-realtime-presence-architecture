import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import DeleteItemInput = DocumentClient.DeleteItemInput;
import ApiGatewayManagementApi from "aws-sdk/clients/apigatewaymanagementapi";
import QueryInput = DocumentClient.QueryInput;

const { AWS_REGION, TABLE_NAME } = process.env;

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

export async function handler(event: any) {
  console.log("Disconnect lambda fired");
  console.log(event);

  const deleteParams: DeleteItemInput = {
    TableName: TABLE_NAME || "",
    Key: {
      connectionId: event.requestContext.connectionId,
    },
    ReturnValues: "ALL_OLD",
  };

  let deletedItem: any;
  try {
    deletedItem = await ddb.delete(deleteParams).promise();
  } catch (err) {
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(err)}`,
    };
  }

  const queryParams: QueryInput = {
    TableName: TABLE_NAME || "",
    IndexName: "space-index",
    ExpressionAttributeNames: { "#sid": "spaceId" },
    KeyConditionExpression: "#sid = :sid",
    ExpressionAttributeValues: { ":sid": deletedItem.Attributes?.spaceId },
  };

  const { Items } = await ddb.query(queryParams).promise();

  const apigwManagementApi = new ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint:
      event.requestContext.domainName + "/" + event.requestContext.stage,
  });

  const promises = Items?.map(async ({ connectionId }: any) => {
    try {
      await apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            type: "USER_WENT_OFFLINE",
            userId: deletedItem.Attributes?.userId,
          }),
        })
        .promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb
          .delete({ TableName: TABLE_NAME || "", Key: { connectionId } })
          .promise();
      } else {
        // What should be the error handling here?
        throw e;
      }
    }
  });

  try {
    await Promise.all(promises as any);
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

  return { statusCode: 200, body: "Disconnected." };
}
