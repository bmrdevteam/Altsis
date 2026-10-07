/**
 * Submission counts for a class form or board.
 * Only a class the teacher owns or manages, and only if that teacher can
 * already open the full sheet in the UI.
 */

import { AltForm, AltSheetRow, Board, Syllabus, User } from "../../../models/index.js";
import {
  canViewAllRows,
  isAccessListCustom,
  resolveFormMemberUsers,
} from "../../../services/altForms.js";
import { isSchoolManager } from "../../../utils/schoolManager.js";
import { submittedSheetRowFilter } from "../../../utils/sheetRowQuery.js";
import { clip, compact } from "./compact.js";

const NAME_CAP = 12;
const FORM_CAP = 8;
const OID = /^[a-f0-9]{24}$/i;

const idText = (value) => (value == null ? "" : String(value));

export const asObjectId = (value) => {
  const text = String(value || "").trim();
  return OID.test(text) ? text : "";
};

export const ownsOrManagesClass = (syllabus, user, schoolId) => {
  if (!syllabus || !user) return false;
  if (schoolId && idText(syllabus.school) !== idText(schoolId)) return false;
  if (isSchoolManager(user, syllabus.school || schoolId)) return true;
  if (idText(syllabus.user) === idText(user._id)) return true;
  return (syllabus.teachers || []).some((row) => idText(row?._id) === idText(user._id));
};

const roleEntries = (board) => {
  const raw = board?.altBoardRole;
  if (!raw) return [];
  if (typeof raw.entries === "function") return [...raw.entries()];
  return Object.entries(raw);
};

const respondentIds = async (academyId, form, board) => {
  if (isAccessListCustom(form?.members) || isAccessListCustom(form?.writers)) {
    const members = await resolveFormMemberUsers(academyId, form, board);
    return (members || []).map((member) => idText(member?.user)).filter(Boolean);
  }
  const fromRoles = roleEntries(board)
    .filter(([, role]) => role === "respondent")
    .map(([oid]) => idText(oid))
    .filter(Boolean);
  if (fromRoles.length) return fromRoles;
  const writers = new Set((board?.writers?.users || []).map((row) => idText(row.user)));
  return (board?.members?.users || [])
    .map((row) => idText(row.user))
    .filter((oid) => oid && !writers.has(oid));
};

const cappedNames = (values) => {
  const names = [];
  for (const value of values) {
    const name = clip(value, 40);
    if (!name) continue;
    names.push(name);
    if (names.length >= NAME_CAP) break;
  }
  return names;
};

export const projectFormStatus = async (academyId, form, board) => {
  const ids = await respondentIds(academyId, form, board);
  const idSet = new Set(ids);
  const rows = await AltSheetRow(academyId)
    .find({
      form: form._id,
      ...submittedSheetRowFilter(),
      _respondent: { $ne: null },
    })
    .select("_respondent _respondentName _submittedAt")
    .lean();
  const submitted = new Map();
  for (const row of rows || []) {
    const key = idText(row._respondent);
    if (!key || !idSet.has(key)) continue;
    const prev = submitted.get(key);
    if (!prev || new Date(row._submittedAt) > new Date(prev._submittedAt)) submitted.set(key, row);
  }
  const missingIds = ids.filter((oid) => !submitted.has(oid));
  let missingSource = [];
  if (missingIds.length) {
    const users = await User(academyId)
      .find({ _id: { $in: missingIds } })
      .select("userName")
      .lean();
    const byId = new Map((users || []).map((user) => [idText(user._id), user.userName]));
    missingSource = missingIds.map((oid) => byId.get(oid) || "");
  }
  const submittedSource = [...submitted.values()].map((row) => row._respondentName || "");
  const submittedNames = cappedNames(submittedSource);
  const missingNames = cappedNames(missingSource);
  const submittedAll = submittedSource.map((name) => clip(name, 40)).filter(Boolean).length;
  const missingAll = missingSource.map((name) => clip(name, 40)).filter(Boolean).length;
  return compact({
    form: clip(form.title, 80),
    board: clip(board.name, 80),
    total: ids.length,
    submittedCount: submitted.size,
    missingCount: missingIds.length,
    submittedNames,
    missingNames,
    truncated: submittedAll > submittedNames.length || missingAll > missingNames.length,
  });
};

const notFound = () => ({
  summary: "양식을 찾을 수 없습니다.",
  error: "양식을 찾을 수 없습니다.",
  forms: [],
});

const classDenied = () => ({
  summary: "담당 수업이 아닙니다.",
  error: "담당 수업이 아닙니다.",
  forms: [],
});

const forbidden = () => ({
  summary: "권한이 없습니다.",
  error: "권한이 없습니다.",
  forms: [],
});

export const loadSubmissionStatus = async ({
  academyId,
  user,
  school,
  schoolRole,
  formId,
  boardId,
}) => {
  if (!formId && !boardId) {
    return {
      summary: "양식 또는 보드가 필요합니다.",
      error: "양식 또는 보드가 필요합니다.",
      forms: [],
    };
  }
  const schoolId = school?._id;
  if (!academyId || !schoolId || !user) {
    return {
      summary: "학교 또는 사용자 정보가 없습니다.",
      error: "학교 또는 사용자 정보가 없습니다.",
      forms: [],
    };
  }

  let board = null;
  let forms = [];
  if (formId) {
    const form = await AltForm(academyId).findById(formId).lean();
    if (!form || form.isActive === false || form.isDraft === true) return notFound();
    if (idText(form.school) !== idText(schoolId)) return notFound();
    board = await Board(academyId).findById(form.board).lean();
    if (!board || board.isActive === false) return notFound();
    if (boardId && idText(board._id) !== idText(boardId)) return notFound();
    forms = [form];
  } else {
    board = await Board(academyId).findById(boardId).lean();
    if (!board || board.isActive === false) return notFound();
    if (idText(board.school) !== idText(schoolId)) return notFound();
    forms = await AltForm(academyId)
      .find({ board: board._id, isActive: true, isDraft: { $ne: true } })
      .limit(FORM_CAP)
      .lean();
  }

  if (!board?.syllabus) return classDenied();
  const syllabus = await Syllabus(academyId)
    .findById(board.syllabus)
    .select("school user teachers")
    .lean();
  if (!ownsOrManagesClass(syllabus, user, schoolId)) return classDenied();
  if (!forms.length) return { summary: "양식 없음", forms: [] };

  const visible = forms.filter((form) => canViewAllRows(form, board, user, schoolRole || null));
  if (!visible.length) return forbidden();

  const rows = [];
  for (const form of visible.slice(0, FORM_CAP)) {
    rows.push(await projectFormStatus(academyId, form, board));
  }
  const submitted = rows.reduce((sum, row) => sum + (row.submittedCount || 0), 0);
  const missing = rows.reduce((sum, row) => sum + (row.missingCount || 0), 0);
  return {
    summary: `제출 ${submitted}명 · 미제출 ${missing}명`,
    forms: rows,
  };
};
