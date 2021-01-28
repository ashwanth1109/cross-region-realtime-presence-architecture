import { DynamoDB } from "aws-sdk";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import QueryInput = DocumentClient.QueryInput;
import ApiGatewayManagementApi from "aws-sdk/clients/apigatewaymanagementapi";

const AWS_REGION = process.env.AWS_REGION;
const TABLE_NAME = process.env.TABLE_NAME || "";
const WSS_URL_REGION1 = process.env.WSS_URL_REGION1;
const WSS_URL_REGION2 = process.env.WSS_URL_REGION2;

const ddb = new DynamoDB.DocumentClient({
  apiVersion: "2012-08-10",
  region: AWS_REGION,
});

const REGION_1 = "us-east-1";
const REGION_2 = "ap-south-1";

export async function handler(event: any) {
  try {
    const recordPromises = event.Records.map(async (record: any) => {
      console.log("Stream record: ", JSON.stringify(record, null, 2));
      if (record.eventName === "INSERT") {
        const spaceId = record.dynamodb.NewImage.spaceId.S;
        const sourceRegion = record.dynamodb.NewImage.region.S;
        const timestamp = record.dynamodb.NewImage.timestamp.S;
        const userId = record.dynamodb.NewImage.userId.S;
        const destinationRegion =
          sourceRegion === REGION_1 ? REGION_2 : REGION_1;
        console.log(spaceId);
        console.log(sourceRegion);

        const queryParams: QueryInput = {
          TableName: TABLE_NAME,
          IndexName: "space-index",
          ExpressionAttributeNames: { "#sid": "spaceId", "#r": "region" },
          KeyConditionExpression: "#sid = :sid AND #r = :r",
          ExpressionAttributeValues: {
            ":sid": spaceId,
            ":r": destinationRegion,
          },
        };
        console.log("", queryParams);

        try {
          // User came online
          const { Items } = await ddb.query(queryParams).promise();
          console.log(Items);

          const postToEndpoint =
            sourceRegion === REGION_1 ? WSS_URL_REGION2 : WSS_URL_REGION1;
          console.log(postToEndpoint);
          const apiGwOptions = {
            apiVersion: "2018-11-29",
            region: destinationRegion,
            endpoint: postToEndpoint,
          };
          console.log(apiGwOptions);
          const apigwManagementApi = new ApiGatewayManagementApi(apiGwOptions);

          const connectionDetails = await apigwManagementApi.getConnection();
          console.log(connectionDetails);
          const postToConnectionPromises = Items?.map(
            async ({ connectionId }: any) => {
              try {
                console.log("Posting to connection id", connectionId);
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
              } catch (e) {
                // Error handling
                console.error(e);
              }
            }
          );

          const results = await Promise.all(postToConnectionPromises as any);
          console.log("MAP RESULTS", results);
        } catch (e) {
          console.error(e);
        }
      }
    });

    await Promise.all(recordPromises);
  } catch (err) {
    console.error(err);
  }
}
