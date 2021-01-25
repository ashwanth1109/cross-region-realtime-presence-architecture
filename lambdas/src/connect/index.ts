import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import PutItemInput = DocumentClient.PutItemInput;

const { AWS_REGION, TABLE_NAME } = process.env;

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

export async function handler(event: any) {
  console.log("Connect lambda fired");
  console.log(event);

  const putParams: PutItemInput = {
    TableName: TABLE_NAME || "",
    Item: {
      connectionId: event.requestContext.connectionId,
      ttl: Math.floor(Date.now() / 1000) + 10,
    },
  };

  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(err)}`,
    };
  }

  return { statusCode: 200, body: "Connected." };
}
