/**
 * Alter 검색 — 권한 필터된 가상 테이블 카탈로그
 * LLM SQL의 WHERE가 아니라 적재 단계에서 행을 제한한다.
 */

import {
  Registration,
  Syllabus,
  Enrollment,
  Season,
  Archive,
  AltForm,
  AltSheetRow,
  Board,
  Post,
  CalendarEvent,
} from "../models/index.js";
import {
  canViewAllRows,
  getVisibleFields,
  isFormMember,
} from "./altForms.js";
import { isBoardMember } from "./boards.js";
import {
  mergeQueryAnd,
  normalizeSearchGrade,
  normalizeSeasonScope,
  pickResolvedSeasonIds,
} from "./alterSearchPushdown.js";
import {
  evalColumnsFromItems,
  pickEvalColumnValues,
} from "./alterSearchPeek.js";
import { SEARCH_TABLE_ROW_CAP } from "./alterSearchSql.js";

const PII_LABEL =
  /주민|주소|전화|연락|휴대폰|핸드폰|모바일|메일|여권|계좌|email|e-mail|mobile|phone|성명\s*\(\s*부\s*\)|성명\s*\(\s*모\s*\)|생년월일\s*\(\s*부\s*\)|생년월일\s*\(\s*모\s*\)/i;

const CLIP = 400;

export const isPiiArchiveLabel = (label) => PII_LABEL.test(String(label || ""));

export const archiveTableName = (label) => {
  const slug = String(label || "item")
    .trim()
    .replace(/[^\w가-힣]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
  return `archive_${slug || "item"}`;
};

export const FORM_TABLE_CAP = 80;

const FORM_SKIP_FIELD_TYPES = new Set([
  "content",
  "docResponse",
  "aiChat",
  "file",
  "userSelect",
  "approval",
  "circulation",
]);

export const FORM_RESERVED_COLUMNS = new Set([
  "id",
  "form_id",
  "form_title",
  "respondent_id",
  "respondent_login",
  "respondent_name",
  "submitted_at",
  "answers_json",
]);

export const formTableName = (title) => {
  const slug = String(title || "item")
    .trim()
    .replace(/[^\w가-힣]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return `form_${slug || "item"}`;
};

export const formAnswerColumns = (fields) => {
  const cols = [];
  const seen = new Set();
  for (const field of fields || []) {
    if (FORM_SKIP_FIELD_TYPES.has(field?.type)) continue;
    const label = String(field?.label || "").trim();
    if (!label || isPiiArchiveLabel(label) || FORM_RESERVED_COLUMNS.has(label)) {
      continue;
    }
    let name = label;
    if (seen.has(name)) {
      let n = 2;
      while (seen.has(`${name}_${n}`)) n += 1;
      name = `${name}_${n}`;
    }
    seen.add(name);
    const options = (Array.isArray(field.options) ? field.options : [])
      .map((o) => String(o || "").trim())
      .filter(Boolean)
      .slice(0, 16);
    cols.push({
      name,
      fieldId: idStr(field._id),
      type: "TEXT",
      comment: options.length
        ? `활동 항목(선택: ${options.join(", ")})`
        : field.type || "field",
      options,
    });
  }
  return cols;
};

export const pickFormColumnValues = (data, fieldColumns) => {
  const src = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const values = {};
  for (const col of fieldColumns || []) {
    const raw = src[col.fieldId];
    values[col.name] = raw == null || raw === "" ? "" : raw;
  }
  return { values, residual: {} };
};

export const visibleFormSearchFields = (form, board, user, registration) => {
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  const role = schoolRole(registration, user);
  const viewRole =
    isStaff(user) || canViewAllRows(form, board, user, role)
      ? "admin"
      : "respondent";
  return getVisibleFields(fields, viewRole);
};

const idStr = (v) => (v == null ? "" : String(v));

const clip = (v, max = CLIP) => {
  const s = v == null ? "" : String(v);
  return s.length <= max ? s : `${s.slice(0, max)}…`;
};

const cellText = (v) => {
  if (v == null) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return clip(v, 800);
  if (Array.isArray(v) || typeof v === "object") {
    try {
      return clip(JSON.stringify(v), 800);
    } catch {
      return "";
    }
  }
  return clip(v);
};

const isStaff = (user) =>
  user?.auth === "manager" || user?.auth === "admin" || user?.auth === "owner";

const schoolRole = (registration, user) => {
  if (isStaff(user)) return "teacher";
  return registration?.role || null;
};

const capRows = (rows) =>
  Array.isArray(rows) ? rows.slice(0, SEARCH_TABLE_ROW_CAP) : [];

const sqlIdent = (name) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
    ? name
    : `"${String(name).replace(/"/g, '""')}"`;

const spec = (name, description, columns, load, count) => ({
  name,
  description,
  columns,
  ddl: `CREATE TABLE ${sqlIdent(name)} (\n  ${columns
    .map(
      (c) =>
        `${sqlIdent(c.name)} ${c.type || "TEXT"} -- ${c.comment || ""}`
    )
    .join(",\n  ")}\n);`,
  load,
  count,
});

export const resolveSeasonIds = async ({
  academyId,
  school,
  season,
  seasonScope,
  seasonId,
}) => {
  const scope = normalizeSeasonScope(seasonScope);
  const currentId = season?._id || null;
  let activatedIds = [];
  if ((scope === "activated" || scope === "season") && school?._id) {
    const seasons = await Season(academyId)
      .find({ school: school._id, isActivated: true })
      .select("_id")
      .lean();
    activatedIds = seasons.map((s) => s._id);
  }
  return pickResolvedSeasonIds({
    scope,
    currentId,
    activatedIds,
    requestedId: seasonId,
  });
};

const registrationQuery = ({
  user,
  registration,
  seasonIds,
  grade,
  mongoFilter,
}) => {
  let query = { season: { $in: seasonIds } };
  if (!isStaff(user) && registration?.role === "student") {
    query.$or = [{ user: user._id }, { role: "teacher" }];
  }
  const g = normalizeSearchGrade(grade);
  if (g) query = mergeQueryAnd(query, { grade: g });
  return mergeQueryAnd(query, mongoFilter);
};

const loadRegistrations = async ({
  academyId,
  user,
  registration,
  seasonIds,
  grade,
  mongoFilter,
}) => {
  const query = registrationQuery({
    user,
    registration,
    seasonIds,
    grade,
    mongoFilter,
  });
  const rows = await Registration(academyId)
    .find(query)
    .select(
      "user userId userName role grade group teacher teacherName subTeacherName season year term schoolName"
    )
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  return capRows(rows).map((r) => ({
    id: idStr(r._id),
    user_id: idStr(r.user),
    user_id_login: r.userId || "",
    user_name: r.userName || "",
    role: r.role || "",
    grade: r.grade || "",
    group_name: r.group || "",
    homeroom_teacher: r.teacherName || "",
    sub_teacher: r.subTeacherName || "",
    season_id: idStr(r.season),
    year: r.year || "",
    term: r.term || "",
    school_name: r.schoolName || "",
  }));
};

const loadSyllabi = async ({ academyId, seasonIds, mongoFilter }) => {
  const query = mergeQueryAnd({ season: { $in: seasonIds } }, mongoFilter);
  const rows = await Syllabus(academyId)
    .find(query)
    .select(
      "classTitle subject classroom point limit count user userName teachers season year term schoolName confirmed"
    )
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  return capRows(rows).map((s) => ({
    id: idStr(s._id),
    class_title: s.classTitle || "",
    subject: Array.isArray(s.subject) ? s.subject.filter(Boolean).join(" / ") : "",
    classroom: s.classroom || "",
    point: s.point ?? 0,
    student_limit: s.limit ?? 0,
    student_count: s.count ?? 0,
    creator_name: s.userName || "",
    teachers: (s.teachers || [])
      .map((t) => t.userName)
      .filter(Boolean)
      .join(", "),
    season_id: idStr(s.season),
    year: s.year || "",
    term: s.term || "",
    school_name: s.schoolName || "",
  }));
};

const teacherSyllabusIds = async ({ academyId, user, seasonIds }) => {
  const mine = await Syllabus(academyId)
    .find({
      season: { $in: seasonIds },
      $or: [{ "teachers._id": user._id }, { user: user._id }],
    })
    .select("_id")
    .lean();
  return mine.map((s) => s._id);
};

export const buildEnrollmentQuery = ({
  user,
  registration,
  seasonIds,
  teacherSyllabusIds,
  grade,
  mongoFilter,
}) => {
  let query = { season: { $in: seasonIds } };
  if (isStaff(user)) {
    /* season-wide */
  } else if (registration?.role === "teacher") {
    query.syllabus = { $in: teacherSyllabusIds || [] };
  } else {
    query.student = user._id;
  }
  const g = normalizeSearchGrade(grade);
  if (g) query = mergeQueryAnd(query, { studentGrade: g });
  return mergeQueryAnd(query, mongoFilter);
};

const loadEnrollments = async ({
  academyId,
  user,
  registration,
  seasonIds,
  grade,
  mongoFilter,
}) => {
  const ids =
    !isStaff(user) && registration?.role === "teacher"
      ? await teacherSyllabusIds({ academyId, user, seasonIds })
      : [];
  const query = buildEnrollmentQuery({
    user,
    registration,
    seasonIds,
    teacherSyllabusIds: ids,
    grade,
    mongoFilter,
  });
  const rows = await Enrollment(academyId)
    .find(query)
    .select(
      "student studentId studentName studentGrade syllabus classTitle subject point classroom teachers season year term schoolName hasEvaluation"
    )
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  return capRows(rows).map((e) => ({
    id: idStr(e._id),
    syllabus_id: idStr(e.syllabus),
    class_title: e.classTitle || "",
    subject: Array.isArray(e.subject) ? e.subject.filter(Boolean).join(" / ") : "",
    student_id: idStr(e.student),
    student_login: e.studentId || "",
    student_name: e.studentName || "",
    student_grade: e.studentGrade || "",
    point: e.point ?? 0,
    classroom: e.classroom || "",
    teachers: (e.teachers || [])
      .map((t) => t.userName)
      .filter(Boolean)
      .join(", "),
    has_evaluation: e.hasEvaluation ? 1 : 0,
    season_id: idStr(e.season),
    year: e.year || "",
    term: e.term || "",
  }));
};

export const collectEvalColumns = (seasonForms, user, registration) => {
  const items = [];
  const allowed = new Set();
  let anyFilter = false;
  for (const form of seasonForms || []) {
    const formItems = Array.isArray(form)
      ? form
      : Array.isArray(form?.formEvaluation)
        ? form.formEvaluation
        : [];
    items.push(...formItems);
    const labels = visibleEvalLabels(formItems, user, registration);
    if (labels) {
      anyFilter = true;
      for (const label of labels) allowed.add(label);
    }
  }
  return evalColumnsFromItems(items, anyFilter ? allowed : null);
};

const loadSeasonEvalForms = async (academyId, seasonIds) => {
  if (!seasonIds?.length) return [];
  const seasons = await Season(academyId)
    .find({ _id: { $in: seasonIds } })
    .select("formEvaluation")
    .lean();
  return seasons.map((s) => ({
    seasonId: idStr(s._id),
    formEvaluation: s.formEvaluation,
  }));
};

export const visibleEvalLabels = (formEvaluation, user, registration) => {
  const items = Array.isArray(formEvaluation) ? formEvaluation : [];
  if (!items.length) return null;
  const staff = isStaff(user);
  const teacher = staff || registration?.role === "teacher";
  const labels = [];
  for (const item of items) {
    const label = item?.label;
    if (!label) continue;
    const view = item?.auth?.view || {};
    if (staff || teacher) {
      if (view.teacher !== false) labels.push(label);
    } else if (view.student) {
      labels.push(label);
    }
  }
  return labels;
};

export const filterEvaluationForSearch = ({
  evaluation,
  formEvaluation,
  user,
  registration,
  evalColumns = [],
}) => {
  const source =
    evaluation && typeof evaluation === "object" ? evaluation : {};
  const evalKeys = Object.keys(source);
  const labels = visibleEvalLabels(formEvaluation, user, registration);
  const staffOrTeacher =
    isStaff(user) || registration?.role === "teacher";
  const allowed =
    labels == null
      ? staffOrTeacher
        ? evalKeys
        : []
      : labels.filter((key) => evalKeys.includes(key));
  const allowedSet = new Set(allowed);
  const rowEvalColumns = staffOrTeacher
    ? evalColumns
    : evalColumns.filter((column) => allowedSet.has(column.name));
  const evaluationJson = {};
  for (const key of allowed) {
    if (source[key] != null && source[key] !== "") {
      evaluationJson[key] = cellText(source[key]);
    }
  }
  const flat = pickEvalColumnValues(source, rowEvalColumns);
  for (const [key, value] of Object.entries(flat)) {
    flat[key] = value === "" ? "" : cellText(value);
  }
  return { flat, evaluationJson };
};

const loadEnrollmentEvaluations = async ({
  academyId,
  user,
  registration,
  seasonIds,
  grade,
  mongoFilter,
  evalColumns = [],
  seasonEvalForms = [],
}) => {
  const ids =
    !isStaff(user) && registration?.role === "teacher"
      ? await teacherSyllabusIds({ academyId, user, seasonIds })
      : [];
  const query = buildEnrollmentQuery({
    user,
    registration,
    seasonIds,
    teacherSyllabusIds: ids,
    grade,
    mongoFilter,
  });
  const docs = await Enrollment(academyId)
    .find(query)
    .select("+evaluation")
    .limit(SEARCH_TABLE_ROW_CAP);
  const rows = docs.map((d) => (typeof d.toObject === "function" ? d.toObject() : d));
  const evalFormBySeason = new Map(
    seasonEvalForms.map((entry) => [
      String(entry?.seasonId || ""),
      Array.isArray(entry?.formEvaluation) ? entry.formEvaluation : [],
    ])
  );
  return capRows(rows).map((e) => {
    const { flat, evaluationJson } = filterEvaluationForSearch({
      evaluation: e.evaluation,
      formEvaluation: evalFormBySeason.get(idStr(e.season)),
      user,
      registration,
      evalColumns,
    });
    return {
      id: idStr(e._id),
      syllabus_id: idStr(e.syllabus),
      class_title: e.classTitle || "",
      student_id: idStr(e.student),
      student_login: e.studentId || "",
      student_name: e.studentName || "",
      student_grade: e.studentGrade || "",
      ...flat,
      evaluation_json: JSON.stringify(evaluationJson),
      season_id: idStr(e.season),
      year: e.year || "",
      term: e.term || "",
    };
  });
};

export const canReadArchiveItem = (item, user, registration, studentReg) => {
  if (!item) return false;
  if (isStaff(user) && item.authManager === "viewAndEdit") return true;
  if (registration?.role === "teacher") {
    if (item.authTeacher === "viewAndEditStudents") return true;
    if (item.authTeacher === "viewAndEditMyStudents") {
      return (
        studentReg?.teacher &&
        (idStr(studentReg.teacher) === idStr(user._id) ||
          idStr(studentReg.subTeacher) === idStr(user._id))
      );
    }
  }
  if (
    registration?.role === "student" &&
    (item.authStudent === "view" || item.authStudent === "viewAndEdit")
  ) {
    return idStr(studentReg?.user) === idStr(user._id);
  }
  return false;
};

const archiveFieldNames = (item) =>
  (item.fields || [])
    .filter((f) => f?.label && !isPiiArchiveLabel(f.label))
    .map((f) => f.label);

const objectToFieldRow = (item, obj) => {
  const row = {};
  for (const name of archiveFieldNames(item)) {
    row[name] =
      obj && typeof obj === "object" && !Array.isArray(obj)
        ? cellText(obj[name])
        : "";
  }
  return row;
};

const uniqueRegsByUser = (regs) => {
  const seen = new Set();
  const out = [];
  for (const sr of regs || []) {
    const uid = idStr(sr.user);
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    out.push(sr);
  }
  return out;
};

/** 배열 기록은 항목당 한 행, 객체 기록은 학생당 한 행 */
export const expandArchiveRows = (item, studentReg, raw) => {
  const base = {
    user_id: idStr(studentReg?.user),
    user_login: studentReg?.userId || "",
    user_name: studentReg?.userName || "",
    grade: studentReg?.grade || "",
  };
  const fieldNames = archiveFieldNames(item);
  const fill = (fields) => {
    const out = { ...base, ...fields };
    for (const name of fieldNames) {
      if (!(name in out)) out[name] = "";
    }
    return out;
  };
  if (item.dataType === "array" && Array.isArray(raw)) {
    if (!raw.length) return [fill({ entries_json: "[]" })];
    return raw.map((entry, i) => {
      const safeEntry = objectToFieldRow(item, entry);
      return fill({
        ...safeEntry,
        entries_json: cellText(safeEntry),
        entry_index: i + 1,
      });
    });
  }
  return [fill(objectToFieldRow(item, raw))];
};

const loadArchiveTable = async ({
  academyId,
  user,
  school,
  registration,
  item,
  studentRegs,
  mongoFilter,
}) => {
  const nameEq = mongoFilter?.userName;
  const gradeEq = mongoFilter?.grade;
  const allowedRegs = studentRegs.filter((sr) => {
    if (!canReadArchiveItem(item, user, registration, sr)) return false;
    if (nameEq) {
      const names = nameEq.$in || [nameEq];
      if (!names.includes(sr.userName)) return false;
    }
    if (gradeEq) {
      const grades = gradeEq.$in || [gradeEq];
      if (!grades.includes(sr.grade)) return false;
    }
    return true;
  });
  if (!allowedRegs.length) return [];
  const uniqueRegs = uniqueRegsByUser(allowedRegs);
  const userIds = uniqueRegs.map((r) => r.user);
  const docs = await Archive(academyId)
    .find({ school: school._id, user: { $in: userIds } })
    .limit(SEARCH_TABLE_ROW_CAP);
  const byUser = new Map(
    docs.map((d) => {
      const obj = typeof d.toObject === "function" ? d.toObject() : d;
      return [idStr(obj.user), obj];
    })
  );
  const out = [];
  for (const sr of uniqueRegs) {
    const doc = byUser.get(idStr(sr.user));
    const raw = doc?.data ? doc.data[item.label] : null;
    for (const row of expandArchiveRows(item, sr, raw)) {
      out.push(row);
      if (out.length >= SEARCH_TABLE_ROW_CAP) {
        return capRows(out);
      }
    }
  }
  return capRows(out);
};

const memberBoards = async ({ academyId, user, school, registration }) => {
  if (!school?._id) return [];
  const boards = await Board(academyId)
    .find({ school: school._id, isActive: { $ne: false } })
    .limit(400)
    .lean();
  const role = schoolRole(registration, user);
  return boards.filter((b) => {
    try {
      return isBoardMember(b, user, role);
    } catch {
      return false;
    }
  });
};

const loadForms = async ({
  academyId,
  user,
  registration,
  boards,
  mongoFilter,
}) => {
  if (!boards.length) return [];
  const boardIds = boards.map((b) => b._id);
  const boardById = new Map(boards.map((board) => [idStr(board._id), board]));
  const role = schoolRole(registration, user);
  const titleFilter = mongoFilter?.title
    ? { title: mongoFilter.title }
    : {};
  const forms = await AltForm(academyId)
    .find(
      mergeQueryAnd(
        { board: { $in: boardIds }, isActive: true },
        titleFilter
      )
    )
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  return forms.filter((form) => {
    const board = boardById.get(idStr(form.board));
    if (!board) return false;
    const canViewAll = canViewAllRows(form, board, user, role);
    if (form.isDraft && !canViewAll) return false;
    return canViewAll || isFormMember(form, board, user, role);
  });
};

const mapFormRows = (forms, boards) => {
  const boardName = new Map(boards.map((b) => [idStr(b._id), b.name || ""]));
  return capRows(forms).map((f) => ({
    id: idStr(f._id),
    board_id: idStr(f.board),
    board_name: boardName.get(idStr(f.board)) || "",
    title: f.title || "",
    is_draft: f.isDraft ? 1 : 0,
    quiz_mode: f.settings?.quizMode ? 1 : 0,
    assessment_mode: f.settings?.assessmentMode ? 1 : 0,
    close_at: f.settings?.closeAt ? String(f.settings.closeAt) : "",
  }));
};

const loadFormRows = async ({
  academyId,
  user,
  registration,
  boards,
  forms,
  mongoFilter,
}) => {
  if (!forms.length) return [];
  const boardById = new Map(boards.map((b) => [idStr(b._id), b]));
  const role = schoolRole(registration, user);
  const accessByForm = new Map();
  const allFormIds = [];
  const ownFormIds = [];
  for (const form of forms) {
    const board = boardById.get(idStr(form.board));
    if (!board) continue;
    const allRows = canViewAllRows(form, board, user, role);
    const formId = idStr(form._id);
    accessByForm.set(formId, {
      form,
      fieldColumns: formAnswerColumns(
        visibleFormSearchFields(form, board, user, registration)
      ),
    });
    (allRows ? allFormIds : ownFormIds).push(form._id);
  }

  const loadRows = (formIds, ownOnly) => {
    if (!formIds.length) return Promise.resolve([]);
    const query = {
      form: { $in: formIds },
      isActive: { $ne: false },
      isDraft: { $ne: true },
      ...(ownOnly ? { _respondent: user._id } : {}),
    };
    return AltSheetRow(academyId)
      .find(mergeQueryAnd(query, mongoFilter))
      .select("_respondent _respondentId _respondentName _submittedAt data form")
      .limit(SEARCH_TABLE_ROW_CAP)
      .lean();
  };

  const [allRows, ownRows] = await Promise.all([
    loadRows(allFormIds, false),
    loadRows(ownFormIds, true),
  ]);
  return capRows([...allRows, ...ownRows]).flatMap((row) => {
    const access = accessByForm.get(idStr(row.form));
    if (!access) return [];
    const { values } = pickFormColumnValues(
      row.data || {},
      access.fieldColumns
    );
    return [
      {
        id: idStr(row._id),
        form_id: idStr(access.form._id),
        form_title: access.form.title || "",
        respondent_id: idStr(row._respondent),
        respondent_login: row._respondentId || "",
        respondent_name: row._respondentName || "",
        submitted_at: row._submittedAt ? String(row._submittedAt) : "",
        answers_json: cellText(values),
      },
    ];
  });
};

export const mapOneFormSearchRow = (form, row, fieldColumns) => {
  const data = row?.data && typeof row.data === "object" ? row.data : {};
  const { values, residual } = pickFormColumnValues(data, fieldColumns);
  const flat = {};
  for (const [key, val] of Object.entries(values)) {
    flat[key] = val === "" ? "" : cellText(val);
  }
  return {
    id: idStr(row._id),
    form_id: idStr(form._id),
    form_title: form.title || "",
    respondent_id: idStr(row._respondent),
    respondent_login: row._respondentId || "",
    respondent_name: row._respondentName || "",
    submitted_at: row._submittedAt ? String(row._submittedAt) : "",
    ...flat,
    answers_json: cellText(residual),
  };
};

const loadOneFormTable = async ({
  academyId,
  user,
  registration,
  board,
  form,
  fieldColumns,
  mongoFilter,
}) => {
  if (!form || !board) return [];
  const role = schoolRole(registration, user);
  const allRows = canViewAllRows(form, board, user, role);
  const q = {
    form: form._id,
    isActive: { $ne: false },
    isDraft: { $ne: true },
  };
  if (!allRows) q._respondent = user._id;
  const rows = await AltSheetRow(academyId)
    .find(mergeQueryAnd(q, mongoFilter))
    .select("_respondent _respondentId _respondentName _submittedAt data form")
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  return capRows(rows).map((row) => mapOneFormSearchRow(form, row, fieldColumns));
};

const countOneFormTable = async ({
  academyId,
  user,
  registration,
  board,
  form,
  mongoFilter,
}) => {
  if (!form || !board) return 0;
  const role = schoolRole(registration, user);
  const allRows = canViewAllRows(form, board, user, role);
  const q = {
    form: form._id,
    isActive: { $ne: false },
    isDraft: { $ne: true },
  };
  if (!allRows) q._respondent = user._id;
  return AltSheetRow(academyId).countDocuments(mergeQueryAnd(q, mongoFilter));
};

const loadCalendar = async ({ academyId, user, school, mongoFilter }) => {
  if (!school?._id) return [];
  const query = mergeQueryAnd(
    {
      $or: [
        { scope: "school", school: school._id },
        { scope: "personal", user: user._id },
      ],
    },
    mongoFilter
  );
  const rows = await CalendarEvent(academyId)
    .find(query)
    .select("title description start end isAllDay scope sourceType user")
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  return capRows(rows).map((e) => ({
    id: idStr(e._id),
    title: e.title || "",
    description: clip(e.description || "", 200),
    start: e.start ? String(e.start) : "",
    end: e.end ? String(e.end) : "",
    is_all_day: e.isAllDay ? 1 : 0,
    scope: e.scope || "",
    source_type: e.sourceType || "",
  }));
};

const loadBoards = async ({ boards, mongoFilter }) => {
  let list = boards;
  if (mongoFilter?.name != null) {
    const names = mongoFilter.name.$in || [mongoFilter.name];
    list = boards.filter((b) => names.includes(b.name));
  }
  return capRows(list).map((b) => ({
    id: idStr(b._id),
    name: b.name || "",
    slug: b.slug || "",
    description: clip(b.description || "", 200),
    scope: b.scope || "",
    is_default: b.isDefault ? 1 : 0,
    post_count: b.postCount ?? 0,
  }));
};

const loadPosts = async ({ academyId, boards, mongoFilter }) => {
  if (!boards.length) return [];
  const posts = await Post(academyId)
    .find(
      mergeQueryAnd(
        {
          board: { $in: boards.map((b) => b._id) },
          isActive: { $ne: false },
        },
        mongoFilter
      )
    )
    .select("board title authorName content createdAt isPinned postType")
    .sort({ createdAt: -1 })
    .limit(SEARCH_TABLE_ROW_CAP)
    .lean();
  const boardName = new Map(boards.map((b) => [idStr(b._id), b.name || ""]));
  return capRows(posts).map((p) => ({
    id: idStr(p._id),
    board_id: idStr(p.board),
    board_name: boardName.get(idStr(p.board)) || "",
    title: p.title || "",
    author_name: p.authorName || "",
    content: clip(p.content || "", CLIP),
    created_at: p.createdAt ? String(p.createdAt) : "",
    is_pinned: p.isPinned ? 1 : 0,
    post_type: p.postType || "general",
  }));
};

/**
 * @returns {Promise<{ seasonIds: unknown[], specs: object[] }>}
 */
const loadCtx = (ctx = {}) => ({
  grade: ctx.grade,
  mongoFilter: ctx.mongoFilter,
});

export const buildSearchCatalog = async ({
  academyId,
  user,
  school,
  season,
  registration,
  seasonScope = "current",
  seasonId,
  grade = "",
}) => {
  const seasonIds = await resolveSeasonIds({
    academyId,
    school,
    season,
    seasonScope,
    seasonId,
  });
  const gradeFilter = normalizeSearchGrade(grade);
  const archiveItems = Array.isArray(school?.formArchive)
    ? school.formArchive.filter((item) => item?.label)
    : [];
  const studentRegs = archiveItems.length > 0 && seasonIds.length
    ? await Registration(academyId)
        .find({
          season: { $in: seasonIds },
          role: "student",
          ...(gradeFilter ? { grade: gradeFilter } : {}),
        })
        .select("user userId userName grade teacher subTeacher")
        .limit(SEARCH_TABLE_ROW_CAP)
        .lean()
    : [];

  const boardsPromise = memberBoards({
    academyId,
    user,
    school,
    registration,
  });
  const seasonEvalForms = await loadSeasonEvalForms(academyId, seasonIds);
  const evalColumns = collectEvalColumns(seasonEvalForms, user, registration);

  const specs = [
    spec(
      "registrations",
      "학기 등록(학생·교사). 학생은 본인과 교사 목록만 보입니다.",
      [
        { name: "id", type: "TEXT", comment: "등록 id" },
        { name: "user_id", type: "TEXT", comment: "사용자 id" },
        { name: "user_id_login", type: "TEXT", comment: "로그인 아이디" },
        { name: "user_name", type: "TEXT", comment: "이름" },
        { name: "role", type: "TEXT", comment: "student|teacher" },
        { name: "grade", type: "TEXT", comment: "학년(이 뷰에 있는 값 그대로)" },
        { name: "group_name", type: "TEXT", comment: "그룹" },
        { name: "homeroom_teacher", type: "TEXT", comment: "담임" },
        { name: "sub_teacher", type: "TEXT", comment: "부담임" },
        { name: "season_id", type: "TEXT", comment: "학기 id" },
        { name: "year", type: "TEXT", comment: "학년도" },
        { name: "term", type: "TEXT", comment: "학기" },
        { name: "school_name", type: "TEXT", comment: "학교명" },
      ],
      (ctx) =>
        loadRegistrations({
          academyId,
          user,
          registration,
          seasonIds,
          ...loadCtx(ctx),
        }),
      (ctx) =>
        Registration(academyId).countDocuments(
          registrationQuery({
            user,
            registration,
            seasonIds,
            ...loadCtx(ctx),
          })
        )
    ),
    spec(
      "syllabi",
      "수업(강의계획서) 목록. 본문 info는 포함하지 않습니다.",
      [
        { name: "id", type: "TEXT", comment: "수업 id" },
        { name: "class_title", type: "TEXT", comment: "수업명" },
        { name: "subject", type: "TEXT", comment: "교과" },
        { name: "classroom", type: "TEXT", comment: "강의실" },
        { name: "point", type: "REAL", comment: "학점" },
        { name: "student_limit", type: "REAL", comment: "정원" },
        { name: "student_count", type: "REAL", comment: "수강 인원" },
        { name: "creator_name", type: "TEXT", comment: "개설자" },
        { name: "teachers", type: "TEXT", comment: "멘토(쉼표 구분)" },
        { name: "season_id", type: "TEXT", comment: "학기 id" },
        { name: "year", type: "TEXT", comment: "학년도" },
        { name: "term", type: "TEXT", comment: "학기" },
        { name: "school_name", type: "TEXT", comment: "학교명" },
      ],
      (ctx) => loadSyllabi({ academyId, seasonIds, ...loadCtx(ctx) }),
      (ctx) =>
        Syllabus(academyId).countDocuments(
          mergeQueryAnd(
            { season: { $in: seasonIds } },
            loadCtx(ctx).mongoFilter
          )
        )
    ),
    spec(
      "enrollments",
      "수강 1건(학생 1명이 아님). 학생은 본인, 교사는 담당 수업, 관리자는 학기 전체. 평가 본문은 enrollment_evaluations.",
      [
        { name: "id", type: "TEXT", comment: "수강 id" },
        { name: "syllabus_id", type: "TEXT", comment: "수업 id" },
        { name: "class_title", type: "TEXT", comment: "수업명" },
        { name: "subject", type: "TEXT", comment: "교과" },
        { name: "student_id", type: "TEXT", comment: "학생 id" },
        { name: "student_login", type: "TEXT", comment: "학생 아이디" },
        { name: "student_name", type: "TEXT", comment: "학생 이름" },
        { name: "student_grade", type: "TEXT", comment: "학년" },
        { name: "point", type: "REAL", comment: "학점" },
        { name: "classroom", type: "TEXT", comment: "강의실" },
        { name: "teachers", type: "TEXT", comment: "멘토" },
        { name: "has_evaluation", type: "INTEGER", comment: "평가 유무 1/0" },
        { name: "season_id", type: "TEXT", comment: "학기 id" },
        { name: "year", type: "TEXT", comment: "학년도" },
        { name: "term", type: "TEXT", comment: "학기" },
      ],
      (ctx) =>
        loadEnrollments({
          academyId,
          user,
          registration,
          seasonIds,
          ...loadCtx(ctx),
        }),
      async (ctx) => {
        const ids =
          !isStaff(user) && registration?.role === "teacher"
            ? await teacherSyllabusIds({ academyId, user, seasonIds })
            : [];
        return Enrollment(academyId).countDocuments(
          buildEnrollmentQuery({
            user,
            registration,
            seasonIds,
            teacherSyllabusIds: ids,
            ...loadCtx(ctx),
          })
        );
      }
    ),
    spec(
      "enrollment_evaluations",
      "수강 평가 1건(학생 1명이 아님). 평가 항목은 한글 열. 학생 수는 COUNT(DISTINCT student_id). 비담당 교사·학생 비공개 항목은 없습니다.",
      [
        { name: "id", type: "TEXT", comment: "수강 id" },
        { name: "syllabus_id", type: "TEXT", comment: "수업 id" },
        { name: "class_title", type: "TEXT", comment: "수업명" },
        { name: "student_id", type: "TEXT", comment: "학생 id" },
        { name: "student_login", type: "TEXT", comment: "학생 아이디" },
        { name: "student_name", type: "TEXT", comment: "학생 이름" },
        { name: "student_grade", type: "TEXT", comment: "학년" },
        ...evalColumns.map((c) => ({
          name: c.name,
          type: c.type,
          comment: c.comment,
        })),
        { name: "evaluation_json", type: "TEXT", comment: "양식에 없는 잔여 평가 JSON" },
        { name: "season_id", type: "TEXT", comment: "학기 id" },
        { name: "year", type: "TEXT", comment: "학년도" },
        { name: "term", type: "TEXT", comment: "학기" },
      ],
      (ctx) =>
        loadEnrollmentEvaluations({
          academyId,
          user,
          registration,
          seasonIds,
          evalColumns,
          seasonEvalForms,
          ...loadCtx(ctx),
        }),
      async (ctx) => {
        const ids =
          !isStaff(user) && registration?.role === "teacher"
            ? await teacherSyllabusIds({ academyId, user, seasonIds })
            : [];
        return Enrollment(academyId).countDocuments(
          buildEnrollmentQuery({
            user,
            registration,
            seasonIds,
            teacherSyllabusIds: ids,
            ...loadCtx(ctx),
          })
        );
      }
    ),
  ];

  const usedNames = new Set(specs.map((s) => s.name));
  for (const item of archiveItems) {
    let name = archiveTableName(item.label);
    if (usedNames.has(name)) name = `${name}_${usedNames.size}`;
    usedNames.add(name);
    const fieldCols = (item.fields || [])
      .filter((f) => f?.label && !isPiiArchiveLabel(f.label))
      .map((f) => ({
        name: f.label,
        type: "TEXT",
        comment: f.type || "field",
      }));
    specs.push(
      spec(
        name,
        `학생 기록 「${item.label}」. 주민번호·주소·연락처 필드는 제외.`,
        [
          { name: "user_id", type: "TEXT", comment: "학생 id" },
          { name: "user_login", type: "TEXT", comment: "로그인 아이디" },
          { name: "user_name", type: "TEXT", comment: "이름" },
          { name: "grade", type: "TEXT", comment: "학년" },
          ...fieldCols,
          ...(item.dataType === "array"
            ? [
                {
                  name: "entry_index",
                  type: "REAL",
                  comment: "배열 항목 순번(1부터)",
                },
                {
                  name: "entries_json",
                  type: "TEXT",
                  comment: "이 항목 원문(JSON, 일부)",
                },
              ]
            : []),
        ],
        (ctx) =>
          loadArchiveTable({
            academyId,
            user,
            school,
            registration,
            item,
            studentRegs,
            ...loadCtx(ctx),
          })
      )
    );
  }

  const boards = await boardsPromise;
  const memberForms = await loadForms({
    academyId,
    user,
    registration,
    boards,
  });
  const boardById = new Map(boards.map((b) => [idStr(b._id), b]));
  const formTables = [];
  const overflowFormTitles = [];
  memberForms.forEach((form, index) => {
    const title = form.title || "활동";
    if (index >= FORM_TABLE_CAP) {
      overflowFormTitles.push(title);
      return;
    }
    const board = boardById.get(idStr(form.board));
    const fieldColumns = formAnswerColumns(
      visibleFormSearchFields(form, board, user, registration)
    );
    let name = formTableName(title);
    if (usedNames.has(name)) name = `${name}_${usedNames.size}`;
    usedNames.add(name);
    formTables.push({
      name,
      title,
      columns: fieldColumns.map((c) => ({
        name: c.name,
        options: c.options || [],
      })),
    });
    specs.push(
      spec(
        name,
        `보드 활동 「${title}」 응답. 한 행은 제출 1건. 항목 집계는 한글 열.`,
        [
          { name: "id", type: "TEXT", comment: "행 id" },
          { name: "form_id", type: "TEXT", comment: "양식 id" },
          { name: "form_title", type: "TEXT", comment: "양식 제목" },
          { name: "respondent_id", type: "TEXT", comment: "응답자 id" },
          { name: "respondent_login", type: "TEXT", comment: "응답자 아이디" },
          { name: "respondent_name", type: "TEXT", comment: "응답자 이름" },
          { name: "submitted_at", type: "TEXT", comment: "제출 시각" },
          ...fieldColumns.map((c) => ({
            name: c.name,
            type: c.type,
            comment: c.comment,
          })),
          {
            name: "answers_json",
            type: "TEXT",
            comment: "펼치지 않은 잔여 응답 JSON",
          },
        ],
        (ctx) =>
          loadOneFormTable({
            academyId,
            user,
            registration,
            board,
            form,
            fieldColumns,
            ...loadCtx(ctx),
          }),
        (ctx) =>
          countOneFormTable({
            academyId,
            user,
            registration,
            board,
            form,
            ...loadCtx(ctx),
          })
      )
    );
  });

  specs.push(
    spec(
      "forms",
      "멤버인 보드의 활동 양식 목록. 항목별 집계는 form_* 표를 쓰세요.",
      [
        { name: "id", type: "TEXT", comment: "양식 id" },
        { name: "board_id", type: "TEXT", comment: "보드 id" },
        { name: "board_name", type: "TEXT", comment: "보드 이름" },
        { name: "title", type: "TEXT", comment: "제목" },
        { name: "is_draft", type: "INTEGER", comment: "비공개 1/0" },
        { name: "quiz_mode", type: "INTEGER", comment: "퀴즈 1/0" },
        { name: "assessment_mode", type: "INTEGER", comment: "평가 모드 1/0" },
        { name: "close_at", type: "TEXT", comment: "마감" },
      ],
      async (ctx) => {
        const forms = await loadForms({
          academyId,
          user,
          registration,
          boards,
          ...loadCtx(ctx),
        });
        return mapFormRows(forms, boards);
      }
    ),
    spec(
      "form_rows",
      "모든 활동 응답 요약(필드 열 없음). 항목 집계는 form_* 표를 쓰세요. 전체 보기 권한이 없으면 본인 행만.",
      [
        { name: "id", type: "TEXT", comment: "행 id" },
        { name: "form_id", type: "TEXT", comment: "양식 id" },
        { name: "form_title", type: "TEXT", comment: "양식 제목" },
        { name: "respondent_id", type: "TEXT", comment: "응답자 id" },
        { name: "respondent_login", type: "TEXT", comment: "응답자 아이디" },
        { name: "respondent_name", type: "TEXT", comment: "응답자 이름" },
        { name: "submitted_at", type: "TEXT", comment: "제출 시각" },
        { name: "answers_json", type: "TEXT", comment: "응답 JSON" },
      ],
      async (ctx) => {
        const forms = await loadForms({
          academyId,
          user,
          registration,
          boards,
        });
        return loadFormRows({
          academyId,
          user,
          registration,
          boards,
          forms,
          ...loadCtx(ctx),
        });
      }
    ),
    spec(
      "calendar_events",
      "학교 일정 + 본인 개인 일정.",
      [
        { name: "id", type: "TEXT", comment: "일정 id" },
        { name: "title", type: "TEXT", comment: "제목" },
        { name: "description", type: "TEXT", comment: "설명" },
        { name: "start", type: "TEXT", comment: "시작" },
        { name: "end", type: "TEXT", comment: "종료" },
        { name: "is_all_day", type: "INTEGER", comment: "종일 1/0" },
        { name: "scope", type: "TEXT", comment: "school|personal" },
        { name: "source_type", type: "TEXT", comment: "출처" },
      ],
      (ctx) => loadCalendar({ academyId, user, school, ...loadCtx(ctx) })
    ),
    spec(
      "boards",
      "멤버인 보드만.",
      [
        { name: "id", type: "TEXT", comment: "보드 id" },
        { name: "name", type: "TEXT", comment: "이름" },
        { name: "slug", type: "TEXT", comment: "슬러그" },
        { name: "description", type: "TEXT", comment: "설명" },
        { name: "scope", type: "TEXT", comment: "school|season" },
        { name: "is_default", type: "INTEGER", comment: "공지 보드 1/0" },
        { name: "post_count", type: "REAL", comment: "글 수" },
      ],
      (ctx) => loadBoards({ boards, ...loadCtx(ctx) })
    ),
    spec(
      "posts",
      "멤버 보드의 글. 본문은 일부만. 채팅·DM은 없습니다.",
      [
        { name: "id", type: "TEXT", comment: "글 id" },
        { name: "board_id", type: "TEXT", comment: "보드 id" },
        { name: "board_name", type: "TEXT", comment: "보드 이름" },
        { name: "title", type: "TEXT", comment: "제목" },
        { name: "author_name", type: "TEXT", comment: "작성자" },
        { name: "content", type: "TEXT", comment: "본문 일부" },
        { name: "created_at", type: "TEXT", comment: "작성 시각" },
        { name: "is_pinned", type: "INTEGER", comment: "고정 1/0" },
        { name: "post_type", type: "TEXT", comment: "general|survey" },
      ],
      (ctx) => loadPosts({ academyId, boards, ...loadCtx(ctx) })
    )
  );

  return { seasonIds, specs, evalColumns, formTables, overflowFormTitles };
};

const uniqDistinct = (values) =>
  [...new Set((values || []).map((v) => String(v ?? "").trim()).filter(Boolean))].slice(
    0,
    32
  );

/** SQL 작성용: 권한 뷰에 실제로 있는 grade/year/term (행 데이터 아님) */
export const peekRegistrationDims = async ({
  academyId,
  user,
  registration,
  seasonIds,
  grade,
}) => {
  const query = registrationQuery({
    user,
    registration,
    seasonIds,
    grade,
  });
  const Model = Registration(academyId);
  const [count, grades, years, terms, roles] = await Promise.all([
    Model.countDocuments(query),
    Model.distinct("grade", query),
    Model.distinct("year", query),
    Model.distinct("term", query),
    Model.distinct("role", query),
  ]);
  return {
    count,
    grades: uniqDistinct(grades),
    years: uniqDistinct(years),
    terms: uniqDistinct(terms),
    roles: uniqDistinct(roles),
  };
};

export const peekSearchSchema = async ({
  academyId,
  user,
  registration,
  seasonIds,
  grade,
  evalColumns = [],
  formTables = [],
  overflowFormTitles = [],
}) => {
  const dims = await peekRegistrationDims({
    academyId,
    user,
    registration,
    seasonIds,
    grade,
  });
  const ids =
    !isStaff(user) && registration?.role === "teacher"
      ? await teacherSyllabusIds({ academyId, user, seasonIds })
      : [];
  const enrQuery = buildEnrollmentQuery({
    user,
    registration,
    seasonIds,
    teacherSyllabusIds: ids,
    grade,
  });
  const studentGrades = seasonIds?.length
    ? uniqDistinct(await Enrollment(academyId).distinct("studentGrade", enrQuery))
    : [];
  return {
    ...dims,
    studentGrades,
    evalColumns: evalColumns || [],
    formTables: formTables || [],
    overflowFormTitles: overflowFormTitles || [],
  };
};

export {
  formatRegistrationValueHint,
  formatSearchSchemaHint,
} from "./alterSearchPeek.js";

export const buildSearchScopeOptions = async ({ academyId, school }) => {
  if (!school?._id) return { seasons: [] };
  const seasons = await Season(academyId)
    .find({ school: school._id, isActivated: true })
    .select("_id year term")
    .sort({ year: -1 })
    .lean();
  const ids = seasons.map((s) => s._id);
  const regs = ids.length
    ? await Registration(academyId)
        .find({ season: { $in: ids }, role: "student" })
        .select("season grade")
        .lean()
    : [];
  const bySeason = new Map();
  for (const r of regs) {
    const sid = idStr(r.season);
    if (!bySeason.has(sid)) bySeason.set(sid, new Set());
    const g = String(r.grade || "").trim();
    if (g) bySeason.get(sid).add(g);
  }
  return {
    seasons: seasons.map((s) => ({
      id: idStr(s._id),
      year: s.year || "",
      term: s.term || "",
      grades: [...(bySeason.get(idStr(s._id)) || [])].sort(),
    })),
  };
};

export const formatCatalogDdl = (specs) =>
  specs
    .map(
      (s) =>
        `-- ${s.description}\n${s.ddl}`
    )
    .join("\n\n");

export const loadCatalogTables = async (specs, names, ctx = {}) => {
  const want = new Set(names);
  const loaded = [];
  for (const s of specs) {
    if (!want.has(s.name)) continue;
    const tableCtx = {
      grade: ctx.grade,
      mongoFilter: ctx.filtersByTable?.[s.name] || {},
    };
    const rows = await s.load(tableCtx);
    const columns = s.columns.map((c) => c.name);
    const list = rows || [];
    loaded.push({
      name: s.name,
      columns,
      truncated: list.length >= SEARCH_TABLE_ROW_CAP,
      rows: list.map((row) => {
        const out = {};
        for (const col of columns) {
          out[col] = row[col] ?? "";
        }
        return out;
      }),
    });
  }
  return loaded;
};

export const countCatalogTable = async (spec, ctx = {}) => {
  const tableCtx = {
    grade: ctx.grade,
    mongoFilter: ctx.mongoFilter || {},
  };
  if (typeof spec.count === "function") {
    return spec.count(tableCtx);
  }
  const rows = await spec.load(tableCtx);
  return (rows || []).length;
};
