import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import QueryInput = DocumentClient.QueryInput;
import PutItemInput = DocumentClient.PutItemInput;

const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env?.TABLE_NAME || "";

type UserPresence = {
  connectionId: string;
  spaceId: string;
  userId: string;
};
type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    spaceId: string;
    userPresence: UserPresence;
  };
};

const getUsersOnlineBySpace = async (spaceId: string) => {
  const params: QueryInput = {
    TableName: TABLE_NAME,
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

const createUserPresence = async ({
  connectionId,
  spaceId,
  userId,
}: UserPresence) => {
  const params: PutItemInput = {
    TableName: TABLE_NAME,
    Item: {
      connectionId,
      spaceId,
      userId,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    console.log(params);
    const data = await docClient.put(params).promise();
    console.log(data);
    return {};
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
      return createUserPresence(e.arguments.userPresence);
    case "deleteUserPresence":
      return "deleteUserPresence";
  }

  return null;
}
