import React, { useState } from "react";
import { Auth } from "aws-amplify";

const App = () => {
  const [isAuthenticated, userHasAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: any) {
    event.preventDefault();
    try {
      const user = await Auth.signIn(username, password);
      console.log(user);
      userHasAuthenticated(true);
    } catch (e) {
      alert(e.message);
    }
  }

  if (isAuthenticated) {
    return (
      <div>
        <h1>User is authenticated.</h1>
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
