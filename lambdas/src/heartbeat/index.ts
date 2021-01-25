import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import UpdateItemInput = DocumentClient.UpdateItemInput;

const { AWS_REGION, TABLE_NAME } = process.env;

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

export async function handler(event: any) {
  console.log("Heartbeat lambda fired");
  console.log(event);

  const updateParams: UpdateItemInput = {
    TableName: TABLE_NAME || "",
    Key: {
      connectionId: {
        S: event.requestContext.connectionId,
      },
    },
    UpdateExpression: "set timestamp = :ts",
    ExpressionAttributeValues: {
      ":ts": { N: Math.floor(Date.now() / 1000) + 10 },
    },
  };

  try {
    await ddb.update(updateParams).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "Heartbeat update" };
}
