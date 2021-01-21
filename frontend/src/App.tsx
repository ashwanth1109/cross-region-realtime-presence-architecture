import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import config from "./aws-exports";

const App = () => {
  const [isAuthenticated, userHasAuthenticated] = useState<null | string>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  async function handleSubmit(event: any) {
    event.preventDefault();
    try {
      const user = await Auth.signIn(username, password);
      console.log(user);
      userHasAuthenticated(user.username);
    } catch (e) {
      alert(e.message);
    }
  }

  const constructMessage = (timestamp: number, type: string) => {
    return JSON.stringify({
      action: "sendmessage",
      data: JSON.stringify({
        type,
        timestamp,
        username: isAuthenticated,
      }),
    });
  };

  const startTyping = () => {
    // start typing
    const timestamp = Date.now();
    console.log("Started typing at", timestamp);
    socket?.send(constructMessage(timestamp, "START_TYPING"));
  };

  const stopTyping = () => {
    // stop typing
    const timestamp = Date.now();
    console.log("Stopped typing at", timestamp);
    socket?.send(constructMessage(timestamp, "STOP_TYPING"));
  };

  useEffect(() => {
    if (isAuthenticated) {
      // connect websocket
      const newSocket: WebSocket = new WebSocket(config.ws_url);
      setSocket(newSocket);
      newSocket.onopen = (e) => {
        console.log("Socket onopen fired", e);
      };
      newSocket.onmessage = (e) => {
        console.log("Socket onmessage fired", e);
      };
      newSocket.onclose = (e) => {
        console.log("Socket onclose fired", e);
      };
      newSocket.onerror = (e) => {
        console.log("Socket onerror fired", e);
      };
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return (
      <div>
        <h1>User is authenticated.</h1>
        <button onClick={startTyping}>Start typing</button>
        <button onClick={stopTyping}>Stop typing</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Login form</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label style={{ paddingRight: "16px" }} htmlFor="username">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label style={{ paddingRight: "16px" }} htmlFor="password">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default App;
