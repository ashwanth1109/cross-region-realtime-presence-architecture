import { Amplify } from "aws-amplify";
import React from "react";
import ReactDOM from "react-dom";

import App from "./App";
import config from "./aws-exports";

Amplify.configure({
  Auth: {
    mandatorySignIn: true,
    region: config.region,
    userPoolId: config.user_pool_id,
    identityPoolId: config.identity_pool_id,
    userPoolWebClientId: config.app_client_id,
  },
});

ReactDOM.render(<App />, document.getElementById("root"));
