# Cross-region architecture for realtime user presence

## Author

Ashwanth A R

## Demo

Link to DEMO

## Problem Statement

Choosing a topic for open hackathons can be really hard. You can literally start anywhere.
While I was looking for a problem statement, and going through the Rewrite spec for Sococo, I came across this comment:

![Problem Origin](./assets/problem-origin.png)

This looked like a good problem to try, and solve. My initial idea was to create a scalable solution for user presence, and user typing (both being high-velocity updates).

As I started discussing various possible architectures with my SEM, I realized that I had to narrow the scope to something that could be achieved in one week. This is a hard problem to solve, and the idea was not to reach the final solution, but to develop a POC that moves in the direction of enabling us to achieve high-velocity UI updates in realtime.

So, we narrowed down the problem to, "Provide an architecture for serverless realtime 'user presence' that works across 2 regions". The key goals was to keep the solution "serverless", has to be "realtime or near realtime" and has to have the ability to add nodes/endpoints to different regions ("cross-region").

The idea was that this solution could serve as a starting point to provide a solution that could support horizontal scaling, that is we could add more nodes as our load increases and balance the load across these nodes. By having your Route53 route one domain to different services based on geolocation rules and service health checks, this architecture should in theory also enable us to build highly available applications.

## Options considered:

As I experimented with various architectures, I had to compare and make several decisions all across the stack. So, in this section I will break these down into sections/layers in the stack and explain my reasoning behind why I felt an option was more suitable than the others considered.

### Database storage (for keeping track of user presence information persistently)

- **DynamoDB**
- RDS

Our use-case is a pure OLTP requirement, and we have a perfect understanding of our access pattern:
Query -> ListUsersInSpace, Mutations -> CreateUserPresence, DeleteUserPresence, UpdateUserPresence (update for heartbeat). There is no need for any ad-hoc queries, and we want the ability to scale horizontally.

For these reasons, DynamoDB seems like the correct choice.

Reference: [Check out Rick Houlihan's talk at 6:16 for when to use NoSQL](https://youtu.be/6yqfmXiZTlM?t=376)

### Cross-region replication

- **DynamoDB global tables**
- Custom solution with logic that replicates data between tables

DynamoDB gives you a fully managed, multi-region database for massively scaled global applications. They automatically replicated data across regions, resolves update conflicts. Building all of this capability ourself is error-prone, time-consuming, labor-intensive, and adds a lot of maintenance complexity to our services.

DynamoDB global tables are ideal for massively scaled applications with globally dispersed users. In such an environment, users expect very fast application performance. Global tables provide automatic multi-active replication to AWS Regions worldwide. They enable you to deliver low-latency data access to your users no matter where they are located, replication is propagated to all replica tables within seconds. Global tables enable you to read and write your data locally providing single-digit-millisecond latency for your globally distributed application at any scale.

We use global tables `Version 2019.11.21` over `Version 2017.11.29` because this is AWS recommended, enables you to dynamically add new replica tables from a table that is already populated with data, and is more efficient, consumes less write capacity, and has more region support.

The concern/question I have here at this point, is that the replication is specified as eventually-consistent. During my experiments, the replication was almost immediate and reliably consistent, however it is important to note that my experiments were small scale, and I haven't had the opportunity to set up some form of stress testing.

PENDING-TASK: I am currently looking for information on if this could cause potential issues and if there is a way to enable strong-consistency. I will update here once I can find this information.

CDK code for global tables:

```ts
// Cross-region replication of dynamodb tables with stream
const tableName = withEnv("user-presence");
const table = new Table(this, tableName, {
  tableName,
  billingMode: BillingMode.PAY_PER_REQUEST,
  partitionKey: {
    name: "connectionId",
    type: AttributeType.STRING,
  },
  stream: StreamViewType.NEW_AND_OLD_IMAGES,
  replicationRegions: ["ap-south-1"],
});
```

### Expiry of user-presence records

- TTL in DynamoDB
- Heartbeat service with expiry mechanism

## References

- [Building a Multi-Region Serverless App with AWS AppSync](https://iamondemand.com/blog/building-a-multi-region-serverless-app-with-aws-appsync/#:~:text=Building%20a%20Multi%2DRegion%20AppSync%20App&text=Location%2Dbased%20routing%20allows%20me,same%20name%20in%20other%20regions.)
