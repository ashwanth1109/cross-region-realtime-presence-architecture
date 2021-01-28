import * as WebSocket from "ws";
require("dotenv").config();

const SPACE_001 = "Space#001";
const USER_001 = "User#001";
const USER_002 = "User#002";

let totalLatency = 0;
let numberOfUsers = 0;

try {
  const url = process.env[`WSS_URL${process.argv[2]}`];
  console.log(url);
  const ws = new WebSocket(url, {
    headers: {
      spaceId: SPACE_001,
      userId: process.argv[3] === "1" ? USER_001 : USER_002,
      timestamp: Date.now(),
    },
  });

  ws.on("open", (e) => {
    console.log("Socket onopen fired", e);
  });

  ws.on("message", (e: string) => {
    console.log("Socket onmessage fired", e);

    const payload = JSON.parse(e);
    if (payload?.timestamp) {
      const latency = Date.now() - payload.timestamp;
      console.log("Latency:", latency);
      totalLatency += latency;
      console.log(
        "Average Latency:",
        Math.ceil(totalLatency / ++numberOfUsers)
      );
    }
  });

  ws.on("close", (e) => {
    console.log("Socket onclose fired", e);
  });

  ws.on("error", (e) => {
    console.log("Socket onerror fired", e);
  });
} catch (e) {
  console.error(e);
}
