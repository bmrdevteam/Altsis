import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.scss";
import "./style/variables.scss";
import "./style/fonts.scss";
import RouterPage from "./routes/RouterPage";
import { AuthProvider } from "./contexts/authContext";
import { CookiesProvider } from "react-cookie";
import { ThemeProvider } from "./contexts/themeContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  // <React.StrictMode>

  <AuthProvider>
    <ThemeProvider>
      <CookiesProvider>
        <RouterPage />
      </CookiesProvider>
    </ThemeProvider>
  </AuthProvider>
  // </React.StrictMode>
);
