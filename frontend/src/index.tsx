import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.scss";
import "./style/variables.scss";
import "./style/fonts.scss";
import RouterPage from "./routes/RouterPage";
import { AuthProvider } from "./contexts/authContext";
import { CookiesProvider } from "react-cookie";
import { ThemeProvider } from "./contexts/themeContext";
import { installTabResumeReload } from "./utils/tabResume";

/* config */
globalThis.SUCCESS_MESSAGE = "성공적으로 처리되었습니다🚀";

installTabResumeReload();

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  // <React.StrictMode>
  <CookiesProvider>
    <AuthProvider>
      <ThemeProvider>
        <RouterPage />
      </ThemeProvider>
    </AuthProvider>
  </CookiesProvider>
  // </React.StrictMode>
);

// Web Push용 Service Worker (구독은 설정에서 옵트인)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW 미지원/등록 실패는 무시 (인앱 알림은 동작)
    });
  });

  // 잠금화면 알림 클릭 시 이미 열린 탭으로 딥링크 전달
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "NOTIFICATION_CLICK" || !event.data?.url) return;
    try {
      const target = new URL(event.data.url, window.location.origin);
      if (target.origin !== window.location.origin) return;
      const next = `${target.pathname}${target.search}${target.hash}`;
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
        window.location.assign(next);
      }
    } catch {
      // ignore malformed urls
    }
  });
}
