import { ReactElement, act } from "react";
import { createRoot, Root } from "react-dom/client";
import ChatInputBar from "./ChatInputBar";

// React 18 warns unless the test runtime opts into act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mount = (ui: ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    rerender(next: ReactElement) {
      act(() => {
        root.render(next);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const field = () => document.querySelector("textarea");

describe("ChatInputBar focus", () => {
  let view: ReturnType<typeof mount>;

  afterEach(() => {
    view?.unmount();
  });

  test("autoFocus puts the cursor in the message field on mount", () => {
    view = mount(
      <ChatInputBar
        value=""
        onChange={() => {}}
        onSend={() => {}}
        placeholder="메시지를 입력하세요..."
        autoFocus
      />
    );
    expect(field()).toBe(document.activeElement);
  });

  test("leaves focus alone when the field opens without autoFocus", () => {
    view = mount(
      <ChatInputBar
        value=""
        onChange={() => {}}
        onSend={() => {}}
        placeholder="메시지를 입력하세요..."
      />
    );
    expect(field()).not.toBe(document.activeElement);
  });

  test("focusNonce moves the cursor to the field for a reply", () => {
    const value = "> 인용\n\n";
    view = mount(
      <ChatInputBar
        value={value}
        onChange={() => {}}
        onSend={() => {}}
        focusNonce={0}
      />
    );
    const input = field();
    expect(input).not.toBe(document.activeElement);

    view.rerender(
      <ChatInputBar
        value={value}
        onChange={() => {}}
        onSend={() => {}}
        focusNonce={1}
      />
    );

    expect(field()).toBe(document.activeElement);
    expect(field()?.selectionStart).toBe(value.length);
  });
});
