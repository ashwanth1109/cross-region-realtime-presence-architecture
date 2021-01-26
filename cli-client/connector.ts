import * as WebSocket from "ws";
require("dotenv").config();

const SPACE_001 = "Space#001";
const USER_001 = "User#001";

try {
  console.log(process.env.WSS_URL);
  const ws = new WebSocket(process.env.WSS_URL, {
    headers: {
      spaceId: SPACE_001,
      userId: USER_001,
    },
  });

  ws.on("open", (e) => {
    console.log("Socket onopen fired", e);

    // ws.send(
    //   JSON.stringify({
    //     action: "heartbeat",
    //     payload: JSON.stringify({
    //       timestamp: Date.now(),
    //     }),
    //   })
    // );
    // setTimeout(() => {
    //   console.log("inside timeout");
    // }, 2000);
  });

  ws.on("heartbeat", (e) => {
    console.log("Socket onmessage fired", e);

    ws.close();
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
