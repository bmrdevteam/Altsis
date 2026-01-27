/**
 * ChatAPI namespace
 * @namespace APIs.ChatAPI
 * @see TChatRoom in {@link Models.ChatRoom}
 * @see TChatMessage in {@link Models.ChatMessage}
 */

import { logger } from "../log/logger.js";
import { ChatRoom, ChatMessage, User } from "../models/index.js";
import { getIoChat } from "../utils/webSocket.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * @memberof APIs.ChatAPI
 * @function CChatRoom API
 * @description 채팅방 생성 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/chats/rooms"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} req.body
 * @param {"direct"|"group"} req.body.type
 * @param {Object[]} req.body.participants - array of participant objects
 * @param {string?} req.body.name - room name (for group chats)
 *
 * @param {Object} res
 * @param {Object} res.room - created room
 * @param {boolean?} res.existing - true if direct room already exists
 */
export const createRoom = async (req, res) => {
  try {
    const { type, participants, name } = req.body;

    if (!type) {
      return res.status(400).send({ message: FIELD_REQUIRED("type") });
    }
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("participants") });
    }

    // For direct messages, check if room already exists
    if (type === "direct") {
      if (participants.length !== 1) {
        return res.status(400).send({
          message: FIELD_INVALID("participants"),
          detail: "Direct chat requires exactly one other participant"
        });
      }

      const existingRoom = await ChatRoom(req.user.academyId).findOne({
        type: "direct",
        "participants.user": { $all: [req.user._id, participants[0].user] },
        isActive: true,
      });

      if (existingRoom && existingRoom.participants.length === 2) {
        return res.status(200).send({ room: existingRoom, existing: true });
      }
    }

    // Add current user to participants
    const allParticipants = [
      {
        user: req.user._id,
        userId: req.user.userId,
        userName: req.user.userName,
        profile: req.user.profile,
        joinedAt: new Date(),
      },
      ...participants.map((p) => ({
        user: p.user,
        userId: p.userId,
        userName: p.userName,
        profile: p.profile,
        joinedAt: new Date(),
      })),
    ];

    const room = await ChatRoom(req.user.academyId).create({
      type,
      name: type === "group" ? name : undefined,
      creator: req.user._id,
      creatorId: req.user.userId,
      creatorName: req.user.userName,
      participants: allParticipants,
    });

    return res.status(200).send({ room });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function RChatRooms API
 * @description 채팅방 목록 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/chats/rooms"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object[]} res.rooms - list of rooms
 */
export const findRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom(req.user.academyId)
      .find({
        "participants.user": req.user._id,
        isActive: true,
      })
      .sort({ "lastMessage.sentAt": -1, updatedAt: -1 });

    return res.status(200).send({ rooms });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function RChatRoom API
 * @description 채팅방 상세 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/chats/rooms/:roomId"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.room
 */
export const findRoom = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);

    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    return res.status(200).send({ room });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function UChatRoom API
 * @description 채팅방 수정 API (그룹 채팅 이름 변경)
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/chats/rooms/:roomId"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.body
 * @param {string?} req.body.name - new room name (for group chats)
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.room
 */
export const updateRoom = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);

    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (room.type === "group" && req.body.name) {
      room.name = req.body.name;
      await room.save();
    }

    return res.status(200).send({ room });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function DChatRoom API
 * @description 채팅방 나가기/삭제 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/chats/rooms/:roomId"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 */
export const deleteRoom = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);

    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // For direct chats, soft delete the room
    if (room.type === "direct") {
      room.isActive = false;
      await room.save();
    } else {
      // For group chats, remove participant
      room.participants = room.participants.filter(
        (p) => p.user.toString() !== req.user._id.toString()
      );
      if (room.participants.length === 0) {
        room.isActive = false;
      }
      await room.save();
    }

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function CChatMessage API
 * @description 메시지 전송 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/chats/rooms/:roomId/messages"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.body
 * @param {string} req.body.content
 * @param {string?} req.body.messageType - "text"|"image"|"file"|"system"
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.message - created message
 */
export const sendMessage = async (req, res) => {
  try {
    const { content, messageType } = req.body;

    if (!content) {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }

    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const message = await ChatMessage(req.user.academyId).create({
      room: room._id,
      sender: req.user._id,
      senderId: req.user.userId,
      senderName: req.user.userName,
      content,
      messageType: messageType || "text",
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    // Update room's last message
    room.lastMessage = {
      content: content.substring(0, 100),
      sender: req.user._id,
      senderName: req.user.userName,
      sentAt: new Date(),
    };
    await room.save();

    // Emit via Socket.io to all participants
    const ioChat = getIoChat();
    if (ioChat) {
      room.participants.forEach((participant) => {
        if (participant.user.toString() !== req.user._id.toString()) {
          ioChat
            .to(`chat:${req.user.academyId}:${participant.userId}`)
            .emit("new_message", {
              room: room._id,
              roomType: room.type,
              message,
            });
        }
      });
    }

    return res.status(200).send({ message });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function RChatMessages API
 * @description 메시지 목록 조회 API (페이지네이션)
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/chats/rooms/:roomId/messages"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.query
 * @param {number?} req.query.limit - default 50
 * @param {string?} req.query.before - ISO date string for cursor pagination
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object[]} res.messages
 */
export const findMessages = async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const query = {
      room: room._id,
      isDeleted: false,
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage(req.user.academyId)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Return messages in chronological order
    return res.status(200).send({ messages: messages.reverse() });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function UChatRoomRead API
 * @description 메시지 읽음 처리 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/chats/rooms/:roomId/read"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 */
export const markAsRead = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Find and update participant's lastReadAt
    const participantIndex = room.participants.findIndex(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (participantIndex === -1) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    room.participants[participantIndex].lastReadAt = new Date();
    await room.save();

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function RChatUsers API
 * @description 채팅 가능한 사용자 검색 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/chats/users"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.q - search query (userId or userName)
 * @param {string?} req.query.sid - filter by school ObjectId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object[]} res.users
 */
export const searchUsers = async (req, res) => {
  try {
    const { q, sid } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { userId: { $regex: q, $options: "i" } },
        { userName: { $regex: q, $options: "i" } },
      ];
    }
    if (sid) {
      query["schools.school"] = sid;
    }

    const users = await User(req.user.academyId)
      .find(query)
      .select("_id userId userName profile schools")
      .limit(20);

    // Exclude current user
    const filteredUsers = users.filter(
      (u) => u._id.toString() !== req.user._id.toString()
    );

    return res.status(200).send({ users: filteredUsers });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
