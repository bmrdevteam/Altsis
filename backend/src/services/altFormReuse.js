/**
 * 양식 구조 재사용: 자신이 만든 양식과 자신에게 열린 양식만 고른다.
 * 응답 행은 복사하지 않는다.
 */
import { AltForm, Board } from "../models/index.js";
import { isFormMember } from "./altForms.js";
import {
  canAccessSeasonBoardFromRoles,
  loadUserSeasonRoles,
  resolveAltBoardRole,
  resolveBoardSeasonRole,
} from "./boards.js";
import { isSchoolManager } from "../utils/schoolManager.js";

export const REUSABLE_FORM_LIMIT = 40;
const CANDIDATE_LIMIT = 80;

const idsEqual = (a, b) => {
  if (a == null || b == null) return false;
  if (typeof a.equals === "function") return a.equals(b);
  if (typeof b.equals === "function") return b.equals(a);
  return String(a) === String(b);
};

/**
 * 재사용 원본으로 쓸 수 있는지.
 * 비공개 초안은 작성자만. 공개 양식은 작성자이거나 양식 멤버(isFormMember).
 * @param {Object} form
 * @param {Object} board
 * @param {Object} user
 * @param {string|null} [schoolRole]
 * @returns {boolean}
 */
export const canReuseAltFormSource = (form, board, user, schoolRole = null) => {
  if (!form || form.isActive === false || !board || !user) return false;
  const isCreator = !!(form.creator && idsEqual(form.creator, user._id));
  if (form.isDraft) return isCreator;
  if (isCreator) return true;
  return isFormMember(form, board, user, schoolRole);
};

/** 검색어를 정규식 리터럴로 이스케이프. 빈 문자열이면 null. 최대 80자. */
export const reuseSearchPattern = (raw) => {
  const text = String(raw || "").trim().slice(0, 80);
  if (!text) return null;
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const toReusableFormSummary = (form, board, user) => ({
  _id: String(form._id),
  title: form.title || "제목 없음",
  description: String(form.description || ""),
  boardId: String(form.board),
  boardName: board?.name || "",
  isMine: !!(form.creator && idsEqual(form.creator, user._id)),
  isDraft: !!form.isDraft,
  updatedAt: form.updatedAt || null,
});

export const sortReusableForms = (forms) =>
  [...forms].sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (at !== bt) return bt - at;
    return String(a.title).localeCompare(String(b.title), "ko");
  });

/**
 * @param {Object[]} forms
 * @param {Object} user
 * @param {Map<string, Object>} boardsById
 * @param {(board: Object) => string|null} roleForBoard
 * @param {{ excludeId?: string, limit?: number }} [options]
 */
export const pickReusableForms = (
  forms,
  user,
  boardsById,
  roleForBoard,
  options = {}
) => {
  const exclude = options.excludeId ? String(options.excludeId) : "";
  const limit = options.limit ?? REUSABLE_FORM_LIMIT;
  const picked = [];
  for (const form of forms) {
    if (exclude && String(form._id) === exclude) continue;
    const board = boardsById.get(String(form.board));
    if (!board) continue;
    const schoolRole = roleForBoard(board);
    if (!canReuseAltFormSource(form, board, user, schoolRole)) continue;
    picked.push(toReusableFormSummary(form, board, user));
  }
  return sortReusableForms(picked).slice(0, limit);
};

const boardVisibleToUser = (board, user, schoolRole) => {
  if (!board) return false;
  if (user?.auth === "admin") return true;
  if (isSchoolManager(user, board.school || board.schoolId)) return true;
  return !!resolveAltBoardRole(board, user, schoolRole);
};

const FORM_FIELDS =
  "title description board creator isDraft isActive updatedAt members writers";

/**
 * 대상 보드와 같은 학교의 재사용 가능 양식 목록.
 * @param {Object} params
 * @param {string} params.academyId
 * @param {Object} params.user
 * @param {Object} params.targetBoard
 * @param {string} [params.query]
 * @param {string} [params.excludeId]
 */
export const listReusableAltForms = async ({
  academyId,
  user,
  targetBoard,
  query = "",
  excludeId = "",
}) => {
  const boards = await Board(academyId)
    .find({
      school: targetBoard.school,
      isActive: true,
    })
    .select(
      "name school schoolId scope season creator members permissionRead altBoardRole isDefault"
    )
    .lean();

  const { roleBySeason, registeredSeasonIds } = await loadUserSeasonRoles(
    academyId,
    targetBoard.schoolId,
    user
  );
  const fallbackRole = roleBySeason.values().next().value || null;
  const boardsById = new Map(boards.map((board) => [String(board._id), board]));
  const roleForBoard = (board) =>
    resolveBoardSeasonRole(board, roleBySeason, fallbackRole);

  const memberBoardIds = [];
  for (const board of boards) {
    if (
      !canAccessSeasonBoardFromRoles(board, user, registeredSeasonIds)
    ) {
      continue;
    }
    const schoolRole = roleForBoard(board);
    if (boardVisibleToUser(board, user, schoolRole)) {
      memberBoardIds.push(board._id);
    }
  }

  const pattern = reuseSearchPattern(query);
  const textClause = pattern
    ? {
        $or: [
          { title: new RegExp(pattern, "i") },
          { description: new RegExp(pattern, "i") },
        ],
      }
    : null;

  const schoolBoardIds = boards.map((board) => board._id);
  if (schoolBoardIds.length === 0) {
    return { forms: [], truncated: false };
  }

  const creatorQuery = {
    isActive: true,
    creator: user._id,
    board: { $in: schoolBoardIds },
    ...(textClause || {}),
  };
  const sharedQuery = {
    isActive: true,
    isDraft: { $ne: true },
    creator: { $ne: user._id },
    board: { $in: memberBoardIds },
    ...(textClause || {}),
  };

  const [mine, shared] = await Promise.all([
    AltForm(academyId)
      .find(creatorQuery)
      .select(FORM_FIELDS)
      .sort({ updatedAt: -1 })
      .limit(CANDIDATE_LIMIT)
      .lean(),
    memberBoardIds.length
      ? AltForm(academyId)
          .find(sharedQuery)
          .select(FORM_FIELDS)
          .sort({ updatedAt: -1 })
          .limit(CANDIDATE_LIMIT)
          .lean()
      : [],
  ]);

  const forms = pickReusableForms(
    [...mine, ...shared],
    user,
    boardsById,
    roleForBoard,
    { excludeId, limit: REUSABLE_FORM_LIMIT }
  );
  const hitCap = mine.length >= CANDIDATE_LIMIT || shared.length >= CANDIDATE_LIMIT;
  return {
    forms,
    truncated: hitCap && forms.length >= REUSABLE_FORM_LIMIT,
  };
};
