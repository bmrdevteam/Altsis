import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.scss";
import "./style/variables.scss";
import "./style/fonts.scss";
import RouterPage from "./routes/RouterPage";
import { AuthProvider } from "./contexts/authContext";
import { CookiesProvider } from "react-cookie";
import { ThemeProvider } from "./contexts/themeContext";

/* config */
globalThis.SUCCESS_MESSAGE = "성공적으로 처리되었습니다";

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
