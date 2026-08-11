import React, { Component, ErrorInfo, ReactNode } from "react";
import style from "./errorBoundary.module.scss";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * 렌더 크래시 시 흰 화면 대신 복구 UI를 보여준다.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={style.root} role="alert">
          <h1 className={style.title}>화면을 표시하지 못했습니다</h1>
          <p className={style.message}>
            일시적인 오류일 수 있습니다. 다시 불러와 주세요.
          </p>
          <button
            type="button"
            className={style.button}
            onClick={this.handleReload}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
