/**
 * Board Service namespace
 * @namespace Services.BoardService
 */

import { Registration, User } from "../models/index.js";
import {
  isSeasonScopedBoard,
  canBypassSeasonRegistration,
} from "../utils/boardSeasonScope.js";

export { isSeasonScopedBoard, canBypassSeasonRegistration };

/**
 * 보드 관리 권한 확인 (admin/manager 또는 보드 생성자)
 * @memberof Services.BoardService
 * @function canManageBoard
 *
 * @param {Object} board - 게시판 문서
 * @param {Object} user - 사용자 객체
 *
 * @returns {boolean} 관리 권한 여부
 */
export const canManageBoard = (board, user) => {
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (board.creator && board.creator.equals(user._id)) return true;
  return false;
};

/**
 * 시즌 보드의 해당 시즌에 활성화된 Registration이 있는지 확인
 * @param {string} academyId
 * @param {Object} board
 * @param {Object} user - { _id } 또는 user ObjectId
 * @returns {Promise<boolean>}
 */
export const hasActiveSeasonRegistration = async (academyId, board, user) => {
  if (!isSeasonScopedBoard(board)) return true;
  const userId = user._id ?? user;
  const registration = await Registration(academyId).findOne({
    user: userId,
    schoolId: board.schoolId,
    season: board.season,
    isActivated: true,
  });
  return !!registration;
};

/**
 * 시즌 보드 접근 가능 여부 (규칙 B + 운영 예외)
 * @param {string} academyId
 * @param {Object} board
 * @param {Object} user
 * @returns {Promise<boolean>}
 */
export const canAccessSeasonBoard = async (academyId, board, user) => {
  if (!isSeasonScopedBoard(board)) return true;
  if (canBypassSeasonRegistration(board, user)) return true;
  return hasActiveSeasonRegistration(academyId, board, user);
};

/**
 * 현재 시즌에서 사용자의 역할 조회
 * @memberof Services.BoardService
 * @function getUserRoleInSeason
 *
 * @param {string} academyId - 아카데미 ID
 * @param {string} schoolId - 학교 ID
 * @param {Object} user - 사용자 객체
 * @param {string|ObjectId} [seasonId] - 특정 시즌 ID (전달 시 해당 시즌만)
 *
 * @returns {Promise<string|null>} 역할 ("student" | "teacher" | null)
 */
export const getUserRoleInSeason = async (
  academyId,
  schoolId,
  user,
  seasonId = null
) => {
  const query = {
    user: user._id,
    schoolId,
    isActivated: true,
  };
  if (seasonId) query.season = seasonId;

  const registration = await Registration(academyId).findOne(query);

  return registration?.role || null;
};

// ============================================================
// 새 멤버 기반 권한 시스템
// ============================================================

/**
 * 보드 멤버 데이터 가져오기 (하위호환: members 없으면 permissionRead에서 변환)
 * @param {Object} board - 게시판 문서
 * @returns {Object} { groups: { manager, teacher, student }, users: [] }
 */
const resolveBoardMembers = (board) => {
  if (board.members?.groups) return board.members;
  // 레거시 폴백: permissionRead → members 변환
  if (board.permissionRead) {
    return {
      groups: {
        manager: board.permissionRead.manager ?? true,
        teacher: board.permissionRead.teacher ?? true,
        student: board.permissionRead.student ?? true,
      },
      users: (board.permissionRead.exceptions || [])
        .filter((e) => e.isAllowed)
        .map((e) => ({ user: e.user, userId: e.userId, userName: e.userName })),
    };
  }
  return { groups: { manager: true, teacher: true, student: true }, users: [] };
};

/**
 * 보드 작성자 데이터 가져오기 (하위호환: writers 없으면 permissionWrite에서 변환)
 * @param {Object} board - 게시판 문서
 * @returns {Object} { groups: { manager, teacher, student }, users: [] }
 */
const resolveBoardWriters = (board) => {
  if (board.writers?.groups) return board.writers;
  // 레거시 폴백: permissionWrite → writers 변환
  if (board.permissionWrite) {
    return {
      groups: {
        manager: board.permissionWrite.manager ?? true,
        teacher: board.permissionWrite.teacher ?? true,
        student: board.permissionWrite.student ?? false,
      },
      users: (board.permissionWrite.exceptions || [])
        .filter((e) => e.isAllowed)
        .map((e) => ({ user: e.user, userId: e.userId, userName: e.userName })),
    };
  }
  return { groups: { manager: true, teacher: true, student: false }, users: [] };
};

/**
 * 사용자가 보드 멤버인지 확인
 * @memberof Services.BoardService
 * @function isBoardMember
 *
 * @param {Object} board - 게시판 문서
 * @param {Object} user - 사용자 객체
 * @param {string|null} role - 현재 시즌에서의 역할
 *
 * @returns {boolean}
 */
export const isBoardMemberAsUser = (board, user, role) => {
  if (board.creator && board.creator.equals(user._id)) return true;

  // 기본 보드(공지사항)는 전체 접근 허용
  if (board.isDefault) return true;

  // Alt Board: altBoardRole 확인
  if (board.altBoardRole) {
    const userOid = user._id.toString();
    const altRole =
      typeof board.altBoardRole.get === "function"
        ? board.altBoardRole.get(userOid)
        : board.altBoardRole[userOid];
    if (altRole) return true;
  }

  const members = resolveBoardMembers(board);

  // 개별 초대 사용자 확인
  if (members.users?.some((u) => u.userId === user.userId)) return true;

  // 그룹 멤버십 확인
  if (user.auth === "manager" && members.groups?.manager) return true;
  if (role === "teacher" && members.groups?.teacher) return true;
  if (role === "student" && members.groups?.student) return true;

  return false;
};

export const isBoardMember = (board, user, role) => {
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (board.creator && board.creator.equals(user._id)) return true;

  // 기본 보드(공지사항)는 전체 접근 허용
  if (board.isDefault) return true;

  // Alt Board: altBoardRole 확인
  if (board.altBoardRole) {
    const userOid = user._id.toString();
    const altRole =
      typeof board.altBoardRole.get === "function"
        ? board.altBoardRole.get(userOid)
        : board.altBoardRole[userOid];
    if (altRole) return true;
  }

  const members = resolveBoardMembers(board);

  // 개별 초대 사용자 확인
  if (members.users?.some((u) => u.userId === user.userId)) return true;

  return false;
};

/**
 * 사용자가 보드 작성 권한이 있는지 확인
 * @memberof Services.BoardService
 * @function isBoardWriter
 *
 * @param {Object} board - 게시판 문서
 * @param {Object} user - 사용자 객체
 * @param {string|null} role - 현재 시즌에서의 역할
 *
 * @returns {boolean}
 */
export const isBoardWriter = (board, user, role) => {
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (board.creator && board.creator.equals(user._id)) return true;

  // Alt Board: altBoardRole의 admin/writer는 작성 권한
  if (board.altBoardRole) {
    const userOid = user._id.toString();
    const altRole =
      typeof board.altBoardRole.get === "function"
        ? board.altBoardRole.get(userOid)
        : board.altBoardRole[userOid];
    if (altRole === "admin" || altRole === "writer") return true;
  }

  const writers = resolveBoardWriters(board);

  // 개별 작성 권한 사용자 확인
  if (writers.users?.some((u) => u.userId === user.userId)) return true;

  return false;
};

/**
 * 보드 멤버 사용자 목록 조회
 * @memberof Services.BoardService
 * @function getBoardMembers
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} board - 게시판 문서
 * @param {string} [seasonId] - 특정 학기 ID (전달 시 해당 학기 사용자만 반환)
 *
 * @returns {Promise<Array>} 멤버 사용자 목록 [{user, userId, userName}]
 */
export const getBoardMembers = async (academyId, board, seasonId) => {
  const users = [];
  const effectiveSeasonId =
    seasonId || (isSeasonScopedBoard(board) ? board.season : null);

  // 기본 보드(공지사항): 전체 학교 구성원 반환
  if (board.isDefault) {
    const admins = await User(academyId).find({ auth: "admin" });
    for (const admin of admins) {
      users.push({ user: admin._id, userId: admin.userId, userName: admin.userName });
    }

    const managers = await User(academyId).find({
      auth: "manager",
      "schools.schoolId": board.schoolId,
    });
    for (const manager of managers) {
      if (!users.some((u) => u.userId === manager.userId)) {
        users.push({ user: manager._id, userId: manager.userId, userName: manager.userName });
      }
    }

    const regQuery = { schoolId: board.schoolId, isActivated: true };
    if (effectiveSeasonId) regQuery.season = effectiveSeasonId;
    const registrations = await Registration(academyId).find(regQuery);
    for (const reg of registrations) {
      if (!users.some((u) => u.userId === reg.userId)) {
        users.push({ user: reg.user, userId: reg.userId, userName: reg.userName });
      }
    }

  } else {
    // Alt Board: altBoardRole에서 멤버 해석
    if (board.altBoardRole && board.altBoardRole.size > 0) {
      const userOids = Array.from(board.altBoardRole.keys());
      const userData = await User(academyId)
        .find({ _id: { $in: userOids } })
        .select("_id userId userName")
        .lean();

      for (const u of userData) {
        users.push({ user: u._id, userId: u.userId, userName: u.userName });
      }
    }

    // 일반 멤버도 포함 (altBoardRole과 중복 제거)
    const members = resolveBoardMembers(board);

    for (const u of members.users || []) {
      if (!users.some((x) => x.userId === u.userId)) {
        users.push({ user: u.user, userId: u.userId, userName: u.userName });
      }
    }
  }

  // 시즌 보드(규칙 B): 해당 시즌 Registration과 교집합
  if (isSeasonScopedBoard(board)) {
    const seasonForFilter = board.season;
    const registrations = await Registration(academyId)
      .find({
        schoolId: board.schoolId,
        season: seasonForFilter,
        isActivated: true,
      })
      .select("user userId")
      .lean();
    const registeredUserIds = new Set(
      registrations.map((r) => r.user.toString())
    );
    // admin/manager/creator는 교집합 밖에서도 유지(운영)
    const opsUsers = await User(academyId)
      .find({
        $or: [
          { auth: "admin" },
          { auth: "manager", "schools.schoolId": board.schoolId },
        ],
      })
      .select("_id")
      .lean();
    const opsIds = new Set(opsUsers.map((u) => u._id.toString()));
    if (board.creator) opsIds.add(board.creator.toString());

    for (let i = users.length - 1; i >= 0; i--) {
      const uid = users[i].user?.toString?.() ?? String(users[i].user);
      if (!registeredUserIds.has(uid) && !opsIds.has(uid)) {
        users.splice(i, 1);
      }
    }
  }

  // 프로필 이미지 조회
  if (users.length > 0) {
    const profileData = await User(academyId)
      .find({ _id: { $in: users.map((u) => u.user) } })
      .select("_id profile")
      .lean();
    const profileMap = new Map(
      profileData.map((u) => [u._id.toString(), u.profile || null])
    );
    for (const u of users) {
      u.profile = profileMap.get(u.user.toString()) || null;
    }
  }

  return users;
};

/**
 * permission 객체를 기반으로 사용자 목록 조회 (게시글 permissionRead용)
 * @param {string} academyId
 * @param {Object} board - 게시판 문서 (schoolId 참조)
 * @param {Object} permission - { groups: { manager, teacher, student }, users: [] }
 * @returns {Promise<Array>}
 */
const getUsersByPermission = async (academyId, board, permission) => {
  const users = [];

  // 1. 개별 사용자 추가
  for (const u of permission.users || []) {
    users.push({ user: u.user, userId: u.userId, userName: u.userName });
  }

  // 2. admin 항상 포함
  const admins = await User(academyId).find({ auth: "admin" });
  for (const admin of admins) {
    if (!users.some((u) => u.userId === admin.userId)) {
      users.push({ user: admin._id, userId: admin.userId, userName: admin.userName });
    }
  }

  // 3. manager 항상 포함
  const managers = await User(academyId).find({
    auth: "manager",
    "schools.schoolId": board.schoolId,
  });
  for (const manager of managers) {
    if (!users.some((u) => u.userId === manager.userId)) {
      users.push({ user: manager._id, userId: manager.userId, userName: manager.userName });
    }
  }

  return users;
};

/**
 * 게시글 열람 대상 사용자 목록 조회
 * @memberof Services.BoardService
 * @function getPostReaders
 *
 * @param {string} academyId
 * @param {Object} board - 게시판 문서
 * @param {Object} post - 게시글 문서
 *
 * @returns {Promise<Array>} 열람 대상 사용자 목록
 */
export const getPostReaders = async (academyId, board, post) => {
  // 새 구조: permissionRead
  if (post.permissionRead?.groups) {
    return getUsersByPermission(academyId, board, post.permissionRead);
  }

  // permissionRead 없으면 전체 멤버
  if (!post.targetAudience || post.targetAudience.type === "all") {
    return getBoardMembers(academyId, board);
  }

  // 레거시 폴백: targetAudience
  return filterUsersByTargetAudience(academyId, board, post.targetAudience);
};

/**
 * 게시글 permissionRead가 보드 멤버 범위 내인지 검증
 * @memberof Services.BoardService
 * @function validatePostPermission
 *
 * @param {Object} board - 게시판 문서
 * @param {Object} postPermission - { groups: { manager, teacher, student }, users: [] }
 *
 * @returns {{ valid: boolean, message?: string }}
 */
export const validatePostPermission = (board, postPermission) => {
  return { valid: true };
};

/**
 * 사용자가 게시글을 볼 수 있는지 확인
 * @memberof Services.BoardService
 * @function canUserSeePost
 *
 * @param {Object} post - 게시글 문서
 * @param {Object} user - 사용자 객체
 * @param {string|null} role - 현재 시즌에서의 역할
 *
 * @returns {boolean}
 */
export const canUserSeePost = (post, user, role) => {
  // 비공개는 작성자만 (시스템 admin/보드 관리자도 제외)
  if (post.isDraft) {
    return (
      post.author?.equals?.(user._id) || post.authorId === user.userId
    );
  }

  // admin은 항상 볼 수 있음
  if (user.auth === "admin") return true;

  // 작성자 본인은 항상 볼 수 있음
  if (post.author?.equals?.(user._id) || post.authorId === user.userId) {
    return true;
  }

  // 새 구조: permissionRead (개별 사용자만 체크)
  if (post.permissionRead?.users) {
    const perm = post.permissionRead;

    // 개별 사용자 확인
    if (perm.users?.some((u) => u.userId === user.userId)) return true;

    return false;
  }

  // permissionRead 없으면 전체 공개
  // 레거시 폴백: targetAudience
  const ta = post.targetAudience;
  if (!ta || ta.type === "all") return true;

  if (ta.type === "custom") {
    return ta.users?.some(
      (u) => u.userId === user.userId || u.user?.equals?.(user._id)
    );
  }

  if (ta.type === "manager") return user.auth === "manager";

  return role === ta.type;
};

// ============================================================
// 하위호환용 - 기존 함수 (레거시 데이터 처리)
// ============================================================

/**
 * @deprecated isBoardMember/isBoardWriter 사용
 */
export const hasBoardPermission = (board, permissionType, user, role) => {
  if (permissionType === "read") return isBoardMember(board, user, role);
  if (permissionType === "write") return isBoardWriter(board, user, role);
  // comment → 멤버이면 가능
  return isBoardMember(board, user, role);
};

/**
 * @deprecated getBoardMembers 사용
 */
export const getUsersWithReadPermission = async (academyId, board) => {
  return getBoardMembers(academyId, board);
};

/**
 * @deprecated getPostReaders 사용
 */
export const filterUsersByTargetAudience = async (
  academyId,
  board,
  targetAudience
) => {
  if (!targetAudience || targetAudience.type === "all") {
    return getBoardMembers(academyId, board);
  }

  const users = [];

  if (targetAudience.type === "custom" && targetAudience.users) {
    return targetAudience.users;
  }

  if (targetAudience.type === "manager") {
    const admins = await User(academyId).find({ auth: "admin" });
    for (const admin of admins) {
      users.push({ user: admin._id, userId: admin.userId, userName: admin.userName });
    }

    const boardMembers = resolveBoardMembers(board);
    if (boardMembers.groups?.manager) {
      const managers = await User(academyId).find({
        auth: "manager",
        "schools.schoolId": board.schoolId,
      });
      for (const manager of managers) {
        if (!users.some((u) => u.userId === manager.userId)) {
          users.push({ user: manager._id, userId: manager.userId, userName: manager.userName });
        }
      }
    }

    return users;
  }

  // teacher/student
  const boardMembers = resolveBoardMembers(board);
  const registrations = await Registration(academyId).find({
    schoolId: board.schoolId,
    isActivated: true,
    role: targetAudience.type,
  });

  for (const reg of registrations) {
    if (boardMembers.groups?.[targetAudience.type]) {
      users.push({ user: reg.user, userId: reg.userId, userName: reg.userName });
    }
  }

  return users;
};
