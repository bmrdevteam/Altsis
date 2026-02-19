/**
 * Board Service namespace
 * @namespace Services.BoardService
 */

import { Registration, User } from "../models/index.js";

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
 * 현재 시즌에서 사용자의 역할 조회
 * @memberof Services.BoardService
 * @function getUserRoleInSeason
 *
 * @param {string} academyId - 아카데미 ID
 * @param {string} schoolId - 학교 ID
 * @param {Object} user - 사용자 객체
 *
 * @returns {Promise<string|null>} 역할 ("student" | "teacher" | null)
 */
export const getUserRoleInSeason = async (academyId, schoolId, user) => {
  const registration = await Registration(academyId).findOne({
    user: user._id,
    schoolId,
    isActivated: true,
  });

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
export const isBoardMember = (board, user, role) => {
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (board.creator && board.creator.equals(user._id)) return true;

  const members = resolveBoardMembers(board);

  // 개별 초대 사용자 확인
  if (members.users?.some((u) => u.userId === user.userId)) return true;

  // 역할 그룹 확인
  if (members.groups?.manager && user.auth === "manager") return true;
  if (role === "teacher" && members.groups?.teacher) return true;
  if (role === "student" && members.groups?.student) return true;

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

  const writers = resolveBoardWriters(board);

  // 개별 작성 권한 사용자 확인
  if (writers.users?.some((u) => u.userId === user.userId)) return true;

  // 역할 그룹 확인
  if (writers.groups?.manager && user.auth === "manager") return true;
  if (role === "teacher" && writers.groups?.teacher) return true;
  if (role === "student" && writers.groups?.student) return true;

  return false;
};

/**
 * 보드 멤버 사용자 목록 조회
 * @memberof Services.BoardService
 * @function getBoardMembers
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} board - 게시판 문서
 *
 * @returns {Promise<Array>} 멤버 사용자 목록 [{user, userId, userName}]
 */
export const getBoardMembers = async (academyId, board) => {
  const members = resolveBoardMembers(board);
  const users = [];

  // 1. 개별 초대 사용자 추가
  for (const u of members.users || []) {
    users.push({ user: u.user, userId: u.userId, userName: u.userName });
  }

  // 2. admin 사용자는 항상 포함
  const admins = await User(academyId).find({ auth: "admin" });
  for (const admin of admins) {
    if (!users.some((u) => u.userId === admin.userId)) {
      users.push({ user: admin._id, userId: admin.userId, userName: admin.userName });
    }
  }

  // 3. manager 그룹
  if (members.groups?.manager) {
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

  // 4. teacher/student 그룹
  const roleQuery = [];
  if (members.groups?.teacher) roleQuery.push("teacher");
  if (members.groups?.student) roleQuery.push("student");

  if (roleQuery.length > 0) {
    const registrations = await Registration(academyId).find({
      schoolId: board.schoolId,
      isActivated: true,
      role: { $in: roleQuery },
    });
    for (const reg of registrations) {
      if (!users.some((u) => u.userId === reg.userId)) {
        users.push({ user: reg.user, userId: reg.userId, userName: reg.userName });
      }
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

  // 3. manager 그룹
  if (permission.groups?.manager) {
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

  // 4. teacher/student 그룹
  const roleQuery = [];
  if (permission.groups?.teacher) roleQuery.push("teacher");
  if (permission.groups?.student) roleQuery.push("student");

  if (roleQuery.length > 0) {
    const registrations = await Registration(academyId).find({
      schoolId: board.schoolId,
      isActivated: true,
      role: { $in: roleQuery },
    });
    for (const reg of registrations) {
      if (!users.some((u) => u.userId === reg.userId)) {
        users.push({ user: reg.user, userId: reg.userId, userName: reg.userName });
      }
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
  if (!postPermission) return { valid: true };

  const boardMembers = resolveBoardMembers(board);

  if (!boardMembers.groups?.manager && postPermission.groups?.manager) {
    return { valid: false, message: "보드 멤버에 관리자 그룹이 포함되어 있지 않습니다." };
  }
  if (!boardMembers.groups?.teacher && postPermission.groups?.teacher) {
    return { valid: false, message: "보드 멤버에 교사 그룹이 포함되어 있지 않습니다." };
  }
  if (!boardMembers.groups?.student && postPermission.groups?.student) {
    return { valid: false, message: "보드 멤버에 학생 그룹이 포함되어 있지 않습니다." };
  }

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
  // admin은 항상 볼 수 있음
  if (user.auth === "admin") return true;

  // 작성자 본인은 항상 볼 수 있음
  if (post.author?.equals?.(user._id) || post.authorId === user.userId) {
    return true;
  }

  // 새 구조: permissionRead
  if (post.permissionRead?.groups) {
    const perm = post.permissionRead;

    // 개별 사용자 확인
    if (perm.users?.some((u) => u.userId === user.userId)) return true;

    // 역할 그룹 확인
    if (perm.groups.manager && user.auth === "manager") return true;
    if (role === "teacher" && perm.groups.teacher) return true;
    if (role === "student" && perm.groups.student) return true;

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
