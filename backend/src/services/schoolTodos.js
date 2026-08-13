/**
 * School-wide Alt Board todos (approve / grade / outgoing / unsubmitted)
 * Batched queries to avoid per-board / per-form N+1.
 */

import { AltForm, AltSheetRow, Board, Registration } from "../models/index.js";
import {
  isBoardMemberAsUser,
  isSeasonScopedBoard,
  canBypassSeasonRegistration,
} from "./boards.js";
import { canViewAllRows } from "./altForms.js";
import {
  assembleSchoolTodos,
  sortSchoolTodos,
} from "../utils/schoolTodosAssemble.js";
import { countRequiredFormProgress } from "../utils/requiredFormProgress.js";

export { assembleSchoolTodos, sortSchoolTodos };

const APPROVER_ROWS_LIMIT = 200;
const PENDING_GRADE_ROWS_LIMIT = 500;

/**
 * Accessible alt boards + forms + myRows for a user (shared by todos / goals).
 *
 * @param {string} academyId
 * @param {Object} school
 * @param {Object} user
 * @param {string|null} currentSeasonId
 * @returns {Promise<{ boards: Object[], forms: Object[], myRows: Object[] }|null>}
 */
export const loadAccessibleAltBoardFormsContext = async (
  academyId,
  school,
  user,
  currentSeasonId = null
) => {
  const boards = await Board(academyId).find({
    school: school._id,
    isActive: true,
    boardMode: "alt",
    $or: [
      { scope: "school" },
      { scope: { $exists: false } },
      { scope: null },
      ...(currentSeasonId
        ? [{ scope: "season", season: currentSeasonId }]
        : []),
    ],
  });

  const registrations = await Registration(academyId)
    .find({
      user: user._id,
      schoolId: school.schoolId,
      isActivated: true,
    })
    .select("season role")
    .lean();

  const roleBySeason = new Map(
    registrations.map((r) => [
      r.season?.toString?.() ?? String(r.season),
      r.role,
    ])
  );
  const registeredSeasonIds = new Set(roleBySeason.keys());

  const seasonRole = currentSeasonId
    ? roleBySeason.get(String(currentSeasonId)) || null
    : registrations[0]?.role || null;

  const accessibleBoards = [];
  for (const board of boards) {
    if (isSeasonScopedBoard(board)) {
      if (!canBypassSeasonRegistration(board, user)) {
        if (!registeredSeasonIds.has(board.season.toString())) {
          continue;
        }
      }
    }

    const boardRole = isSeasonScopedBoard(board)
      ? roleBySeason.get(board.season.toString()) || null
      : seasonRole;

    if (isBoardMemberAsUser(board, user, boardRole)) {
      accessibleBoards.push(board);
    }
  }

  if (accessibleBoards.length === 0) {
    return null;
  }

  const accessibleBoardIds = accessibleBoards.map((b) => b._id);

  const forms = await AltForm(academyId)
    .find({
      board: { $in: accessibleBoardIds },
      isActive: true,
      isDraft: { $ne: true },
    })
    .lean();

  if (forms.length === 0) {
    return null;
  }

  const formIds = forms.map((f) => f._id);

  const myRows = await AltSheetRow(academyId)
    .find({
      form: { $in: formIds },
      _respondent: user._id,
      isActive: true,
    })
    .select(
      "form createdAt data _submittedAt _respondentName _respondentId"
    )
    .lean();

  return { boards: accessibleBoards, forms, myRows, schoolRole: seasonRole };
};

/**
 * @param {string} academyId
 * @param {Object} school - school document
 * @param {Object} user - req.user
 * @param {string|null} currentSeasonId
 * @returns {Promise<{ items: Object[], count: number }>}
 */
export const getSchoolTodosForUser = async (
  academyId,
  school,
  user,
  currentSeasonId = null
) => {
  const ctx = await loadAccessibleAltBoardFormsContext(
    academyId,
    school,
    user,
    currentSeasonId
  );

  if (!ctx) {
    return { items: [], count: 0 };
  }

  const { boards: accessibleBoards, forms, myRows, schoolRole } = ctx;

  const orConds = [];
  for (const form of forms) {
    const approvalFields = (form.fields || []).filter(
      (f) => f.type === "approval"
    );
    if (approvalFields.length === 0) continue;
    for (const field of approvalFields) {
      const fid = field._id.toString();
      orConds.push(
        {
          form: form._id,
          [`data.${fid}.currentApproverUserId`]: user.userId,
        },
        {
          form: form._id,
          [`data.${fid}.approver.userId`]: user.userId,
        }
      );
    }
  }

  let approverRows = [];
  if (orConds.length > 0) {
    approverRows = await AltSheetRow(academyId)
      .find({
        isActive: true,
        $or: orConds,
      })
      .sort({ _submittedAt: -1 })
      .limit(APPROVER_ROWS_LIMIT)
      .lean();
  }

  const boardsById = new Map(
    accessibleBoards.map((b) => [b._id.toString(), b])
  );
  const gradeFormIds = [];
  for (const form of forms) {
    if (!form.settings?.assessmentMode) continue;
    if (form.settings?.directInputMode) continue;
    const board = boardsById.get(form.board.toString());
    if (!board) continue;
    if (
      !canViewAllRows(form, board, user, schoolRole) &&
      user.auth !== "manager"
    ) {
      continue;
    }
    gradeFormIds.push(form._id);
  }

  let pendingGradeRows = [];
  if (gradeFormIds.length > 0) {
    pendingGradeRows = await AltSheetRow(academyId)
      .find({
        form: { $in: gradeFormIds },
        isActive: true,
        _respondent: { $exists: true, $ne: null },
        _submittedAt: { $exists: true, $ne: null },
        "data._assessment.final.status": { $ne: "finalized" },
      })
      .select("form _submittedAt createdAt")
      .sort({ _submittedAt: -1 })
      .limit(PENDING_GRADE_ROWS_LIMIT)
      .lean();
  }

  const items = assembleSchoolTodos({
    boards: accessibleBoards,
    forms,
    myRows,
    approverRows,
    pendingGradeRows,
    user,
    schoolRole: schoolRole || null,
  });

  return { items, count: items.length };
};

/**
 * Required-form progress for goals (submitted / total).
 *
 * @param {string} academyId
 * @param {Object} school
 * @param {Object} user
 * @param {string|null} currentSeasonId
 * @returns {Promise<{ submitted: number, total: number }>}
 */
export const getRequiredFormProgressForUser = async (
  academyId,
  school,
  user,
  currentSeasonId = null
) => {
  if (school.boardEnabled === false) {
    return { submitted: 0, total: 0 };
  }

  const ctx = await loadAccessibleAltBoardFormsContext(
    academyId,
    school,
    user,
    currentSeasonId
  );

  if (!ctx) {
    return { submitted: 0, total: 0 };
  }

  return countRequiredFormProgress({
    boards: ctx.boards,
    forms: ctx.forms,
    myRows: ctx.myRows,
    user,
  });
};
