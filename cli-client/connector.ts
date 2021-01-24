import * as WebSocket from "ws";

try {
  const ws = new WebSocket(
    "wss://pnfma0m4jh.execute-api.us-east-1.amazonaws.com/Prod"
  );

  ws.on("open", (e) => {
    console.log("Socket onopen fired", e);
    const message = JSON.stringify({
      action: "sendmessage",
      data: JSON.stringify({
        timestamp: Date.now(),
      }),
    });

    ws.send(message);
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
