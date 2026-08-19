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
 */
export function resolveToolbarTab(input: {
  context: EditorContext;
  previousContext: EditorContext;
  tab: ToolbarTab;
}): ToolbarTab {
  const { context, previousContext, tab } = input;
  if (context === "none") return "format";
  if (context !== previousContext) return context;
  if (tab === "format" || tab === context) return tab;
  return context;
}

export function activeToolbarPanel(input: {
  viewMode: "wysiwyg" | "split";
  context: EditorContext;
  tab: ToolbarTab;
}): ToolbarPanel {
  if (input.viewMode !== "wysiwyg") return "format";
  if (input.tab === "table" && input.context === "table") return "table";
  if (input.tab === "image" && input.context === "image") return "image";
  return "format";
}
