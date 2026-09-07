import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

/*
  Import API once so the Axios configuration
  is initialized before the application starts.
*/
import "./utils/api";



ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <React.StrictMode>

    <App />

  </React.StrictMode>

);