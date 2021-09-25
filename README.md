# Cross-region architecture for realtime user presence

## Author, Date

Ashwanth A R (Jan, 2021)

## Demo

[Link to DEMO](https://drive.google.com/file/d/1aS3WK-QlGSxvdri1eEXiaAc8nXdO57-U/view?usp=sharing)

## Problem Statement

Provide a cross-region architecture for user-presence implementation.

The idea was that this solution could serve as a starting point towards an architecture that could support horizontal scaling, that is we could add more nodes as our load increases and balance the load across these nodes. By having Route53 route one domain to different services based on geolocation rules and service health checks, this architecture should in theory also enable us to also build highly available applications.

## Important Technical Decisions:

### ITD - Use dynamoDB global tables `Version 2019.11.21` for storing user presence persistently across regions

#### The Problem

We need some storage for UserPresence entities that must be available across regions.

#### Options Considered

- **Use dynamoDB global tables `Version 2019.11.21` for storing user presence entities persistently across regions**
- Use dynamoDB global tables `Version 2017.11.29` for storing user presence entities persistently across regions
- Use RDS with cross-region replication for storing user presence entities persistently across regions

#### Reasoning

Our use-case is a pure OLTP requirement, and we have a perfect understanding of our access pattern:
Query -> ListUsersInSpace, Mutations -> CreateUserPresence, DeleteUserPresence, UpdateUserPresence (update for heartbeat). There is no need for any ad-hoc queries, and we want the ability to scale horizontally.

For these reasons, DynamoDB seems like the correct choice.

Reference for this reasoning: [Check out Rick Houlihan's talk at 6:16 for when to use NoSQL](https://youtu.be/6yqfmXiZTlM?t=376)

DynamoDB gives you a fully managed, multi-region database for massively scaled global applications. Global tables automatically replicate data across regions, and resolve update conflicts. Building all of this capability on our own is error-prone, time-consuming, labor-intensive, and adds a lot of maintenance complexity to our services. Global tables enable you to deliver low-latency data access to your users no matter where they are located, and replication is propagated to all replica tables within seconds.

We use global tables `Version 2019.11.21` over `Version 2017.11.29` because this is AWS recommended, enables you to dynamically add new replica tables from a table that is already populated with data, is more efficient, consumes less write capacity, and has more support for regions.

### ITD - Use AWS WebSocket API to interface with a pub-sub service

#### The Problem

When a user comes online, we need to create a UserPresence entity in database. If there are any realtime notifications (e.g. user is talking/typing) in the pub-sub service, they must be received by the user (consumer) and similarly the user should be able to publish notifications to the pub-sub service via this channel (producer). When a user drops off, the UserPresence entity for that user in database must be deleted. Thus, we need a two-way communication channel like a WebSocket that interfaces with the pub-sub service.

#### Options Considered

- **Use AWS WebSocket API to interface with a pub-sub service**
- Use third-party libraries to write our own websocket server

#### Reasoning

Our preferred approach is to use AWS managed services wherever possible. The AWS CDK for WebSockets is yet to provide high-level APIs for the creation of such an API, but the low-level APIs that we currently have access to are more than sufficient to set up the API from CloudFormation. With the AWS WebSocket API it is incredibly simple to set up a websocket service that invokes lambdas for connect, disconnect and any other custom routes. The websocket channel can then be used to interface with a pub-sub mechanism as per our need.

### ITD - Use ApiGatewayManagement API inside Lambda functions directly as our pub-sub mechanism

#### The Problem

User presence requires some form of publish and subscribe service to announce users coming online or going offline. The same pub-sub service will also be used to notify high-velocity updates (like user is typing/talking) to all active websocket connections.

#### Options Considered

- **Use ApiGatewayManagement API inside Lambda functions directly as our pub-sub mechanism**
- Use WebSocket API interfaced to ElastiCache (redis/memcached) cluster which is our pub-sub service
- Use AppSync subscriptions to keep track of 'UserPresence' mutations and publish these events to all subscribed clients

#### Reasoning

Although you could create multiple AppSync APIs for multiple regions, subscriptions are fired based on mutations. So mutations processed in API of one region will only trigger notifications for active subscriptions in that region. AppSync is not built to handle multi-region application design, so horizontally scaling AppSync APIs is not feasible at the moment. You can see more information about this in the [AWS support case here](https://console.aws.amazon.com/support/home#/case/?displayId=7912149581&language=en) or [this forum post here](https://forums.aws.amazon.com/thread.jspa?threadID=296743). We can currently only build multi-region AppSync APIs if our use case does not have a need for subscriptions, but rather only queries and mutations. [An example architecture for this can be found here](https://iamondemand.com/blog/building-a-multi-region-serverless-app-with-aws-appsync/#:~:text=Building%20a%20Multi%2DRegion%20AppSync%20App&text=Location%2Dbased%20routing%20allows%20me,same%20name%20in%20other%20regions.)

ElastiCache cluster as a pub-sub service is still very much a viable solution and could result in better latencies. But since the goal was to keep the solution serverless and with the intention of not adding system complexity unless absolutely required, we choose not to go with this option. With the current chosen option, we still get latencies in the order of a few seconds (~ 1 to 3s), and the solution is still serverless. The current solution could also result in lower costs since its on-demand, although this is not a factor that affected the decision itself.

Should there be a need for an architecture with even lower latencies, you can check out how to implement such an architecture [here](https://d1.awsstatic.com/architecture-diagrams/ArchitectureDiagrams/large-scale-messaging-for-multiplayer-games-ra.pdf?did=wp_card&trk=wp_card) or [here](https://www.slideshare.net/AmazonWebServices/building-realtime-applications-with-amazon-elasticache-adb204-anaheim-aws-summit).

For these reasons we use the ApiGatewayManagement API inside our connect$/disconnect$ Lambda functions to publish notifications to consumers (or subscribers) to the WebSocket API Gateway.

### ITD - Use DynamoDB streams and AWS Lambda Triggers to publish notifications from API in region 1 with clients subscribed to API in region 2

#### The Problem

Clients in region 1 would be connected to the WebSocket API in region 1 and clients in region 2 would be connected to the WebSocket API in region 2. With DynamoDB global tables our data (UserPresence entities) is automatically replicated across regions. But we need some way to publish notifications from API in region 1 to the WebSocket APIs in other regions, so that clients subscribed to these APIs also receive realtime notifications (i.e. user came online or went offline).

#### Options Considered

- **Use DynamoDB streams and AWS Lambda Triggers to publish notifications from API in region 1 with clients subscribed to API in region 2**
- Use the connect$/disconnect$ lambda in region 1 to directly publish notifications to all clients subscribed to API in region 2

#### Reasoning

We want to ensure that there are no race conditions between when the notification is received by users connected to the WebSocket API in region 2 to when the data is replicated in the database in region 2 . Hence, the 2nd option is not the way to go.

DynamoDB stream which replicates data from ddb in one region to another can be used as a trigger to invoke a lambda. In this lambda we publish the notifications (that user has come online or gone offline) to clients that are connected on websocket API in region 2.

### ITD - Use heartbeat service with expiry mechanism to delete stale UserPresence records

#### The Problem

On disconnecting the websocket connection, the disconnect$ lambda removes the UserPresence entry from our DynamoDB table. However, the disconnect$ lambda is invoked on a best effort basis, and there are situations where it does not fire. So, we need some way to expire our UserPresence records from the DynamoDB table.

#### Options Considered

- **Use heartbeat service with expiry mechanism to delete stale UserPresence records**
- Use TTL in DynamoDB records to delete stale UserPresence records

#### Reasoning

When we use TTL in DynamoDB records, the promise from AWS is that items are typically deleted within 48 hours of expiration on a best-effort basis to ensure availability of throughput for other data operations. This makes it unsuitable for realtime requirements like UserPresence.

Reference to [AWS Support case here](https://console.aws.amazon.com/support/home#/case/?displayId=7907906101&language=en).

The option that should be considered here, is to have a heartbeat service where a user that is online will constantly invoke a heartbeat lambda (lightweight) once every n seconds (say 30s). Each heartbeat lambda invocation creates a `delayed trigger` (using AWS Step Functions or SNS) that is scheduled to run after 2 heart beat durations and exits. The next heartbeat lambda will cancel all previously scheduled `delayed trigger` lambdas. 

If 2 consecutive heartbeat lambdas are not invoked, then the `delayed trigger` lambda will run as per schedule and delete the UserPresence entity from the DynamoDB table and publish notifications to all subscribers that this user has gone offline.

This is similar to the architecture that is currently implemented for LinkedIns realtime presence platform at scale. Reference to [this architecture here](https://engineering.linkedin.com/blog/2018/01/now-you-see-me--now-you-dont--linkedins-real-time-presence-platf)

## References

- [Announcing WebSocket APIs in Amazon API Gateway](https://aws.amazon.com/blogs/compute/announcing-websocket-apis-in-amazon-api-gateway/#:~:text=The%20application%20is%20composed%20of,send%20messages%20to%20the%20server.)
- [Massive Scale Real-Time Messaging for Multiplayer Games](https://d1.awsstatic.com/architecture-diagrams/ArchitectureDiagrams/large-scale-messaging-for-multiplayer-games-ra.pdf?did=wp_card&trk=wp_card)
- [Real-Time Live Sports Updates Using AWS AppSync](https://aws.amazon.com/solutions/implementations/real-time-live-sports-updates-using-aws-appsync/)
- [Design Facebook News Feed](https://www.algoexpert.io/systems/workspace/Design%20Facebook%20News%20Feed)
- [Build a Real-Time Serverless Web Application with AWS](https://blog.theodo.com/2019/07/build-a-real-time-serverless-web-application-with-aws/)
- [Building a real-time stock monitoring dashboard with AWS AppSync](https://aws.amazon.com/blogs/mobile/building-a-real-time-stock-monitoring-dashboard-with-aws-appsync/)
- [Building a Multi-Region Serverless App with AWS AppSync](https://iamondemand.com/blog/building-a-multi-region-serverless-app-with-aws-appsync/#:~:text=Building%20a%20Multi%2DRegion%20AppSync%20App&text=Location%2Dbased%20routing%20allows%20me,same%20name%20in%20other%20regions.)
- [Amazon DynamoDB Labs](https://amazon-dynamodb-labs.com/)
- [LinkedIn’s Real-Time Presence Platform](https://engineering.linkedin.com/blog/2018/01/now-you-see-me--now-you-dont--linkedins-real-time-presence-platf)
- [Serverless Architecture for Global Applications](https://d1.awsstatic.com/architecture-diagrams/ArchitectureDiagrams/serverless-architecture-for-global-applications-ra.pdf?did=wp_card&trk=wp_card)
- [Replication delay on my DynamoDB global table](https://aws.amazon.com/premiumsupport/knowledge-center/replication-delay-global-table-dynamodb/)
- [Architecture of LinkedIn’s Real-Time Messaging Platform](https://www.infoq.com/podcasts/linkedin-realtime-messaging-architecture/)
- [Building a Real-time WebSocket Client](https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html)
