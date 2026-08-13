import React, { Component, ErrorInfo, ReactNode } from "react";
import { redirectToLogin } from "utils/sessionExpiry";
import style from "./AppErrorBoundary.module.scss";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Last-resort UI when a render crash would otherwise leave a blank white page.
 */
class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className={style.wrap} role="alert">
        <h1 className={style.title}>화면을 표시할 수 없습니다</h1>
        <p className={style.body}>
          세션이 만료되었거나 일시적인 오류가 발생했을 수 있습니다. 새로고침하거나
          다시 로그인해 주세요.
        </p>
        <div className={style.actions}>
          <button
            type="button"
            className={style.secondary}
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
          <button
            type="button"
            className={style.primary}
            onClick={() => redirectToLogin()}
          >
            로그인 화면으로
          </button>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
