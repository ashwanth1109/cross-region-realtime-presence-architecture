const AWS = require("aws-sdk");
const docClient = new AWS.DynamoDB.DocumentClient();

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {};
};

const listUsers = async () => {
  const params = {
    TableName: process.env.NOTES_TABLE,
  };

  try {
    const data = await docClient.scan(params).promise();
    return data.Items;
  } catch (e) {
    console.log(e);
    return null;
  }
};

export async function handler(e: AppSyncEvent) {
  console.log(e);

  switch (e.info.fieldName) {
    case "listUsers":
      return await listUsers();
  }

  return null;
}
