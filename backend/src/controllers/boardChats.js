/**
 * BoardChatAPI namespace
 * @namespace APIs.BoardChatAPI
 *
 * @description 보드 채팅 API
 * 기존 ChatRoom/ChatMessage 모델을 재사용하며,
 * 인증은 보드 멤버십 기반으로 처리
 */

import { logger } from "../log/logger.js";
import {
  Board,
  ChatMessage,
  ChatFile,
} from "../models/index.js";
import {
  isBoardMember,
  getUserRoleInSeason,
} from "../services/boards.js";
import {
  getOrCreateBoardChatRoom,
  getBoardChatRoomById,
  listBoardChatRooms,
  createBoardTeamRoom,
  updateBoardChatRoom,
  deactivateBoardTeamRoom,
  syncBoardChatParticipants,
  canManageBoardChatRooms,
  isRoomParticipant,
  ensureTeamRoomPrivate,
  addBoardTeamParticipants,
  removeBoardTeamParticipant,
} from "../services/boardChat.js";
import { getIoChat } from "../utils/webSocket.js";
import { sendChatWebPushes } from "../services/webPush.js";
import { chatMulter, isImageFile } from "../_s3/chatMulter.js";
import { signUrlForView } from "../_s3/fileBucket.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
  LIMIT_FILE_SIZE,
  INVALID_FILE_TYPE,
} from "../messages/index.js";

/**
 * 보드 조회 + 멤버 권한 확인 헬퍼
 */
const getBoardAndVerifyMember = async (req) => {
  const board = await Board(req.user.academyId).findById(req.params._id);
  if (!board) return { error: { status: 404, message: __NOT_FOUND("board") } };

  const role = await getUserRoleInSeason(
    req.user.academyId,
    board.schoolId,
    req.user
  );
  if (!isBoardMember(board, req.user, role)) {
    return { error: { status: 403, message: PERMISSION_DENIED } };
  }

  if (board.chatEnabled === false) {
    return { error: { status: 403, message: "BOARD_CHAT_NOT_ENABLED" } };
  }

  return { board };
};

/**
 * room에 대한 unreadCount 계산
 * - 참여자가 아니면 0 (전체방 목록에는 보이지만 lastReadAt을 갱신할 수 없음)
 */
const attachUnreadCount = async (academyId, room, userId) => {
  const roomObj = room.toObject ? room.toObject() : { ...room };
  const participants = roomObj.participants || [];
  const participant = participants.find(
    (p) => p.user.toString() === userId.toString()
  );
  if (!participant) {
    roomObj.unreadCount = 0;
    return roomObj;
  }
  const query = {
    room: roomObj._id,
    sender: { $ne: userId },
    isDeleted: false,
  };
  if (participant.lastReadAt) {
    query.createdAt = { $gt: participant.lastReadAt };
  }
  roomObj.unreadCount = await ChatMessage(academyId).countDocuments(query);
  return roomObj;
};

/**
 * 경로의 roomId로 보드 소속 방 조회 + 참여자 검증
 */
const getVerifiedRoom = async (req, board) => {
  let room = await getBoardChatRoomById(
    req.user.academyId,
    board,
    req.params.roomId
  );
  if (!room) {
    return { error: { status: 404, message: __NOT_FOUND("room") } };
  }

  if (!room.isGeneral) {
    await ensureTeamRoomPrivate(room);
  }

  if (!isRoomParticipant(room, req.user._id)) {
    if (room.isGeneral) {
      await syncBoardChatParticipants(req.user.academyId, board);
      room = await getBoardChatRoomById(
        req.user.academyId,
        board,
        req.params.roomId
      );
      if (room && isRoomParticipant(room, req.user._id)) {
        return { room };
      }
    }
    return { error: { status: 403, message: PERMISSION_DENIED } };
  }

  return { room };
};

/**
 * GET /boards/:_id/chat/room
 * 보드 전체 채팅방 조회 (없으면 생성 + 참여자 동기화) — 하위 호환
 */
export const getBoardChatRoom = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const room = await getOrCreateBoardChatRoom(req.user.academyId, board);
    await syncBoardChatParticipants(req.user.academyId, board);

    const roomObj = await attachUnreadCount(
      req.user.academyId,
      room,
      req.user._id
    );

    return res.status(200).send({ room: roomObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * GET /boards/:_id/chat/rooms
 * 보드 채팅방 목록 (전체 + 내가 참여 중인 팀방)
 */
export const getBoardChatRooms = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const rooms = await listBoardChatRooms(
      req.user.academyId,
      board,
      req.user._id
    );
    const roomsWithUnread = await Promise.all(
      rooms.map((room) =>
        attachUnreadCount(req.user.academyId, room, req.user._id)
      )
    );

    return res.status(200).send({ rooms: roomsWithUnread });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /boards/:_id/chat/rooms
 * 비공개 팀방 생성
 */
export const createBoardChatRoom = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    if (!canManageBoardChatRooms(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { name, description, memberIds } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).send({ message: FIELD_REQUIRED("name") });
    }

    const room = await createBoardTeamRoom(
      req.user.academyId,
      board,
      { name, description, memberIds },
      req.user
    );

    const roomObj = await attachUnreadCount(
      req.user.academyId,
      room,
      req.user._id
    );

    return res.status(200).send({ room: roomObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PATCH /boards/:_id/chat/rooms/:roomId
 * 채팅방 이름/설명 수정
 */
export const updateBoardChatRoomById = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    if (!canManageBoardChatRooms(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    const updated = await updateBoardChatRoom(room, {
      name: req.body.name,
      description: req.body.description,
    });

    const roomObj = await attachUnreadCount(
      req.user.academyId,
      updated,
      req.user._id
    );

    return res.status(200).send({ room: roomObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * DELETE /boards/:_id/chat/rooms/:roomId
 * 팀방 비활성 (전체 채팅 삭제 불가)
 */
export const deleteBoardChatRoomById = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    if (!canManageBoardChatRooms(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    if (room.isGeneral) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await deactivateBoardTeamRoom(room);
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /boards/:_id/chat/rooms/:roomId/participants
 * 팀방 참여자 추가
 */
export const addBoardChatRoomParticipants = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    if (!canManageBoardChatRooms(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    if (room.isGeneral) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { memberIds } = req.body;
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("memberIds") });
    }

    const result = await addBoardTeamParticipants(
      req.user.academyId,
      board,
      room,
      memberIds
    );
    if (result.error) {
      return res
        .status(result.error.status)
        .send({ message: result.error.message });
    }

    const roomObj = await attachUnreadCount(
      req.user.academyId,
      result.room,
      req.user._id
    );
    return res.status(200).send({ room: roomObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * DELETE /boards/:_id/chat/rooms/:roomId/participants/:userId
 * 팀방 참여자 제거 / 나가기
 */
export const removeBoardChatRoomParticipant = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    if (room.isGeneral) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const targetUserId = req.params.userId;
    const isSelf = targetUserId === req.user._id.toString();
    const isCreator = room.creator?.toString() === req.user._id.toString();
    const canManage = canManageBoardChatRooms(board, req.user) || isCreator;

    if (!isSelf && !canManage) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const result = await removeBoardTeamParticipant(room, targetUserId);
    if (result.error) {
      const msg =
        result.error.message === "NOT_FOUND"
          ? __NOT_FOUND("participant")
          : result.error.message;
      return res.status(result.error.status).send({ message: msg });
    }

    const roomObj = await attachUnreadCount(
      req.user.academyId,
      result.room,
      req.user._id
    );
    return res.status(200).send({ room: roomObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * 메시지 목록 (room 문서 기준)
 */
const listMessagesForRoom = async (academyId, room, queryParams) => {
  const { limit: rawLimit = 50, before } = queryParams;
  const limit = Math.min(Math.max(parseInt(rawLimit) || 50, 1), 100);

  const query = { room: room._id };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await ChatMessage(academyId)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit);

  return messages.map((msg) => {
    const msgObj = msg.toObject();
    if (msgObj.isDeleted) {
      msgObj.content = "삭제된 메시지입니다";
      msgObj.messageType = "text";
      delete msgObj.attachment;
    } else if (msgObj.attachment?.key) {
      msgObj.attachment.url = signUrlForView(msgObj.attachment.key, 3600);
    }
    return msgObj;
  }).reverse();
};

/**
 * GET /boards/:_id/chat/rooms/:roomId/messages
 */
export const getBoardChatRoomMessages = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    const messages = await listMessagesForRoom(
      req.user.academyId,
      room,
      req.query
    );
    return res.status(200).send({ messages });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * GET /boards/:_id/chat/messages
 * 하위 호환: roomId 쿼리 없으면 전체 채팅
 */
export const getBoardChatMessages = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    let room;
    if (req.query.roomId) {
      req.params.roomId = req.query.roomId;
      const verified = await getVerifiedRoom(req, board);
      if (verified.error) {
        return res
          .status(verified.error.status)
          .send({ message: verified.error.message });
      }
      room = verified.room;
    } else {
      room = await getOrCreateBoardChatRoom(req.user.academyId, board);
      await syncBoardChatParticipants(req.user.academyId, board);
    }

    if (!room) {
      return res.status(200).send({ messages: [] });
    }

    const messages = await listMessagesForRoom(
      req.user.academyId,
      room,
      req.query
    );
    return res.status(200).send({ messages });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * 메시지 전송 공통
 */
const createMessageInRoom = async (req, board, room) => {
  const { content, messageType, attachment } = req.body;
  if (!content) {
    return { error: { status: 400, message: FIELD_REQUIRED("content") } };
  }
  if ((messageType === "image" || messageType === "file") && !attachment) {
    return { error: { status: 400, message: FIELD_REQUIRED("attachment") } };
  }

  const messageData = {
    room: room._id,
    sender: req.user._id,
    senderId: req.user.userId,
    senderName: req.user.userName,
    senderProfile: req.user.profile,
    content,
    messageType: messageType || "text",
    readBy: [{ user: req.user._id, readAt: new Date() }],
  };

  if (attachment) {
    messageData.attachment = {
      url: attachment.url,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      key: attachment.key,
    };
  }

  const message = await ChatMessage(req.user.academyId).create(messageData);

  if (attachment?.key) {
    await ChatFile(req.user.academyId).findOneAndUpdate(
      { key: attachment.key, user: req.user._id },
      { message: message._id }
    );
  }

  let lastMessageContent = content.substring(0, 100);
  if (messageType === "image") {
    lastMessageContent = "[이미지]";
  } else if (messageType === "file") {
    lastMessageContent = `[파일] ${attachment?.fileName || ""}`;
  }

  room.lastMessage = {
    content: lastMessageContent,
    sender: req.user._id,
    senderName: req.user.userName,
    sentAt: new Date(),
  };
  await room.save();

  const messageObj = message.toObject();
  if (messageObj.attachment?.key) {
    messageObj.attachment.url = signUrlForView(messageObj.attachment.key, 3600);
  }

  const ioChat = getIoChat();
  const pushRecipients = [];
  room.participants.forEach((participant) => {
    if (participant.user.toString() === req.user._id.toString()) return;
    if (ioChat) {
      ioChat
        .to(`chat:${req.user.academyId}:${participant.userId}`)
        .emit("new_message", {
          room: room._id,
          roomType: room.type,
          boardId: board._id,
          message: messageObj,
        });
    }
    pushRecipients.push({
      user: participant.user,
      userId: participant.userId,
    });
  });

  if (pushRecipients.length > 0) {
    const roomLabel = room.isGeneral
      ? board.name || "보드 채팅"
      : `${board.name || "보드"} · ${room.name || "팀방"}`;
    sendChatWebPushes({
      academyId: req.user.academyId,
      recipients: pushRecipients,
      title: roomLabel,
      body: lastMessageContent,
      roomId: String(room._id),
      boardId: String(board._id),
      schoolId: board.schoolId ? String(board.schoolId) : undefined,
    }).catch((err) => {
      logger.warn(`Board chat Web Push failed: ${err.message}`);
    });
  }

  return { message: messageObj };
};

/**
 * POST /boards/:_id/chat/rooms/:roomId/messages
 */
export const sendBoardChatRoomMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    const result = await createMessageInRoom(req, board, room);
    if (result.error) {
      return res
        .status(result.error.status)
        .send({ message: result.error.message });
    }
    return res.status(200).send({ message: result.message });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /boards/:_id/chat/messages
 * 하위 호환: body.roomId 없으면 전체 채팅
 */
export const sendBoardChatMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    let room;
    if (req.body.roomId) {
      req.params.roomId = req.body.roomId;
      const verified = await getVerifiedRoom(req, board);
      if (verified.error) {
        return res
          .status(verified.error.status)
          .send({ message: verified.error.message });
      }
      room = verified.room;
    } else {
      room = await getOrCreateBoardChatRoom(req.user.academyId, board);
    }

    const result = await createMessageInRoom(req, board, room);
    if (result.error) {
      return res
        .status(result.error.status)
        .send({ message: result.error.message });
    }
    return res.status(200).send({ message: result.message });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PUT /boards/:_id/chat/rooms/:roomId/read
 */
export const markBoardChatRoomRead = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    let participantIndex = room.participants.findIndex(
      (p) => p.user.toString() === req.user._id.toString()
    );
    // 전체 채팅: 보드 멤버인데 participants에 없으면 읽음 처리용으로 추가
    if (participantIndex === -1 && room.isGeneral) {
      room.participants.push({
        user: req.user._id,
        userId: req.user.userId,
        userName: req.user.userName,
        joinedAt: new Date(),
        lastReadAt: new Date(),
      });
      await room.save();
      return res.status(200).send({});
    }
    if (participantIndex === -1) {
      return res.status(200).send({});
    }

    room.participants[participantIndex].lastReadAt = new Date();
    await room.save();

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PUT /boards/:_id/chat/read
 * 하위 호환: query/body roomId 없으면 전체 채팅
 */
export const markBoardChatRead = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const roomId = req.query.roomId || req.body.roomId;
    let room;
    if (roomId) {
      req.params.roomId = roomId;
      const verified = await getVerifiedRoom(req, board);
      if (verified.error) {
        return res.status(200).send({});
      }
      room = verified.room;
    } else {
      room = await getOrCreateBoardChatRoom(req.user.academyId, board);
    }

    if (!room) {
      return res.status(200).send({});
    }

    const participantIndex = room.participants.findIndex(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (participantIndex === -1) {
      return res.status(200).send({});
    }

    room.participants[participantIndex].lastReadAt = new Date();
    await room.save();

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * DELETE /boards/:_id/chat/rooms/:roomId/messages/:messageId
 */
export const deleteBoardChatRoomMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    const message = await ChatMessage(req.user.academyId).findById(
      req.params.messageId
    );
    if (!message) {
      return res.status(404).send({ message: __NOT_FOUND("message") });
    }

    if (message.room.toString() !== room._id.toString()) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (message.isDeleted) {
      return res.status(200).send({});
    }

    if (message.messageType === "system") {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    message.isDeleted = true;
    await message.save();

    if (
      room.lastMessage?.sentAt &&
      message.createdAt.getTime() >=
        new Date(room.lastMessage.sentAt).getTime()
    ) {
      room.lastMessage.content = "삭제된 메시지";
      await room.save();
    }

    const ioChat = getIoChat();
    if (ioChat) {
      room.participants.forEach((participant) => {
        if (participant.user.toString() !== req.user._id.toString()) {
          ioChat
            .to(`chat:${req.user.academyId}:${participant.userId}`)
            .emit("message_deleted", {
              room: room._id,
              messageId: message._id,
            });
        }
      });
    }

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * DELETE /boards/:_id/chat/messages/:messageId
 * 하위 호환: 메시지 소속 방이 해당 보드면 허용
 */
export const deleteBoardChatMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const message = await ChatMessage(req.user.academyId).findById(
      req.params.messageId
    );
    if (!message) {
      return res.status(404).send({ message: __NOT_FOUND("message") });
    }

    const room = await getBoardChatRoomById(
      req.user.academyId,
      board,
      message.room
    );
    if (!room) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    req.params.roomId = room._id.toString();
    return deleteBoardChatRoomMessage(req, res);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * 파일 업로드 공통
 */
const uploadFileToRoom = (req, res, room) => {
  chatMulter(room._id.toString()).single("file")(req, {}, async (err) => {
    if (err) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        case "INVALID_FILE_TYPE":
          return res.status(409).send({ message: INVALID_FILE_TYPE });
        default:
          logger.error(err.message);
          return res.status(500).send({ message: "서버 오류가 발생했습니다." });
      }
    }

    if (!req.file) {
      return res.status(400).send({ message: FIELD_REQUIRED("file") });
    }

    const file = req.file;
    const fileType = isImageFile(file.mimetype) ? "image" : "file";

    await ChatFile(req.user.academyId).create({
      user: req.user._id,
      userId: req.user.userId,
      room: room._id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      key: file.key,
      url: file.location,
      fileType,
    });

    const signedUrl = signUrlForView(file.key, 3600);

    return res.status(200).send({
      attachment: {
        url: signedUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        key: file.key,
      },
    });
  });
};

/**
 * POST /boards/:_id/chat/rooms/:roomId/upload
 */
export const uploadBoardChatRoomFile = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { room, error: roomError } = await getVerifiedRoom(req, board);
    if (roomError) {
      return res.status(roomError.status).send({ message: roomError.message });
    }

    return uploadFileToRoom(req, res, room);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /boards/:_id/chat/upload
 * 하위 호환: query roomId 없으면 전체 채팅
 */
export const uploadBoardChatFile = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    let room;
    if (req.query.roomId) {
      req.params.roomId = req.query.roomId;
      const verified = await getVerifiedRoom(req, board);
      if (verified.error) {
        return res
          .status(verified.error.status)
          .send({ message: verified.error.message });
      }
      room = verified.room;
    } else {
      room = await getOrCreateBoardChatRoom(req.user.academyId, board);
    }

    return uploadFileToRoom(req, res, room);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
