/**
 * BoardAPI namespace
 * @namespace APIs.BoardAPI
 * @see TBoard in {@link Models.Board}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import { Board, BoardFavorite, School } from "../models/index.js";
import {
  canManageBoard,
  isBoardMember,
  getUserRoleInSeason,
  getBoardMembers,
} from "../services/boards.js";

import {
  FIELD_REQUIRED,
  FIELD_IN_USE,
  PERMISSION_DENIED,
  __NOT_FOUND,
  LIMIT_FILE_SIZE,
  INVALID_FILE_TYPE,
} from "../messages/index.js";
import { boardMulter } from "../_s3/boardMulter.js";

/**
 * @memberof APIs.BoardAPI
 * @function CBoard API
 * @description 게시판 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/boards"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.school - school._id
 * @param {string} req.body.name - 게시판 이름
 * @param {string?} req.body.description - 게시판 설명
 * @param {Object?} req.body.members - 멤버 설정
 * @param {Object?} req.body.writers - 작성자 설정
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
    let baseSlug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `board-${Date.now()}`;

    // slug 충돌 시 숫자 접미사 추가
    let slug = baseSlug;
    let slugSuffix = 1;
    while (await Board(req.user.academyId).findOne({ school: school._id, slug })) {
      slugSuffix++;
      slug = `${baseSlug}-${slugSuffix}`;
    }

    // boardType 결정: admin/manager → official, 그 외 → user
    const isAdminOrManager = req.user.auth === "admin" || req.user.auth === "manager";
    const boardType = isAdminOrManager ? "official" : "user";

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
      boardType,
      contentViewMode: req.body.contentViewMode || "table",
      ...(req.body.coverColor && { coverColor: req.body.coverColor }),
      members: req.body.members || {
        groups: { manager: true, teacher: true, student: true },
        users: [],
      },
      writers: req.body.writers || {
        groups: { manager: true, teacher: true, student: false },
        users: [],
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
 * @version 2.0.0
 */
export const find = async (req, res) => {
  try {
    /* RBoard */
    if (req.params._id) {
      const board = await Board(req.user.academyId).findById(req.params._id);
      if (!board) {
        return res.status(404).send({ message: __NOT_FOUND("board") });
      }

      // 멤버 확인
      const role = await getUserRoleInSeason(
        req.user.academyId,
        board.schoolId,
        req.user
      );
      if (!isBoardMember(board, req.user, role)) {
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
      .sort({ isDefault: -1, boardType: 1, order: 1, createdAt: 1 });

    // 멤버인 게시판만 필터링
    const accessibleBoards = boards.filter((board) =>
      isBoardMember(board, req.user, role)
    );

    // 즐겨찾기 정보 조회
    const favorites = await BoardFavorite(req.user.academyId).find({
      user: req.user._id,
      school: school._id,
    });
    const favoriteBoardIds = new Set(favorites.map((f) => f.board.toString()));

    // isFavorited 플래그 추가
    const boardsWithFavorites = accessibleBoards.map((board) => {
      const boardObj = board.toObject();
      boardObj.isFavorited = favoriteBoardIds.has(board._id.toString());
      return boardObj;
    });

    return res.status(200).send({ boards: boardsWithFavorites });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function UBoard API
 * @description 게시판 수정 API
 * @version 2.0.0
 */
export const update = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 관리 권한 확인 (admin/manager 또는 보드 생성자)
    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 기본 게시판은 이름 변경 불가
    if (board.isDefault && req.body.name && req.body.name !== board.name) {
      return res.status(400).send({ message: "기본 보드의 이름은 변경할 수 없습니다." });
    }

    if (req.body.name) board.name = req.body.name;
    if ("description" in req.body) board.description = req.body.description;
    if ("order" in req.body) board.order = req.body.order;
    if ("contentViewMode" in req.body) {
      const validModes = ["table", "gallery", "blog"];
      if (validModes.includes(req.body.contentViewMode)) {
        board.contentViewMode = req.body.contentViewMode;
      }
    }
    if ("coverColor" in req.body)
      board.coverColor = req.body.coverColor || undefined;

    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function UBoardMembers API
 * @description 보드 멤버 그룹 설정 API
 * @version 2.0.0
 *
 * @param {Object} req.body
 * @param {Object} req.body.groups - { manager, teacher, student }
 */
export const updateMembers = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (!board.members) {
      board.members = {
        groups: { manager: true, teacher: true, student: true },
        users: [],
      };
    }

    if (req.body.groups) {
      if ("manager" in req.body.groups) board.members.groups.manager = req.body.groups.manager;
      if ("teacher" in req.body.groups) board.members.groups.teacher = req.body.groups.teacher;
      if ("student" in req.body.groups) board.members.groups.student = req.body.groups.student;
    }

    board.markModified("members");
    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function UBoardWriters API
 * @description 보드 작성자 그룹 설정 API
 * @version 2.0.0
 *
 * @param {Object} req.body
 * @param {Object} req.body.groups - { manager, teacher, student }
 */
export const updateWriters = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (!board.writers) {
      board.writers = {
        groups: { manager: true, teacher: true, student: false },
        users: [],
      };
    }

    if (req.body.groups) {
      if ("manager" in req.body.groups) board.writers.groups.manager = req.body.groups.manager;
      if ("teacher" in req.body.groups) board.writers.groups.teacher = req.body.groups.teacher;
      if ("student" in req.body.groups) board.writers.groups.student = req.body.groups.student;
    }

    board.markModified("writers");
    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function CBoardMemberUser API
 * @description 보드 개별 멤버 추가 API
 * @version 2.0.0
 *
 * @param {Object} req.body
 * @param {string} req.body.user - user._id
 * @param {string} req.body.userId
 * @param {string} req.body.userName
 */
export const addMemberUser = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    for (let field of ["user", "userId", "userName"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (!board.members) {
      board.members = { groups: { manager: true, teacher: true, student: true }, users: [] };
    }

    // 중복 체크
    if (!board.members.users.some((u) => u.userId === req.body.userId)) {
      board.members.users.push({
        user: req.body.user,
        userId: req.body.userId,
        userName: req.body.userName,
      });
    }

    board.markModified("members");
    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function DBoardMemberUser API
 * @description 보드 개별 멤버 제거 API
 * @version 2.0.0
 *
 * @param {Object} req.query
 * @param {string} req.query.userId - 제거할 사용자의 userId
 */
export const removeMemberUser = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (!req.query.userId) {
      return res.status(400).send({ message: FIELD_REQUIRED("userId") });
    }

    if (board.members?.users) {
      board.members.users = board.members.users.filter(
        (u) => u.userId !== req.query.userId
      );
      board.markModified("members");
      await board.save();
    }

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function CBoardWriterUser API
 * @description 보드 개별 작성자 추가 API
 * @version 2.0.0
 */
export const addWriterUser = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    for (let field of ["user", "userId", "userName"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (!board.writers) {
      board.writers = { groups: { manager: true, teacher: true, student: false }, users: [] };
    }

    if (!board.writers.users.some((u) => u.userId === req.body.userId)) {
      board.writers.users.push({
        user: req.body.user,
        userId: req.body.userId,
        userName: req.body.userName,
      });
    }

    board.markModified("writers");
    await board.save();

    return res.status(200).send({ board });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function DBoardWriterUser API
 * @description 보드 개별 작성자 제거 API
 * @version 2.0.0
 */
export const removeWriterUser = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (!req.query.userId) {
      return res.status(400).send({ message: FIELD_REQUIRED("userId") });
    }

    if (board.writers?.users) {
      board.writers.users = board.writers.users.filter(
        (u) => u.userId !== req.query.userId
      );
      board.markModified("writers");
      await board.save();
    }

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
 */
export const remove = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (board.isDefault) {
      return res.status(400).send({ message: "기본 보드는 삭제할 수 없습니다." });
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
 */
export const createDefaultBoard = async (academyId, school) => {
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
    members: {
      groups: { manager: true, teacher: true, student: true },
      users: [],
    },
    writers: {
      groups: { manager: true, teacher: true, student: false },
      users: [],
    },
  });

  return board;
};

/**
 * @memberof APIs.BoardAPI
 * @function RBoardMemberList API
 * @description 보드 멤버 사용자 목록 (resolved) 조회 API
 * @version 2.0.0
 */
export const findMemberList = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!isBoardMember(board, req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const users = await getBoardMembers(req.user.academyId, board);
    return res.status(200).send({ users });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.BoardAPI
 * @function UBoardCoverImage API
 * @description 보드 커버 이미지 업로드 API
 * @version 1.0.0
 */
export const updateCoverImage = async (req, res) => {
  boardMulter.single("img")(req, {}, async (err) => {
    try {
      if (err) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            return res.status(409).send({ message: LIMIT_FILE_SIZE });
          case "INVALID_FILE_TYPE":
            return res.status(409).send({ message: INVALID_FILE_TYPE });
          default:
            return res.status(500).send({ message: err.code });
        }
      }

      const board = await Board(req.user.academyId).findById(req.params._id);
      if (!board) {
        return res.status(404).send({ message: __NOT_FOUND("board") });
      }

      if (!canManageBoard(board, req.user)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      board.coverImage = req.file.location.replace(
        "/original/",
        "/thumb/"
      );
      await board.save();
      return res.status(200).send({ coverImage: board.coverImage });
    } catch (err) {
      logger.error(err.message);
      return res.status(500).send({ message: "서버 오류가 발생했습니다." });
    }
  });
};

/**
 * @memberof APIs.BoardAPI
 * @function DBoardCoverImage API
 * @description 보드 커버 이미지 삭제 API
 * @version 1.0.0
 */
export const deleteCoverImage = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageBoard(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    board.coverImage = undefined;
    await board.save();
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
