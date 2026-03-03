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
  ChatRoom,
  ChatMessage,
  ChatFile,
} from "../models/index.js";
import {
  isBoardMember,
  getUserRoleInSeason,
} from "../services/boards.js";
import {
  getOrCreateBoardChatRoom,
  syncBoardChatParticipants,
} from "../services/boardChat.js";
import { getIoChat } from "../utils/webSocket.js";
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
 * GET /boards/:_id/chat/room
 * 보드 채팅방 조회 (없으면 생성 + 참여자 동기화)
 */
export const getBoardChatRoom = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const room = await getOrCreateBoardChatRoom(req.user.academyId, board);
    await syncBoardChatParticipants(req.user.academyId, board);

    // unread count 계산
    const roomObj = room.toObject();
    const participant = room.participants.find(
      (p) => p.user.toString() === req.user._id.toString()
    );
    const query = {
      room: room._id,
      sender: { $ne: req.user._id },
      isDeleted: false,
    };
    if (participant?.lastReadAt) {
      query.createdAt = { $gt: participant.lastReadAt };
    }
    roomObj.unreadCount = await ChatMessage(
      req.user.academyId
    ).countDocuments(query);

    return res.status(200).send({ room: roomObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * GET /boards/:_id/chat/messages
 * 메시지 목록 조회 (커서 기반 페이지네이션)
 */
export const getBoardChatMessages = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const room = await ChatRoom(req.user.academyId).findOne({
      type: "board",
      board: board._id,
      isActive: true,
    });
    if (!room) {
      return res.status(200).send({ messages: [] });
    }

    const { limit: rawLimit = 50, before } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 50, 1), 100);

    const query = {
      room: room._id,
    };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage(req.user.academyId)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Sign attachment URLs and strip deleted message content
    const processedMessages = messages.map((msg) => {
      const msgObj = msg.toObject();
      if (msgObj.isDeleted) {
        msgObj.content = "삭제된 메시지입니다";
        msgObj.messageType = "text";
        delete msgObj.attachment;
      } else if (msgObj.attachment?.key) {
        msgObj.attachment.url = signUrlForView(msgObj.attachment.key, 3600);
      }
      return msgObj;
    });

    return res.status(200).send({ messages: processedMessages.reverse() });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /boards/:_id/chat/messages
 * 메시지 전송
 */
export const sendBoardChatMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { content, messageType, attachment } = req.body;
    if (!content) {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }
    if ((messageType === "image" || messageType === "file") && !attachment) {
      return res.status(400).send({ message: FIELD_REQUIRED("attachment") });
    }

    const room = await getOrCreateBoardChatRoom(req.user.academyId, board);

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

    // Update ChatFile reference
    if (attachment?.key) {
      await ChatFile(req.user.academyId).findOneAndUpdate(
        { key: attachment.key, user: req.user._id },
        { message: message._id }
      );
    }

    // Update room's last message
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

    // Prepare response with signed URL
    const messageObj = message.toObject();
    if (messageObj.attachment?.key) {
      messageObj.attachment.url = signUrlForView(messageObj.attachment.key, 3600);
    }

    // Emit via Socket.io
    const ioChat = getIoChat();
    if (ioChat) {
      room.participants.forEach((participant) => {
        if (participant.user.toString() !== req.user._id.toString()) {
          ioChat
            .to(`chat:${req.user.academyId}:${participant.userId}`)
            .emit("new_message", {
              room: room._id,
              roomType: room.type,
              boardId: board._id,
              message: messageObj,
            });
        }
      });
    }

    return res.status(200).send({ message: messageObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PUT /boards/:_id/chat/read
 * 읽음 처리
 */
export const markBoardChatRead = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const room = await ChatRoom(req.user.academyId).findOne({
      type: "board",
      board: board._id,
      isActive: true,
    });
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
 * DELETE /boards/:_id/chat/messages/:messageId
 * 메시지 삭제 (본인 메시지만)
 */
export const deleteBoardChatMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const room = await ChatRoom(req.user.academyId).findOne({
      type: "board",
      board: board._id,
      isActive: true,
    });
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
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

    // Update room's lastMessage if this was the last message
    if (
      room.lastMessage?.sentAt &&
      message.createdAt.getTime() >=
        new Date(room.lastMessage.sentAt).getTime()
    ) {
      room.lastMessage.content = "삭제된 메시지";
      await room.save();
    }

    // Emit via Socket.io
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
 * POST /boards/:_id/chat/upload
 * 파일 업로드
 */
export const uploadBoardChatFile = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const room = await getOrCreateBoardChatRoom(req.user.academyId, board);

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

      // Create ChatFile record
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

      // Generate signed URL for the uploaded file
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
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
