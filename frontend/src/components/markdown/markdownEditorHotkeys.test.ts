import { applyMarkdownEditorHotkey } from "./markdownEditorHotkeys";

const keyEvent = (init: KeyboardEventInit) =>
  new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });

describe("applyMarkdownEditorHotkey", () => {
  test("Ctrl+K opens the link dialog", () => {
    const openLink = jest.fn();
    const event = keyEvent({ key: "k", ctrlKey: true });
    expect(
      applyMarkdownEditorHotkey(event, {
        openLink,
        undo: () => false,
        redo: () => false,
      })
    ).toBe(true);
    expect(openLink).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test("Ctrl+Z undoes on Mac where Mod-z is Cmd+Z", () => {
    const undo = jest.fn(() => true);
    const event = keyEvent({ key: "z", ctrlKey: true });
    expect(
      applyMarkdownEditorHotkey(event, {
        openLink: () => undefined,
        undo,
        redo: () => false,
      })
    ).toBe(true);
    expect(undo).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  test("Ctrl+Shift+Z redoes", () => {
    const redo = jest.fn(() => true);
    const event = keyEvent({ key: "z", ctrlKey: true, shiftKey: true });
    expect(
      applyMarkdownEditorHotkey(event, {
        openLink: () => undefined,
        undo: () => false,
        redo,
      })
    ).toBe(true);
    expect(redo).toHaveBeenCalled();
  });

  test("plain typing keys are not consumed", () => {
    const event = keyEvent({ key: "z" });
    expect(
      applyMarkdownEditorHotkey(event, {
        openLink: () => undefined,
        undo: () => true,
        redo: () => false,
      })
    ).toBe(false);
  });

  test("Cmd+Z is left to TipTap Mod-z", () => {
    const undo = jest.fn(() => true);
    const event = keyEvent({ key: "z", metaKey: true });
    expect(
      applyMarkdownEditorHotkey(event, {
        openLink: () => undefined,
        undo,
        redo: () => false,
      })
    ).toBe(false);
    expect(undo).not.toHaveBeenCalled();
  });
});
