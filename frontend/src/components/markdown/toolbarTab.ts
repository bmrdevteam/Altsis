export type EditorContext = "none" | "table" | "image";
export type ToolbarTab = "format" | "table" | "image";
export type ToolbarPanel = "format" | "table" | "image";

export function detectEditorContext(input: {
  isImage: boolean;
  isTable: boolean;
}): EditorContext {
  if (input.isImage) return "image";
  if (input.isTable) return "table";
  return "none";
}

/**
 * Auto-switch to table/image when that context is entered.
 * If the user picked 서식 while still in the same context, keep it.
 * Outside a table or image, an explicit 표 choice stays so a table can be inserted.
 */
export function resolveToolbarTab(input: {
  context: EditorContext;
  previousContext: EditorContext;
  tab: ToolbarTab;
}): ToolbarTab {
  const { context, previousContext, tab } = input;
  if (context === "none") {
    if (previousContext === "none" && tab === "table") return "table";
    return "format";
  }
  if (context !== previousContext) return context;
  if (tab === "format" || tab === context) return tab;
  return context;
}

/**
 * 위지윅에서 표 탭은 표 밖에서도 표 도구를 보여 표를 삽입할 수 있다.
 * 이미지를 선택한 동안에는 이미지 도구를 유지한다.
 * 마크다운 분할 화면은 서식 도구만 쓴다.
 */
export function activeToolbarPanel(input: {
  viewMode: "wysiwyg" | "split";
  context: EditorContext;
  tab: ToolbarTab;
}): ToolbarPanel {
  if (input.viewMode !== "wysiwyg") return "format";
  if (input.context === "image" && input.tab !== "format") return "image";
  if (input.tab === "table") return "table";
  return "format";
}
