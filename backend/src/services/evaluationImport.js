import {
  AltForm,
  AltSheetRow,
  Enrollment,
} from "../models/index.js";
import { isEmptyValue } from "../utils/isEmptyValue.js";
import { submittedSheetRowFilter } from "../utils/sheetRowQuery.js";

/** 평가로 가져올 수 있는 활동 양식 필드 타입 */
export const IMPORTABLE_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "time",
  "select",
  "radio",
  "rating",
  "scale",
  "counter",
  "link",
]);

/**
 * AltSheetRow.data 에서 필드 값 읽기 (Map / plain object 모두)
 */
export const getRowFieldValue = (data, fieldId) => {
  if (!data) return undefined;
  if (typeof data.get === "function") return data.get(fieldId);
  return data[fieldId];
};

/**
 * 활동 필드 값을 평가 칸 값으로 변환. 불가하면 null.
 * @param {*} raw
 * @param {string} fieldType
 * @param {"input"|"input-number"|"select"} evalType
 */
export const coerceFieldValueToEvaluation = (raw, fieldType, evalType) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    // approval / complex objects are not importable
    return null;
  }

  if (Array.isArray(raw)) {
    // multiSelect 등은 MVP 제외; 단 요소가 하나면 허용
    if (raw.length === 0) return null;
    if (raw.length === 1) {
      return coerceFieldValueToEvaluation(raw[0], fieldType, evalType);
    }
    return String(raw.filter((v) => v != null && v !== "").join(", "));
  }

  if (evalType === "input-number") {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isNaN(n)) return null;
    return n;
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }

  const s = String(raw).trim();
  return s === "" ? null : s;
};

/**
 * 평가 라벨 값을 형제 enrollment들에 combineBy에 맞게 반영 (빈 칸만일 때는 호출 전 empty 체크)
 */
export const fanOutEvaluationLabel = ({
  enrollment,
  enrollmentsByTerm,
  enrollmentsByYear,
  label,
  value,
  combineBy,
}) => {
  enrollment.evaluation = {
    ...(enrollment.evaluation || {}),
    [label]: value,
  };
  enrollment.markModified?.("evaluation");

  const assign = (e) => {
    e.evaluation = { ...(e.evaluation || {}), [label]: value };
    e.markModified?.("evaluation");
  };

  if (combineBy === "term") {
    for (const e of enrollmentsByTerm) assign(e);
  } else {
    for (const e of enrollmentsByTerm) assign(e);
    for (const e of enrollmentsByYear) assign(e);
  }
};

/**
 * 수업 보드 양식 응답 → 평가 빈 칸만 채우기
 *
 * @returns {Promise<{ filled: number, skippedExisting: number, skippedNoResponse: number, skippedNoValue: number, skippedNoPermission: number }>}
 */
export const importEvaluationFromBoardForm = async (
  academyId,
  { syllabus, formId, mappings, formEvaluation }
) => {
  const stats = {
    filled: 0,
    skippedExisting: 0,
    skippedNoResponse: 0,
    skippedNoValue: 0,
    skippedNoPermission: 0,
  };

  if (!syllabus?.altBoard) {
    throw Object.assign(new Error("BOARD_REQUIRED"), { status: 400 });
  }

  const form = await AltForm(academyId).findById(formId);
  if (!form || !form.isActive) {
    throw Object.assign(new Error("FORM_NOT_FOUND"), { status: 404 });
  }
  if (form.board?.toString() !== syllabus.altBoard.toString()) {
    throw Object.assign(new Error("FORM_BOARD_MISMATCH"), { status: 400 });
  }

  const fieldsById = new Map(
    (form.fields || []).map((f) => [f._id.toString(), f])
  );

  const evalByLabel = new Map(
    (formEvaluation || []).map((item) => [item.label, item])
  );

  const resolvedMappings = [];
  for (const m of mappings || []) {
    const fieldId = m.fieldId?.toString?.() || m.fieldId;
    const evaluationLabel = m.evaluationLabel;
    if (!fieldId || !evaluationLabel) continue;

    const field = fieldsById.get(fieldId);
    const evalItem = evalByLabel.get(evaluationLabel);
    if (!field || !evalItem) continue;
    if (!IMPORTABLE_FIELD_TYPES.has(field.type)) continue;
    if (!evalItem.auth?.edit?.teacher) {
      stats.skippedNoPermission += 1;
      continue;
    }
    resolvedMappings.push({ field, evalItem, evaluationLabel });
  }

  if (resolvedMappings.length === 0) {
    return stats;
  }

  const rows = await AltSheetRow(academyId)
    .find({
      form: form._id,
      ...submittedSheetRowFilter(),
      _respondent: { $ne: null },
    })
    .sort({ _submittedAt: -1, createdAt: -1 })
    .lean();

  /** @type {Map<string, object>} studentId -> latest row */
  const latestByStudent = new Map();
  for (const row of rows) {
    const sid = row._respondent?.toString?.();
    if (!sid || latestByStudent.has(sid)) continue;
    latestByStudent.set(sid, row);
  }

  const enrollments = await Enrollment(academyId)
    .find({ syllabus: syllabus._id })
    .select("+evaluation");

  for (const enrollment of enrollments) {
    const studentOid = enrollment.student?.toString?.();
    const row = studentOid ? latestByStudent.get(studentOid) : null;
    if (!row) {
      stats.skippedNoResponse += resolvedMappings.length;
      continue;
    }

    const enrollmentsByTerm = await Enrollment(academyId)
      .find({
        _id: { $ne: enrollment._id },
        season: enrollment.season,
        student: enrollment.student,
        subject: enrollment.subject,
      })
      .select("+evaluation");

    const enrollmentsByYear = await Enrollment(academyId)
      .find({
        _id: { $ne: enrollment._id },
        school: enrollment.school,
        year: enrollment.year,
        term: { $ne: enrollment.term },
        student: enrollment.student,
        subject: enrollment.subject,
      })
      .select("+evaluation");

    let dirty = false;
    for (const { field, evalItem, evaluationLabel } of resolvedMappings) {
      const existing = enrollment.evaluation?.[evaluationLabel];
      if (!isEmptyValue(existing)) {
        stats.skippedExisting += 1;
        continue;
      }

      const raw = getRowFieldValue(row.data, field._id.toString());
      const coerced = coerceFieldValueToEvaluation(
        raw,
        field.type,
        evalItem.type || "input"
      );
      if (coerced === null || isEmptyValue(coerced)) {
        stats.skippedNoValue += 1;
        continue;
      }

      // select 타입이면 options에 있는 값만 (느슨: 없으면 문자열로 그대로)
      let value = coerced;
      if (
        evalItem.type === "select" &&
        Array.isArray(evalItem.options) &&
        evalItem.options.length > 0 &&
        !evalItem.options.includes(String(value))
      ) {
        // options에 없으면 문자열로 넣고 교사 확인에 맡김
        value = String(value);
      }

      fanOutEvaluationLabel({
        enrollment,
        enrollmentsByTerm,
        enrollmentsByYear,
        label: evaluationLabel,
        value,
        combineBy: evalItem.combineBy || "term",
      });
      dirty = true;
      stats.filled += 1;
    }

    if (dirty) {
      const toSave = new Set([
        enrollment,
        ...enrollmentsByTerm,
        ...enrollmentsByYear,
      ]);
      for (const e of toSave) {
        await e.save();
      }
    }
  }

  return stats;
};

/**
 * CSV raw 값을 평가 칸 값으로 변환. 불가하면 null.
 * @param {*} raw
 * @param {"input"|"input-number"|"select"} evalType
 */
export const coerceCsvValueToEvaluation = (raw, evalType) => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return null;

  if (evalType === "input-number") {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isNaN(n)) return null;
    return n;
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }

  const s = String(raw).trim();
  return s === "" ? null : s;
};

/**
 * CSV 행 → 평가 빈 칸만 채우기
 * rows: { studentId, evaluation: { [label]: raw } }[]
 * 동일 studentId는 마지막 행 우선
 *
 * @returns {Promise<{ filled: number, skippedExisting: number, skippedNoValue: number, skippedNoPermission: number, skippedUnknownStudent: number, skippedUnknownLabel: number }>}
 */
export const importEvaluationFromCsv = async (
  academyId,
  { syllabus, rows, formEvaluation }
) => {
  const stats = {
    filled: 0,
    skippedExisting: 0,
    skippedNoValue: 0,
    skippedNoPermission: 0,
    skippedUnknownStudent: 0,
    skippedUnknownLabel: 0,
  };

  const evalByLabel = new Map(
    (formEvaluation || []).map((item) => [item.label, item])
  );

  /** @type {Map<string, { studentId: string, evaluation: Record<string, *> }>} */
  const byStudentId = new Map();
  for (const row of rows || []) {
    const sid = String(row?.studentId ?? "").trim();
    if (!sid) continue;
    byStudentId.set(sid, {
      studentId: sid,
      evaluation:
        row.evaluation && typeof row.evaluation === "object"
          ? row.evaluation
          : {},
    });
  }

  if (byStudentId.size === 0) {
    return stats;
  }

  const enrollments = await Enrollment(academyId)
    .find({ syllabus: syllabus._id })
    .select("+evaluation");

  /** @type {Map<string, object>} */
  const enrollmentByStudentId = new Map();
  for (const e of enrollments) {
    const sid = String(e.studentId ?? "").trim();
    if (sid) enrollmentByStudentId.set(sid, e);
  }

  for (const [studentId, row] of byStudentId) {
    const enrollment = enrollmentByStudentId.get(studentId);
    if (!enrollment) {
      const labelCount = Object.keys(row.evaluation || {}).length;
      stats.skippedUnknownStudent += Math.max(labelCount, 1);
      continue;
    }

    const labels = Object.keys(row.evaluation || {});
    if (labels.length === 0) continue;

    const enrollmentsByTerm = await Enrollment(academyId)
      .find({
        _id: { $ne: enrollment._id },
        season: enrollment.season,
        student: enrollment.student,
        subject: enrollment.subject,
      })
      .select("+evaluation");

    const enrollmentsByYear = await Enrollment(academyId)
      .find({
        _id: { $ne: enrollment._id },
        school: enrollment.school,
        year: enrollment.year,
        term: { $ne: enrollment.term },
        student: enrollment.student,
        subject: enrollment.subject,
      })
      .select("+evaluation");

    let dirty = false;
    for (const label of labels) {
      const evalItem = evalByLabel.get(label);
      if (!evalItem) {
        stats.skippedUnknownLabel += 1;
        continue;
      }
      if (!evalItem.auth?.edit?.teacher) {
        stats.skippedNoPermission += 1;
        continue;
      }

      const existing = enrollment.evaluation?.[label];
      if (!isEmptyValue(existing)) {
        stats.skippedExisting += 1;
        continue;
      }

      const coerced = coerceCsvValueToEvaluation(
        row.evaluation[label],
        evalItem.type || "input"
      );
      if (coerced === null || isEmptyValue(coerced)) {
        stats.skippedNoValue += 1;
        continue;
      }

      let value = coerced;
      if (
        evalItem.type === "select" &&
        Array.isArray(evalItem.options) &&
        evalItem.options.length > 0 &&
        !evalItem.options.includes(String(value))
      ) {
        value = String(value);
      }

      fanOutEvaluationLabel({
        enrollment,
        enrollmentsByTerm,
        enrollmentsByYear,
        label,
        value,
        combineBy: evalItem.combineBy || "term",
      });
      dirty = true;
      stats.filled += 1;
    }

    if (dirty) {
      const toSave = new Set([
        enrollment,
        ...enrollmentsByTerm,
        ...enrollmentsByYear,
      ]);
      for (const e of toSave) {
        await e.save();
      }
    }
  }

  return stats;
};
