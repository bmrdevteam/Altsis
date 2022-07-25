import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.scss";
import "./style/variables.scss";
import "./style/fonts.scss";
import RouterPage from "./RouterPage";
import { AuthProvider } from "./contexts/authContext";
import { SidebarProvider } from "./contexts/sidebarContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SidebarProvider>
        <RouterPage />
      </SidebarProvider>
    </AuthProvider>
  </React.StrictMode>
);
