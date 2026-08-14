/**
 * AltSheetRow 제출본 vs 응답 초안(isDraft) 구분.
 * AltForm.isDraft(양식 비공개)와 다른 개념이다.
 *
 * 구 문서에 isDraft 필드가 없으면 제출본으로 취급한다.
 */

/** 활성 제출본만 (집계·시트·할 일·정원). 초안 제외 */
export const submittedSheetRowFilter = () => ({
  isActive: true,
  isDraft: { $ne: true },
});

/** 응답 초안 행인가 (양식 AltForm.isDraft와 무관) */
export const isDraftSheetRow = (row) => !!row?.isDraft;

/** 제출된 응답 행인가. 필드 없는 구 문서는 제출 */
export const isSubmittedSheetRow = (row) => !!row && !row.isDraft;

export const splitSheetRows = (rows = []) => {
  const draftRows = [];
  const submittedRows = [];
  for (const row of rows) {
    if (isDraftSheetRow(row)) draftRows.push(row);
    else submittedRows.push(row);
  }
  return { draftRows, submittedRows };
};
