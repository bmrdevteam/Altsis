import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import ToolbarContextTabs from "./ToolbarContextTabs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const renderTabs = (
  ui: ReactElement
): { container: HTMLDivElement; unmount: () => void } => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const tab = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll('[role="tab"]')).find(
    (el) => el.textContent === name
  );

describe("ToolbarContextTabs", () => {
  test("shows the table tab outside a table", () => {
    const view = renderTabs(
      <ToolbarContextTabs context="none" tab="format" onChange={() => {}} />
    );
    expect(tab(view.container, "서식")).toBeTruthy();
    expect(tab(view.container, "표")?.getAttribute("aria-selected")).toBe(
      "false"
    );
    expect(tab(view.container, "이미지")).toBeUndefined();
    view.unmount();
  });

  test("shows the image tab while an image is selected", () => {
    const view = renderTabs(
      <ToolbarContextTabs context="image" tab="image" onChange={() => {}} />
    );
    expect(tab(view.container, "이미지")).toBeTruthy();
    expect(tab(view.container, "표")).toBeUndefined();
    view.unmount();
  });
});
