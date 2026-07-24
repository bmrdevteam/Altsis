/**
 * Pure school-todos assembly (no DB) — used by service + unit tests
 */

import {
  getAltBoardRole,
  hasSubmittedForList,
  isFormRequiredMode,
  getRequiredResponseCount,
} from "../services/altForms.js";
import {
  isCurrentApprover,
  normalizeApprovalValue,
} from "./approvalLine.js";

/**
 * @param {Array} todos
 * @returns {Array}
 */
export const sortSchoolTodos = (todos) => {
  const kindRank = { approve: 0, outgoing: 1, unsubmitted: 2 };
  return [...todos].sort((a, b) => {
    const kr = (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9);
    if (kr !== 0) return kr;
    const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bt - at;
  });
};

/**
 * 메모리에서 할 일 항목 조립
 *
 * @param {Object} params
 * @param {Object[]} params.boards - accessible boards
 * @param {Object[]} params.forms
 * @param {Object[]} params.myRows
 * @param {Object[]} params.approverRows
 * @param {Object} params.user - req.user
 * @param {Date} [params.now]
 * @returns {Object[]}
 */
export const assembleSchoolTodos = ({
  boards,
  forms,
  myRows,
  approverRows,
  user,
  now = new Date(),
}) => {
  const formsByBoard = new Map();
  for (const form of forms) {
    const bid = form.board.toString();
    if (!formsByBoard.has(bid)) formsByBoard.set(bid, []);
    formsByBoard.get(bid).push(form);
  }

  const myRowsByForm = new Map();
  for (const row of myRows) {
    const fid = row.form.toString();
    if (!myRowsByForm.has(fid)) myRowsByForm.set(fid, []);
    myRowsByForm.get(fid).push(row);
  }

  const approverRowsByForm = new Map();
  for (const row of approverRows) {
    const fid = row.form.toString();
    if (!approverRowsByForm.has(fid)) approverRowsByForm.set(fid, []);
    approverRowsByForm.get(fid).push(row);
  }

  const todos = [];

  for (const board of boards) {
    const boardId = board._id;
    const boardIdStr = boardId.toString();
    const boardTitle = board.name;
    const boardForms = formsByBoard.get(boardIdStr) || [];
    if (!boardForms.length) continue;

    const altRole = getAltBoardRole(board, user);

    for (const form of boardForms) {
      const formId = form._id;
      const formIdStr = formId.toString();
      const formMyRows = myRowsByForm.get(formIdStr) || [];
      const approvalFields = (form.fields || []).filter(
        (f) => f.type === "approval"
      );

      if (approvalFields.length > 0) {
        const formApproverRows = approverRowsByForm.get(formIdStr) || [];

        for (const row of formApproverRows) {
          for (const field of approvalFields) {
            const fid = field._id.toString();
            const raw = row.data?.[fid];
            if (!isCurrentApprover(raw, user.userId, field)) continue;
            const normalized = normalizeApprovalValue(raw, field);
            todos.push({
              kind: "approve",
              boardId,
              boardTitle,
              formId,
              formTitle: form.title,
              rowId: row._id,
              fieldId: fid,
              fieldLabel: field.label,
              stepLabel: normalized?.steps?.[normalized.currentStep]?.label,
              respondentName: row._respondentName,
              respondentId: row._respondentId,
              submittedAt: row._submittedAt || row.createdAt,
            });
          }
        }

        for (const row of formMyRows) {
          for (const field of approvalFields) {
            const fid = field._id.toString();
            const raw = row.data?.[fid];
            if (isCurrentApprover(raw, user.userId, field)) continue;
            const normalized = normalizeApprovalValue(raw, field);
            if (!normalized || normalized.overallStatus !== "pending") {
              continue;
            }
            const step = normalized.steps?.[normalized.currentStep];
            const currentStep =
              typeof normalized.currentStep === "number"
                ? normalized.currentStep
                : 0;
            const totalSteps = normalized.steps?.length || 0;
            todos.push({
              kind: "outgoing",
              boardId,
              boardTitle,
              formId,
              formTitle: form.title,
              rowId: row._id,
              fieldId: fid,
              fieldLabel: field.label,
              stepLabel: step?.label,
              currentApproverName: step?.approver?.userName,
              currentApproverId: step?.approver?.userId,
              currentStep,
              totalSteps,
              progress:
                totalSteps > 0
                  ? `${Math.min(currentStep + 1, totalSteps)}/${totalSteps}`
                  : undefined,
              submittedAt: row._submittedAt || row.createdAt,
            });
          }
        }
      }

      if (!altRole) continue;
      if (!isFormRequiredMode(form)) continue;
      if (form.settings?.directInputMode) continue;
      if (form.settings?.closeAt && new Date(form.settings.closeAt) < now) {
        continue;
      }
      if (form.settings?.openAt && new Date(form.settings.openAt) > now) {
        continue;
      }
      if (hasSubmittedForList(form, formMyRows)) continue;

      const target = getRequiredResponseCount(form);
      todos.push({
        kind: "unsubmitted",
        boardId,
        boardTitle,
        formId,
        formTitle: form.title,
        myResponseCount: formMyRows.length,
        requiredResponseCount: target,
        progress:
          target != null ? `${formMyRows.length}/${target}` : undefined,
      });
    }
  }

  return sortSchoolTodos(todos);
};
