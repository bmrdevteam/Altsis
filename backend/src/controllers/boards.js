/**
 * BoardAPI namespace
 * @namespace APIs.BoardAPI
 * @see TBoard in {@link Models.Board}
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import {
  AltForm,
  AltSheet,
  AltSheetRow,
  Board,
  BoardFavorite,
  CalendarEvent,
  Post,
  School,
  SurveyResponse,
  Syllabus,
} from "../models/index.js";
import {
  canManageBoard,
  isBoardMember,
  isBoardMemberAsUser,
  getUserRoleInSeason,
  getBoardMembers,
} from "../services/boards.js";
import { sendAutoNotification, isBoardNotificationEnabled } from "../services/notifications.js";
import {
  syncBoardChatParticipants,
  deactivateBoardChatRoom,
} from "../services/boardChat.js";

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

const boardPresetColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
  "#3b82f6", "#10b981", "#ef4444", "#78716c", "#0ea5e9",
];

function hashStringToIndex(str, max) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash) % max;
}

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

    // 관리자가 아닌 경우 생성 권한 체크
    const isAdminOrManager = req.user.auth === "admin" || req.user.auth === "manager";
    if (!isAdminOrManager) {
      const role = await getUserRoleInSeason(req.user.academyId, school.schoolId, req.user);
      const permission = school.boardCreationPermission || { teacher: false, student: false };
      if (!role || !permission[role]) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
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
    const boardType = isAdminOrManager ? "official" : "user";

    const altBoardRole = new Map();
    altBoardRole.set(req.user._id.toString(), "admin");

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
      boardMode: "alt",
      boardType,
      altBoardRole,
      contentViewMode: req.body.contentViewMode || "table",
      coverColor: req.body.coverColor || boardPresetColors[hashStringToIndex(req.body.name, boardPresetColors.length)],
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
    const isManageMode = req.query.mode === "manage";

    if (isManageMode && !canManageBoard({ creator: null }, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const accessibleBoards = boards.filter((board) =>
      isManageMode
        ? canManageBoard(board, req.user)
        : isBoardMemberAsUser(board, req.user, role)
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
      const validModes = ["table", "blog"];
      if (validModes.includes(req.body.contentViewMode)) {
        board.contentViewMode = req.body.contentViewMode;
      }
    }
    if ("coverColor" in req.body)
      board.coverColor = req.body.coverColor || undefined;
    if ("notificationEvents" in req.body) {
      board.notificationEvents = req.body.notificationEvents;
    }
    if ("chatEnabled" in req.body) {
      board.chatEnabled = !!req.body.chatEnabled;
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
    const isNew = !board.members.users.some((u) => u.userId === req.body.userId);
    if (isNew) {
      board.members.users.push({
        user: req.body.user,
        userId: req.body.userId,
        userName: req.body.userName,
      });
    }

    // altBoardRole 동기화 (이미 더 높은 역할이면 스킵)
    if (!board.altBoardRole) board.altBoardRole = new Map();
    const existingRole = board.altBoardRole.get(req.body.user.toString());
    if (!existingRole || existingRole === "respondent") {
      if (!existingRole) {
        board.altBoardRole.set(req.body.user.toString(), "respondent");
      }
    }
    board.markModified("altBoardRole");

    board.markModified("members");
    await board.save();

    // 초대 알림 발송
    if (isNew) {
      try {
        const notifEnabled = await isBoardNotificationEnabled(
          req.user.academyId,
          board.school,
          board,
          "boardInvitation"
        );

        if (notifEnabled) {
          await sendAutoNotification({
            academyId: req.user.academyId,
            toUserList: [{
              user: req.body.user,
              userId: req.body.userId,
              userName: req.body.userName,
            }],
            notificationType: "boardInvitation",
            category: "보드",
            title: `${board.name} 보드에 초대되었습니다`,
            description: `${req.user.userName}님이 "${board.name}" 보드에 초대했습니다.`,
            relatedEntity: { type: "board", id: board._id },
            fromUser: req.user,
          });
        }
      } catch (notifErr) {
        logger.error(`Board invitation notification failed: ${notifErr.message}`);
      }
    }

    // 보드 채팅방 참여자 동기화
    try {
      await syncBoardChatParticipants(req.user.academyId, board);
    } catch (syncErr) {
      logger.error(`Board chat sync failed: ${syncErr.message}`);
    }

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

    // 제거할 사용자의 user ObjectId 찾기
    const removedUser = board.members?.users?.find(
      (u) => u.userId === req.query.userId
    );

    if (board.members?.users) {
      board.members.users = board.members.users.filter(
        (u) => u.userId !== req.query.userId
      );
      board.markModified("members");
    }

    // 멤버에서 제거 시 작성자에서도 제거
    if (board.writers?.users) {
      board.writers.users = board.writers.users.filter(
        (u) => u.userId !== req.query.userId
      );
      board.markModified("writers");
    }

    // altBoardRole에서도 제거
    if (removedUser && board.altBoardRole) {
      board.altBoardRole.delete(removedUser.user.toString());
      board.markModified("altBoardRole");
    }

    await board.save();

    // 보드 채팅방 참여자 동기화
    try {
      await syncBoardChatParticipants(req.user.academyId, board);
    } catch (syncErr) {
      logger.error(`Board chat sync failed: ${syncErr.message}`);
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

    // altBoardRole을 writer로 승격
    if (!board.altBoardRole) board.altBoardRole = new Map();
    board.altBoardRole.set(req.body.user.toString(), "writer");
    board.markModified("altBoardRole");

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

    // 제거할 작성자의 user ObjectId 찾기
    const removedWriter = board.writers?.users?.find(
      (u) => u.userId === req.query.userId
    );

    if (board.writers?.users) {
      board.writers.users = board.writers.users.filter(
        (u) => u.userId !== req.query.userId
      );
      board.markModified("writers");
    }

    // altBoardRole: 여전히 멤버면 respondent로 강등, 아니면 삭제
    if (removedWriter && board.altBoardRole) {
      const isMember = board.members?.users?.some(
        (u) => u.userId === req.query.userId
      );
      if (isMember) {
        board.altBoardRole.set(removedWriter.user.toString(), "respondent");
      } else {
        board.altBoardRole.delete(removedWriter.user.toString());
      }
      board.markModified("altBoardRole");
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
 * @function LeaveBoardMember API
 * @description 보드 탈퇴 API (자기 자신을 멤버에서 제거)
 * @version 2.0.0
 */
export const leaveBoard = async (req, res) => {
  try {
    const board = await Board(req.user.academyId).findById(req.params._id);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 기본 보드에서는 탈퇴 불가
    if (board.isDefault) {
      return res.status(400).send({ message: "기본 보드에서는 탈퇴할 수 없습니다." });
    }

    // 관리자 또는 보드 생성자는 탈퇴 불가
    if (canManageBoard(board, req.user)) {
      return res.status(400).send({ message: "관리자 또는 보드 생성자는 탈퇴할 수 없습니다." });
    }

    // 멤버에서 제거
    if (board.members?.users) {
      board.members.users = board.members.users.filter(
        (u) => u.userId !== req.user.userId
      );
      board.markModified("members");
    }

    // 작성자에서도 제거
    if (board.writers?.users) {
      board.writers.users = board.writers.users.filter(
        (u) => u.userId !== req.user.userId
      );
      board.markModified("writers");
    }

    await board.save();

    // 보드 채팅방 참여자 동기화
    try {
      await syncBoardChatParticipants(req.user.academyId, board);
    } catch (syncErr) {
      logger.error(`Board chat sync failed: ${syncErr.message}`);
    }

    return res.status(200).send({});
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

    const academyId = req.user.academyId;
    const boardId = board._id;

    // 1. 게시글 관련 데이터 삭제
    const posts = await Post(academyId).find({ board: boardId }).select("_id");
    const postIds = posts.map((p) => p._id);
    if (postIds.length > 0) {
      await SurveyResponse(academyId).deleteMany({ post: { $in: postIds } });
      await Post(academyId).deleteMany({ board: boardId });
    }

    // 2. Alt Board 관련 데이터 삭제
    const altForms = await AltForm(academyId)
      .find({ board: boardId })
      .select("_id");
    const altFormIds = altForms.map((f) => f._id);
    if (altFormIds.length > 0) {
      await AltSheetRow(academyId).deleteMany({ board: boardId });
      await AltSheet(academyId).deleteMany({ board: boardId });
      await AltForm(academyId).deleteMany({ board: boardId });
      await CalendarEvent(academyId).deleteMany({
        sourceType: "altForm",
        sourceId: {
          $regex: `^altForm-(${altFormIds.join("|")})`,
        },
      });
    }

    // 3. 보드 채팅방 비활성화
    await deactivateBoardChatRoom(academyId, boardId);

    // 4. 즐겨찾기 삭제
    await BoardFavorite(academyId).deleteMany({ board: boardId });

    // 5. Syllabus 참조 해제 (Alt Board인 경우)
    if (board.syllabus) {
      await Syllabus(academyId).updateOne(
        { _id: board.syllabus },
        { $unset: { altBoard: 1 } }
      );
    }

    // 6. 보드 삭제
    await board.deleteOne();

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
    boardMode: "alt",
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

    const users = await getBoardMembers(
      req.user.academyId,
      board,
      req.query.season
    );
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

      board.coverImage = req.file.location;
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
