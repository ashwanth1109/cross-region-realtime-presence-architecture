import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import UpdateItemInput = DocumentClient.UpdateItemInput;
import ExpressionAttributeValueMap = DocumentClient.ExpressionAttributeValueMap;

const { AWS_REGION, TABLE_NAME } = process.env;

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

export async function handler(event: any) {
  console.log("Heartbeat lambda fired");
  console.log(event);
  const { connectionId } = event.requestContext;
  const { timestamp, spaceId, userId } = JSON.parse(event.body)?.payload;

  let updateExpression = "set timestamp = :ts";
  let expressionUpdateValues: ExpressionAttributeValueMap = {
    ":ts": { N: timestamp },
  };

  if (spaceId) {
    updateExpression = `${updateExpression}, spaceId = :sid`;
    expressionUpdateValues = {
      ...expressionUpdateValues,
      ":sid": { S: spaceId },
    };
  }

  if (userId) {
    updateExpression = `${updateExpression}, userId = :uid`;
    expressionUpdateValues = {
      ...expressionUpdateValues,
      ":uid": { S: userId },
    };
  }

  console.log(`"${updateExpression}"`);
  console.log(expressionUpdateValues);

  const updateParams: UpdateItemInput = {
    TableName: TABLE_NAME || "",
    Key: {
      connectionId: {
        S: connectionId,
      },
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionUpdateValues,
  };

  try {
    await ddb.update(updateParams).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: "Heartbeat update" };
}
