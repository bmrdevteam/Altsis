/**
 * 승인·회람 알림 클릭 시 해당 시트 행을 여는 경로.
 * formId가 있으면 문서 보기 딥링크, 없으면 할 일 팝업 안전망.
 */
export function altSheetRowNotificationPath(params: {
  boardId: string;
  rowId: string;
  formId?: string | null;
}): string {
  const boardId = encodeURIComponent(String(params.boardId ?? ""));
  const rowId = encodeURIComponent(String(params.rowId ?? ""));
  const formIdRaw = params.formId != null ? String(params.formId).trim() : "";
  if (formIdRaw) {
    const formId = encodeURIComponent(formIdRaw);
    return `/boards/${boardId}?sheet=${formId}&row=${rowId}#활동`;
  }
  return `/boards/${boardId}?approval=${rowId}#활동`;
}
