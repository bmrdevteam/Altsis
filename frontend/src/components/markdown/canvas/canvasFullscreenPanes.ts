/** 캔버스 전체화면에서 에디터·미리보기 패널을 켤지 결정한다. */
export function canvasFullscreenPanes(
  editorSelected: boolean,
  previewSelected: boolean
): { showEditor: boolean; showPreview: boolean } {
  if (!editorSelected && !previewSelected) {
    return { showEditor: false, showPreview: true };
  }
  return {
    showEditor: editorSelected,
    showPreview: previewSelected,
  };
}
