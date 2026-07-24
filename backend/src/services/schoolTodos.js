/**
 * School-wide Alt Board todos (approve / outgoing / unsubmitted)
 * Batched queries to avoid per-board / per-form N+1.
 */

import { AltForm, AltSheetRow, Board, Registration } from "../models/index.js";
import {
  isBoardMemberAsUser,
  isSeasonScopedBoard,
  canBypassSeasonRegistration,
} from "./boards.js";
import {
  assembleSchoolTodos,
  sortSchoolTodos,
} from "../utils/schoolTodosAssemble.js";

export { assembleSchoolTodos, sortSchoolTodos };

const APPROVER_ROWS_LIMIT = 200;

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

  // 사용자 Registration 1회 (시즌 role / 시즌 보드 접근)
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
    return { items: [], count: 0 };
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
    return { items: [], count: 0 };
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

  const items = assembleSchoolTodos({
    boards: accessibleBoards,
    forms,
    myRows,
    approverRows,
    user,
  });

  return { items, count: items.length };
};
