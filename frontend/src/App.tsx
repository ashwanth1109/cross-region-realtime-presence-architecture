import React, { useState, useEffect } from "react";
import { Auth, API, graphqlOperation } from "aws-amplify";
import config from "./aws-exports";
import Avatar from "./Avatar";
import { Observable } from "rxjs";

const onCreateUserPresence = `
  subscription OnCreateUserPresence($spaceId: String!) {
    onCreateUserPresence(spaceId: $spaceId) {
      connectionId
    }
  }
`;

const App = () => {
  const [isAuthenticated, userHasAuthenticated] = useState<null | string>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isOnline, setIsOnline] = useState(false);

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
      action: "heartbeat",
      data: JSON.stringify({
        type,
        timestamp,
        username: isAuthenticated,
      }),
    });
  };

  useEffect(() => {
    console.log("onCreateUserPresence useEffect");
    const observable = (API.graphql(
      graphqlOperation(onCreateUserPresence, {
        spaceId: "Space#001",
      })
    ) as unknown) as Observable<object>;

    const subscription = observable.subscribe({
      next: (val) => console.log("Subscription fired", val),
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline) {
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
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) {
      socket?.close();
    }
  }, [isOnline, socket]);

  if (isAuthenticated) {
    return (
      <div>
        <h1>{isAuthenticated} is authenticated.</h1>
        <div>
          <Avatar />
        </div>
        <button onClick={() => setIsOnline(true)}>Go online</button>
        <button onClick={() => setIsOnline(false)}>Go offline</button>
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
