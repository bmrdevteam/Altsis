/**
 * Required Alt Form progress helper (shared by schoolTodos / goals)
 */

import {
  getAltBoardRole,
  getRequiredResponseCount,
  hasSubmittedForList,
  isFormRequiredMode,
  isFormRespondent,
  isWithinFormPeriod,
} from "../services/altForms.js";
import { isSubmittedSheetRow } from "./sheetRowQuery.js";

const CHECKBOX_PROGRESS_MIN = 2;

const isRespondentChoiceField = (field) =>
  !!field &&
  field.permission !== "owner" &&
  (field.type === "checkbox" || field.type === "multiSelect");

/**
 * 응답자용 체크박스·다중선택 문항 (owner 전용 제외)
 * @param {Object} form
 * @returns {Array}
 */
export const respondentCheckboxFields = (form) =>
  (form?.fields || []).filter((field) => isRespondentChoiceField(field));

const optionTokens = (value) => {
  if (value == null || value === "" || value === false) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === true) return [];
  return [String(value)];
};

/** 진행 칸: boolean 체크박스는 문항 1칸, multiSelect는 선택지 1칸 */
const checkboxProgressUnits = (form) => {
  const units = [];
  for (const field of form?.fields || []) {
    if (!isRespondentChoiceField(field)) continue;
    if (field.type === "multiSelect") {
      const options = (field.options || []).map(String).filter(Boolean);
      for (const option of options) {
        units.push({
          key: `ms:${field._id}:${option}`,
          fieldId: field._id,
          kind: "multiSelect",
          option,
        });
      }
      continue;
    }
    units.push({
      key: `cb:${field._id}`,
      fieldId: field._id,
      kind: "checkbox",
    });
  }
  return units;
};

const isUnitChecked = (unit, data) => {
  const raw = data?.[unit.fieldId];
  if (unit.kind === "checkbox") return raw === true;
  return optionTokens(raw).includes(unit.option);
};

const rowSubmittedAtMs = (row) => {
  if (!row?._submittedAt) return 0;
  const ms = new Date(row._submittedAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const latestSubmittedRow = (rows) => {
  let latest = null;
  for (const row of rows) {
    if (!latest || rowSubmittedAtMs(row) >= rowSubmittedAtMs(latest)) {
      latest = row;
    }
  }
  return latest;
};

/**
 * 체크박스 진행: 체크된 칸 / 전체 칸.
 * boolean 체크박스 + 양식 도구 「체크박스」(multiSelect 선택지).
 * 칸이 2개 미만이면 null.
 *
 * @param {Object} form
 * @param {Array} rows
 * @returns {{ submitted: number, required: number }|null}
 */
export const countCheckboxFieldProgress = (form, rows = []) => {
  const units = checkboxProgressUnits(form);
  const required = units.length;
  if (required < CHECKBOX_PROGRESS_MIN) return null;

  const submittedRows = rows.filter((row) => isSubmittedSheetRow(row));
  const checked = new Set();

  const countRow = (row) => {
    const data = row?.data || {};
    for (const unit of units) {
      if (isUnitChecked(unit, data)) checked.add(unit.key);
    }
  };

  if (form?.settings?.allowMultipleResponses) {
    for (const row of submittedRows) countRow(row);
  } else {
    const latest = latestSubmittedRow(submittedRows);
    if (latest) countRow(latest);
  }

  return {
    submitted: Math.min(checked.size, required),
    required,
  };
};

const isFormOpened = (form, now) => {
  if (form?.settings?.openAt && new Date(form.settings.openAt) > now) {
    return false;
  }
  return true;
};

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
  schoolRole = null,
}) => {
  const detail = listRequiredFormProgress({
    boards,
    forms,
    myRows,
    user,
    now,
    schoolRole,
  });
  return { submitted: detail.submitted, total: detail.total };
};

/**
 * 전체 + 양식별 진행도
 * - 전체: 제출 완료 양식 수 / 필수 양식 수 (선택·체크박스 진행은 분모에 넣지 않음)
 * - 양식: 필수면 제출 횟수 / 목표 횟수.
 *   응답자 체크박스(boolean 또는 multiSelect 선택지)가 2칸 이상이면 체크 수 / 칸 수
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
  schoolRole = null,
}) => {
  const formsByBoard = new Map();
  for (const form of forms) {
    const bid = form.board?.toString?.() ?? String(form.board);
    if (!formsByBoard.has(bid)) formsByBoard.set(bid, []);
    formsByBoard.get(bid).push(form);
  }

  const rowsByForm = new Map();
  for (const row of myRows) {
    if (!isSubmittedSheetRow(row)) continue;
    const fid = row.form?.toString?.() ?? String(row.form);
    if (!rowsByForm.has(fid)) rowsByForm.set(fid, []);
    rowsByForm.get(fid).push(row);
  }

  let submitted = 0;
  let total = 0;
  const formProgressById = new Map();

  for (const board of boards) {
    const boardId = board._id?.toString?.() ?? String(board._id);
    const altRole = getAltBoardRole(board, user);
    if (!altRole) continue;

    const boardForms = formsByBoard.get(boardId) || [];
    for (const form of boardForms) {
      if (!isFormRespondent(form, board, user, schoolRole)) continue;
      if (form.settings?.directInputMode) continue;

      const formId = form._id?.toString?.() ?? String(form._id);
      const formMyRows = rowsByForm.get(formId) || [];
      const checkboxProgress = countCheckboxFieldProgress(form, formMyRows);
      const showCheckbox = !!checkboxProgress && isFormOpened(form, now);

      if (isFormRequiredMode(form) && isWithinFormPeriod(form, now)) {
        const done = hasSubmittedForList(form, formMyRows);
        total += 1;
        if (done) submitted += 1;

        if (!showCheckbox) {
          const multiTarget = getRequiredResponseCount(form);
          const required = multiTarget != null ? multiTarget : 1;
          formProgressById.set(formId, {
            formId,
            boardId,
            title: form.title || "양식",
            submitted: Math.min(formMyRows.length, required),
            required,
          });
        }
      }

      if (showCheckbox) {
        formProgressById.set(formId, {
          formId,
          boardId,
          title: form.title || "양식",
          submitted: checkboxProgress.submitted,
          required: checkboxProgress.required,
        });
      }
    }
  }

  return {
    submitted,
    total,
    forms: Array.from(formProgressById.values()),
  };
};
