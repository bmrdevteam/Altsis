import React from "react";
import ReactDOM from "react-dom/client";
import "./style/commons.scss";
import "./style/variables.scss"
import RouterPage from "./RouterPage";
import { AuthProvider } from "./contexts/authContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <RouterPage />
    </AuthProvider>
  </React.StrictMode>
);
