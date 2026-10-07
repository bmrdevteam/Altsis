/**
 * Submission counts for a form or board this teacher may already open.
 * Class boards stay limited to classes they own or manage.
 * A team or staff board with no class syllabus is included when they can
 * already open the full sheet in the UI (canViewAllRows), for example a
 * staff board such as 고등 교사팀. Title lookup uses only that set.
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

const fold = (value) => String(value || "").replace(/\s+/g, "").toLowerCase();

/** Title match in either direction, ignoring case and spaces. */
export const titlesMatch = (title, query) => {
  const left = fold(title);
  const right = fold(query);
  if (left.length < 2 || right.length < 2) return false;
  return left.includes(right) || right.includes(left);
};

/**
 * Pick forms inside an already-authorized set.
 * Exact title, then exact board name, then a unique contains match.
 * Several hits stay candidates and are not loaded.
 */
export const pickSubmissionMatches = (pairs, query) => {
  const q = fold(query);
  const list = Array.isArray(pairs) ? pairs : [];
  if (q.length < 2) return { kind: "none", pairs: [] };
  const exactForms = list.filter((pair) => fold(pair.form?.title) === q);
  if (exactForms.length === 1) return { kind: "one", pairs: exactForms };
  if (exactForms.length > 1) return { kind: "many", pairs: exactForms };

  const exactBoardIds = [
    ...new Set(
      list.filter((pair) => fold(pair.board?.name) === q).map((pair) => idText(pair.board?._id))
    ),
  ].filter(Boolean);
  if (exactBoardIds.length === 1) {
    return {
      kind: "board",
      pairs: list.filter((pair) => idText(pair.board?._id) === exactBoardIds[0]),
    };
  }
  if (exactBoardIds.length > 1) {
    return {
      kind: "many",
      pairs: list.filter((pair) => exactBoardIds.includes(idText(pair.board?._id))),
    };
  }

  const formHits = list.filter((pair) => titlesMatch(pair.form?.title, query));
  const formIds = [...new Set(formHits.map((pair) => idText(pair.form?._id)))].filter(Boolean);
  if (formIds.length === 1) return { kind: "one", pairs: formHits };
  if (formIds.length > 1) return { kind: "many", pairs: formHits };

  const boardHits = list.filter((pair) => titlesMatch(pair.board?.name, query));
  const boardIds = [...new Set(boardHits.map((pair) => idText(pair.board?._id)))].filter(Boolean);
  if (boardIds.length === 1) {
    return {
      kind: "board",
      pairs: list.filter((pair) => idText(pair.board?._id) === boardIds[0]),
    };
  }
  if (boardIds.length > 1) return { kind: "many", pairs: boardHits };
  return { kind: "none", pairs: [] };
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

const needName = () => ({
  summary: "양식 이름이 필요합니다.",
  error: "양식 이름이 필요합니다.",
  forms: [],
});

const candidateRow = (pair) =>
  compact({
    form: clip(pair.form?.title, 80),
    board: clip(pair.board?.name, 80),
  });

const ambiguous = (pairs) => ({
  summary: "같은 이름의 양식이 여러 개입니다. 양식 이름을 더 구체적으로 말해 주세요.",
  candidates: (pairs || []).slice(0, FORM_CAP).map(candidateRow),
  forms: [],
});

const summarizeRows = (rows) => {
  const submitted = rows.reduce((sum, row) => sum + (row.submittedCount || 0), 0);
  const missing = rows.reduce((sum, row) => sum + (row.missingCount || 0), 0);
  return {
    summary: rows.length ? `제출 ${submitted}명 · 미제출 ${missing}명` : "양식 없음",
    forms: rows,
  };
};

const projectPairs = async (academyId, pairs) => {
  const rows = [];
  for (const pair of (pairs || []).slice(0, FORM_CAP)) {
    rows.push(await projectFormStatus(academyId, pair.form, pair.board));
  }
  return summarizeRows(rows);
};

/** owned class, other teacher's class, or a team/staff board with no syllabus. */
const boardAccess = (board, syllabus, user, schoolId) => {
  if (!board || board.isActive === false) return "missing";
  if (idText(board.school) !== idText(schoolId)) return "missing";
  if (board.syllabus) {
    return ownsOrManagesClass(syllabus, user, schoolId) ? "owned" : "other";
  }
  return "team";
};

const canSeeForm = (form, board, user, schoolRole, access) => {
  if (access !== "owned" && access !== "team") return false;
  return canViewAllRows(form, board, user, schoolRole || null);
};

const statusForBoard = async ({ academyId, user, schoolRole, schoolId, board, forms }) => {
  const syllabus = board?.syllabus
    ? await Syllabus(academyId).findById(board.syllabus).select("school user teachers").lean()
    : null;
  const access = boardAccess(board, syllabus, user, schoolId);
  if (access === "missing") return notFound();
  if (access === "other") return classDenied();
  const visible = (forms || []).filter((form) => canSeeForm(form, board, user, schoolRole, access));
  if (!visible.length) return forbidden();
  return projectPairs(
    academyId,
    visible.map((form) => ({ form, board }))
  );
};

const statusForQuery = async ({ academyId, user, schoolRole, schoolId, query }) => {
  const boards = await Board(academyId)
    .find({ school: schoolId, isActive: { $ne: false } })
    .limit(400)
    .lean();
  if (!boards.length) return notFound();
  const syllabusIds = boards.map((board) => board.syllabus).filter(Boolean);
  const syllabi = syllabusIds.length
    ? await Syllabus(academyId).find({ _id: { $in: syllabusIds } }).select("school user teachers").lean()
    : [];
  const syllabusById = new Map((syllabi || []).map((row) => [idText(row._id), row]));
  const boardById = new Map(boards.map((board) => [idText(board._id), board]));
  const forms = await AltForm(academyId)
    .find({
      board: { $in: boards.map((board) => board._id) },
      isActive: true,
      isDraft: { $ne: true },
    })
    .limit(500)
    .lean();
  const visible = [];
  const hiddenClass = [];
  for (const form of forms || []) {
    const board = boardById.get(idText(form.board));
    if (!board) continue;
    const access = boardAccess(board, syllabusById.get(idText(board.syllabus)), user, schoolId);
    const pair = { form, board };
    if (canSeeForm(form, board, user, schoolRole, access)) visible.push(pair);
    else if (access === "other") hiddenClass.push(pair);
  }
  const picked = pickSubmissionMatches(visible, query);
  if (picked.kind === "one" || picked.kind === "board") return projectPairs(academyId, picked.pairs);
  if (picked.kind === "many") return ambiguous(picked.pairs);
  if (pickSubmissionMatches(hiddenClass, query).kind !== "none") return classDenied();
  return notFound();
};

export const loadSubmissionStatus = async ({
  academyId,
  user,
  school,
  schoolRole,
  formId,
  boardId,
  query,
}) => {
  const schoolId = school?._id;
  const title = String(query || "").trim().slice(0, 120);
  if (!formId && !boardId && !title) return needName();
  if (!academyId || !schoolId || !user) {
    return {
      summary: "학교 또는 사용자 정보가 없습니다.",
      error: "학교 또는 사용자 정보가 없습니다.",
      forms: [],
    };
  }
  if (!formId && !boardId) {
    return statusForQuery({ academyId, user, schoolRole, schoolId, query: title });
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
  return statusForBoard({ academyId, user, schoolRole, schoolId, board, forms });
};
