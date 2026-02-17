/**
 * BoardAPI namespace
 * @namespace APIs.BoardAPI
 * @see TBoard in {@link Models.Board}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { Board, School } from "../models/index.js";
import {
  hasBoardPermission,
  getUserRoleInSeason,
} from "../services/boards.js";

import {
  FIELD_REQUIRED,
  FIELD_IN_USE,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.BoardAPI
 * @function CBoard API
 * @description 게시판 생성 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/boards"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.school - school._id
 * @param {string} req.body.name - 게시판 이름
 * @param {string?} req.body.description - 게시판 설명
 *
 * @param {Object} res
 * @param {Object} res.board - 생성된 게시판
 */
export const create = async (req, res) => {
  try {
    for (let field of ["school", "name"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // slug 생성 (이름을 URL-safe하게 변환)
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `board-${Date.now()}`;

    // 중복 slug 확인
    const existingBoard = await Board(req.user.academyId).findOne({
      school: school._id,
      slug,
    });
    if (existingBoard) {
      return res.status(409).send({ message: FIELD_IN_USE("board") });
    }

    const board = await Board(req.user.academyId).create({
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      name: req.body.name,
      slug,
      description: req.body.description || "",
      creator: req.user._id,
      creatorId: req.user.userId,
      creatorName: req.user.userName,
      permissionWrite: req.body.permissionWrite || {
        manager: true,
        teacher: true,
        student: false,
        exceptions: [],
      },
      permissionRead: req.body.permissionRead || {
        manager: true,
        teacher: true,
        student: true,
        exceptions: [],
      },
    });

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function RBoards/RBoard API
 * @description 게시판 목록/상세 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/boards/:_id?"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.school - school._id (목록 조회시)
 *
 * @param {Object} res
 * @param {Object[]} res.boards - 게시판 목록 또는
 * @param {Object} res.board - 게시판 상세
 */
export const find = async (req, res) => {
  try {
    /* RBoard */
    if (req.params._id) {
      const board = await Board(req.user.academyId).findById(req.params._id);
      if (!board) {
        return res.status(404).send({ message: __NOT_FOUND("board") });
      }

      // 읽기 권한 확인
      const role = await getUserRoleInSeason(
        req.user.academyId,
        board.schoolId,
        req.user
      );
      if (!hasBoardPermission(board, "read", req.user, role)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      return res.status(200).send({ board });
    }

    /* RBoards */
    if (!("school" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    const school = await School(req.user.academyId).findById(req.query.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const role = await getUserRoleInSeason(
      req.user.academyId,
      school.schoolId,
      req.user
    );

    // 기본 게시판(공지사항)이 없으면 자동 생성
    const defaultBoard = await Board(req.user.academyId).findOne({
      school: school._id,
      isDefault: true,
    });
    if (!defaultBoard) {
      await createDefaultBoard(req.user.academyId, school);
    }

    const boards = await Board(req.user.academyId)
      .find({ school: school._id, isActive: true })
      .sort({ isDefault: -1, order: 1, createdAt: 1 });

    // 읽기 권한이 있는 게시판만 필터링
    const accessibleBoards = boards.filter((board) =>
      hasBoardPermission(board, "read", req.user, role)
    );

    return res.status(200).send({ boards: accessibleBoards });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function UBoard API
 * @description 게시판 수정 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/boards/:_id"} req.url
 *
 * @param {Object} req.body
 * @param {string?} req.body.name - 게시판 이름
 * @param {string?} req.body.description - 게시판 설명
 * @param {number?} req.body.order - 정렬 순서
 *
 * @param {Object} res
 * @param {Object} res.board - 수정된 게시판
 */
export const update = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 기본 게시판은 이름 변경 불가
    if (board.isDefault && req.body.name && req.body.name !== board.name) {
      return res.status(400).send({ message: "기본 게시판의 이름은 변경할 수 없습니다." });
    }

    if (req.body.name) board.name = req.body.name;
    if ("description" in req.body) board.description = req.body.description;
    if ("order" in req.body) board.order = req.body.order;

    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function UBoardPermission API
 * @description 게시판 권한 수정 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/boards/:_id/permission/:type"} req.url
 *
 * @param {Object} req.body
 * @param {boolean?} req.body.manager - 관리자 권한
 * @param {boolean?} req.body.teacher - 교사 권한
 * @param {boolean?} req.body.student - 학생 권한
 *
 * @param {Object} res
 * @param {Object} res.board - 수정된 게시판
 */
export const updatePermission = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const permissionType = req.params.type; // "read", "write", or "comment"
    if (!["read", "write", "comment"].includes(permissionType)) {
      return res.status(400).send({ message: "Invalid permission type" });
    }

    let permissionField;
    switch (permissionType) {
      case "read":
        permissionField = "permissionRead";
        break;
      case "write":
        permissionField = "permissionWrite";
        break;
      case "comment":
        permissionField = "permissionComment";
        // permissionComment가 없으면 기본값으로 초기화
        if (!board.permissionComment) {
          board.permissionComment = { manager: true, teacher: true, student: true, exceptions: [] };
        }
        break;
    }

    if ("manager" in req.body) {
      board[permissionField].manager = req.body.manager;
    }
    if ("teacher" in req.body) {
      board[permissionField].teacher = req.body.teacher;
    }
    if ("student" in req.body) {
      board[permissionField].student = req.body.student;
    }

    board.markModified(permissionField);
    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function CBoardPermissionException API
 * @description 게시판 권한 예외 추가 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/boards/:_id/permission/:type/exceptions"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.user - user._id
 * @param {string} req.body.userId
 * @param {string} req.body.userName
 * @param {boolean} req.body.isAllowed
 *
 * @param {Object} res
 * @param {Object} res.board - 수정된 게시판
 */
export const addPermissionException = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    for (let field of ["user", "userId", "userName", "isAllowed"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const permissionType = req.params.type;
    if (!["read", "write", "comment"].includes(permissionType)) {
      return res.status(400).send({ message: "Invalid permission type" });
    }

    let permissionField;
    switch (permissionType) {
      case "read":
        permissionField = "permissionRead";
        break;
      case "write":
        permissionField = "permissionWrite";
        break;
      case "comment":
        permissionField = "permissionComment";
        if (!board.permissionComment) {
          board.permissionComment = { manager: true, teacher: true, student: true, exceptions: [] };
        }
        break;
    }

    // 중복 체크
    const existingException = board[permissionField].exceptions.find(
      (e) => e.userId === req.body.userId
    );
    if (existingException) {
      existingException.isAllowed = req.body.isAllowed;
    } else {
      board[permissionField].exceptions.push({
        user: req.body.user,
        userId: req.body.userId,
        userName: req.body.userName,
        isAllowed: req.body.isAllowed,
      });
    }

    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function DBoardPermissionException API
 * @description 게시판 권한 예외 삭제 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/boards/:_id/permission/:type/exceptions"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.userId - 삭제할 사용자의 userId
 *
 * @param {Object} res
 * @param {Object} res.board - 수정된 게시판
 */
export const removePermissionException = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!req.query.userId) {
      return res.status(400).send({ message: FIELD_REQUIRED("userId") });
    }

    const permissionType = req.params.type;
    if (!["read", "write", "comment"].includes(permissionType)) {
      return res.status(400).send({ message: "Invalid permission type" });
    }

    let permissionField;
    switch (permissionType) {
      case "read":
        permissionField = "permissionRead";
        break;
      case "write":
        permissionField = "permissionWrite";
        break;
      case "comment":
        permissionField = "permissionComment";
        if (!board.permissionComment) {
          return res.status(200).send({ board });
        }
        break;
    }

    board[permissionField].exceptions = board[permissionField].exceptions.filter(
      (e) => e.userId !== req.query.userId
    );

    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function DBoard API
 * @description 게시판 삭제 API (soft delete)
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/boards/:_id"} req.url
 *
 * @param {Object} res
 */
export const remove = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 기본 게시판은 삭제 불가
    if (board.isDefault) {
      return res.status(400).send({ message: "기본 게시판은 삭제할 수 없습니다." });
    }

    board.isActive = false;
    await board.save();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function createDefaultBoard
 * @description 기본 게시판 (공지사항) 생성 헬퍼 함수
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} school - 학교 문서
 *
 * @returns {Promise<Object>} 생성된 게시판
 */
export const createDefaultBoard = async (academyId, school) => {
  // 이미 기본 게시판이 있는지 확인
  const existingBoard = await Board(academyId).findOne({
    school: school._id,
    isDefault: true,
  });

  if (existingBoard) {
    return existingBoard;
  }

  const board = await Board(academyId).create({
    school: school._id,
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    name: "공지사항",
    slug: "announcements",
    description: "학교 공지사항입니다.",
    isDefault: true,
    permissionWrite: {
      manager: true,
      teacher: true,
      student: false,
      exceptions: [],
    },
    permissionRead: {
      manager: true,
      teacher: true,
      student: true,
      exceptions: [],
    },
  });

  return board;
};
