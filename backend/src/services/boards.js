/**
 * Board Service namespace
 * @namespace Services.BoardService
 */

import { Registration, User } from "../models/index.js";

/**
 * 사용자의 게시판 권한 확인
 * @memberof Services.BoardService
 * @function hasBoardPermission
 *
 * @param {Object} board - 게시판 문서
 * @param {string} permissionType - 권한 유형 ("read" | "write" | "comment")
 * @param {Object} user - 사용자 객체
 * @param {string} role - 현재 학기에서의 역할 ("student" | "teacher" | null)
 *
 * @returns {boolean} 권한 여부
 */
export const hasBoardPermission = (board, permissionType, user, role) => {
  // 0. admin은 항상 모든 권한을 가짐
  if (user.auth === "admin") {
    return true;
  }

  let permission;
  switch (permissionType) {
    case "read":
      permission = board.permissionRead;
      break;
    case "write":
      permission = board.permissionWrite;
      break;
    case "comment":
      permission = board.permissionComment || { manager: true, teacher: true, student: true, exceptions: [] };
      break;
    default:
      permission = board.permissionRead;
  }

  // 1. 예외 사용자 체크 (일부 사용자)
  for (let exception of permission.exceptions) {
    if (exception.userId === user.userId) {
      return exception.isAllowed;
    }
  }

  // 2. 관리자 권한 체크 (manager)
  if (permission.manager && user.auth === "manager") {
    return true;
  }

  // 3. 역할 기반 권한 체크 (교사/학생)
  if (role === "teacher" && permission.teacher) {
    return true;
  }
  if (role === "student" && permission.student) {
    return true;
  }

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
  // 현재 활성화된 시즌의 등록 정보 조회
  const registration = await Registration(academyId).findOne({
    user: user._id,
    schoolId,
    isActivated: true,
  });

  return registration?.role || null;
};

/**
 * 게시판에 읽기 권한이 있는 사용자 목록 조회
 * @memberof Services.BoardService
 * @function getUsersWithReadPermission
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} board - 게시판 문서
 *
 * @returns {Promise<Array>} 읽기 권한이 있는 사용자 목록
 */
export const getUsersWithReadPermission = async (academyId, board) => {
  const permission = board.permissionRead;
  const users = [];

  // 1. 예외 사용자 중 허용된 사용자 추가
  for (let exception of permission.exceptions) {
    if (exception.isAllowed) {
      users.push({
        user: exception.user,
        userId: exception.userId,
        userName: exception.userName,
      });
    }
  }

  // 2. admin 사용자는 항상 포함 (모든 게시판 접근 권한)
  const admins = await User(academyId).find({
    auth: "admin",
  });
  for (let admin of admins) {
    if (!users.some((u) => u.userId === admin.userId)) {
      users.push({
        user: admin._id,
        userId: admin.userId,
        userName: admin.userName,
      });
    }
  }

  // 3. 관리자 권한이 있는 경우 manager 사용자 추가
  if (permission.manager) {
    const managers = await User(academyId).find({
      auth: "manager",
      "schools.schoolId": board.schoolId,
    });

    for (let manager of managers) {
      // 중복 체크
      if (!users.some((u) => u.userId === manager.userId)) {
        users.push({
          user: manager._id,
          userId: manager.userId,
          userName: manager.userName,
        });
      }
    }
  }

  // 4. 역할 기반으로 사용자 조회 (교사/학생)
  const roleQuery = [];
  if (permission.teacher) {
    roleQuery.push("teacher");
  }
  if (permission.student) {
    roleQuery.push("student");
  }

  if (roleQuery.length > 0) {
    const registrations = await Registration(academyId).find({
      schoolId: board.schoolId,
      isActivated: true,
      role: { $in: roleQuery },
    });

    for (let reg of registrations) {
      // 중복 체크
      if (!users.some((u) => u.userId === reg.userId)) {
        users.push({
          user: reg.user,
          userId: reg.userId,
          userName: reg.userName,
        });
      }
    }
  }

  return users;
};

/**
 * 대상 지정에 따라 읽기 권한 사용자 필터링
 * @memberof Services.BoardService
 * @function filterUsersByTargetAudience
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} board - 게시판 문서
 * @param {Object} targetAudience - 대상 설정 { type, users, grade }
 *
 * @returns {Promise<Array>} 필터링된 사용자 목록
 */
export const filterUsersByTargetAudience = async (
  academyId,
  board,
  targetAudience
) => {
  // 기본값은 전체
  if (!targetAudience || targetAudience.type === "all") {
    return getUsersWithReadPermission(academyId, board);
  }

  const users = [];

  // custom 타입인 경우 지정된 사용자 목록 반환
  if (targetAudience.type === "custom" && targetAudience.users) {
    return targetAudience.users;
  }

  // manager 타입인 경우 admin은 항상 포함, manager는 권한 확인
  if (targetAudience.type === "manager") {
    // admin 사용자는 항상 포함
    const admins = await User(academyId).find({ auth: "admin" });
    for (let admin of admins) {
      users.push({
        user: admin._id,
        userId: admin.userId,
        userName: admin.userName,
      });
    }

    // manager 권한이 있는 경우 manager 추가
    if (board.permissionRead.manager) {
      const managers = await User(academyId).find({
        auth: "manager",
        "schools.schoolId": board.schoolId,
      });

      for (let manager of managers) {
        if (!users.some((u) => u.userId === manager.userId)) {
          users.push({
            user: manager._id,
            userId: manager.userId,
            userName: manager.userName,
          });
        }
      }
    }

    return users;
  }

  // teacher/student는 Registration에서 조회
  const registrations = await Registration(academyId).find({
    schoolId: board.schoolId,
    isActivated: true,
    role: targetAudience.type,
  });

  for (let reg of registrations) {
    // 읽기 권한이 있는지 확인
    if (board.permissionRead[targetAudience.type]) {
      users.push({
        user: reg.user,
        userId: reg.userId,
        userName: reg.userName,
      });
    }
  }

  return users;
};
