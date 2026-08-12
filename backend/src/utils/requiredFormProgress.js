/**
 * Required Alt Form progress helper (shared by schoolTodos / goals)
 */

import {
  getAltBoardRole,
  getRequiredResponseCount,
  hasSubmittedForList,
  isFormRequiredMode,
  isWithinFormPeriod,
} from "../services/altForms.js";

/**
 * 필수 양식 진행도: 분모=대상 필수 양식 수, 분자=제출 완료 수
 *
 * @param {Object} params
 * @returns {{ submitted: number, total: number }}
 */
export const countRequiredFormProgress = ({
  boards,
  forms,
  myRows,
  user,
  now = new Date(),
}) => {
  const detail = listRequiredFormProgress({
    boards,
    forms,
    myRows,
    user,
    now,
  });
  return { submitted: detail.submitted, total: detail.total };
};

/**
 * 전체 + 양식별 진행도
 * - 전체: 제출 완료 양식 수 / 필수 양식 수
 * - 양식: 제출 횟수 / 목표 제출 횟수 (단수는 0|1 / 1)
 *
 * @returns {{
 *   submitted: number,
 *   total: number,
 *   forms: { formId: string, boardId: string, title: string, submitted: number, required: number }[]
 * }}
 */
export const listRequiredFormProgress = ({
  boards,
  forms,
  myRows,
  user,
  now = new Date(),
}) => {
  const formsByBoard = new Map();
  for (const form of forms) {
    const bid = form.board?.toString?.() ?? String(form.board);
    if (!formsByBoard.has(bid)) formsByBoard.set(bid, []);
    formsByBoard.get(bid).push(form);
  }

  const rowsByForm = new Map();
  for (const row of myRows) {
    const fid = row.form?.toString?.() ?? String(row.form);
    if (!rowsByForm.has(fid)) rowsByForm.set(fid, []);
    rowsByForm.get(fid).push(row);
  }

  let submitted = 0;
  let total = 0;
  const formProgress = [];

  for (const board of boards) {
    const boardId = board._id?.toString?.() ?? String(board._id);
    const altRole = getAltBoardRole(board, user);
    if (!altRole) continue;

    const boardForms = formsByBoard.get(boardId) || [];
    for (const form of boardForms) {
      if (!isFormRequiredMode(form)) continue;
      if (form.settings?.directInputMode) continue;
      if (!isWithinFormPeriod(form, now)) continue;

      const formId = form._id?.toString?.() ?? String(form._id);
      const formMyRows = rowsByForm.get(formId) || [];
      const done = hasSubmittedForList(form, formMyRows);
      total += 1;
      if (done) submitted += 1;

      const multiTarget = getRequiredResponseCount(form);
      const required = multiTarget != null ? multiTarget : 1;
      const responseCount = formMyRows.length;
      formProgress.push({
        formId,
        boardId,
        title: form.title || "양식",
        submitted: Math.min(responseCount, required),
        required,
      });
    }
  }

  return { submitted, total, forms: formProgress };
};
