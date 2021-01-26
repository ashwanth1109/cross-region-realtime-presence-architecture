import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import DeleteItemInput = DocumentClient.DeleteItemInput;

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

  try {
    const retVal = await ddb.delete(deleteParams).promise();
    console.log(retVal);
  } catch (err) {
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(err)}`,
    };
  }

  return { statusCode: 200, body: "Disconnected." };
}
