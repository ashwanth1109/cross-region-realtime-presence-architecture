import React, { useState } from "react";
import { Auth } from "aws-amplify";

const App = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: any) {
    event.preventDefault();
    try {
      await Auth.signIn(username, password);
      alert("Logged in");
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
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
