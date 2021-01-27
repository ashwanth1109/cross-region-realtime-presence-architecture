import WebSocket from "ws";

const WSS_URL = process.env.WSS_URL || "";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handler(event: any) {
  console.log("Agent started");
  const { spaceId, userId } = event;
  console.log(WSS_URL);
  console.log(WebSocket);

  const ws = new WebSocket(WSS_URL, {
    headers: { spaceId, userId },
  });

  ws.on("open", (e: any) => {
    console.log("Socket onopen fired", e);
  });

  ws.on("message", (e: any) => {
    console.log("Socket onmessage fired", e);
  });

  ws.on("close", (e) => {
    console.log("Socket onclose fired", e);
  });

  ws.on("error", (e) => {
    console.log("Socket onerror fired", e);
  });

  await sleep(10_000);
  ws.close(1000);
}
