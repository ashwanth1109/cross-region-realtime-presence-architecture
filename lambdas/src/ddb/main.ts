import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import QueryInput = DocumentClient.QueryInput;

const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    spaceId: string;
  };
};

const getUsersOnlineBySpace = async (spaceId: string) => {
  const params: QueryInput = {
    TableName: process.env.TABLE_NAME || "",
    IndexName: "space-index",
    ExpressionAttributeNames: {
      "#sid": "spaceId",
    },
    KeyConditionExpression: "#sid = :sid",
    ExpressionAttributeValues: {
      ":sid": spaceId,
    },
  };

  try {
    const data = await docClient.query(params).promise();
    return data.Items;
  } catch (e) {
    console.log(e);
    return null;
  }
};

export async function handler(e: AppSyncEvent) {
  console.log(e);

  switch (e.info.fieldName) {
    case "getUsersOnlineBySpace":
      return getUsersOnlineBySpace(e.arguments.spaceId);
    case "createUserPresence":
      return "createUserPresence";
    case "deleteUserPresence":
      return "deleteUserPresence";
  }

  return null;
}
