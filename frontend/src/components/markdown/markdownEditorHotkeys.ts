type MarkdownHotkeyActions = {
  openLink: () => void;
  undo: () => boolean;
  redo: () => boolean;
};

/**
 * 에디터 handleKeyDown용 단축키.
 * Mac에서 Ctrl+Z는 TipTap의 Mod-z(Cmd+Z)가 아니라서 여기서 실행 취소를 연결한다.
 * Windows/Linux의 Ctrl+Z도 여기서 한 번만 처리한다.
 */
export const applyMarkdownEditorHotkey = (
  event: KeyboardEvent,
  actions: MarkdownHotkeyActions
): boolean => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === "k") {
    event.preventDefault();
    actions.openLink();
    return true;
  }
  if (event.ctrlKey && !event.metaKey && key === "z") {
    event.preventDefault();
    return event.shiftKey ? actions.redo() : actions.undo();
  }
  return false;
};
