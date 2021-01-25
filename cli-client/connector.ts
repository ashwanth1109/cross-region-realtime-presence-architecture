import * as WebSocket from "ws";
require("dotenv").config();

try {
  console.log(process.env.WSS_URL);
  const ws = new WebSocket(process.env.WSS_URL);

  ws.on("open", (e) => {
    console.log("Socket onopen fired", e);
    ws.send(
      JSON.stringify({
        action: "heartbeat",
        data: JSON.stringify({
          timestamp: Date.now(),
        }),
      })
    );
  });

  ws.on("message", (e) => {
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
