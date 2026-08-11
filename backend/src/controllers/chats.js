/**
 * ChatAPI namespace
 * @namespace APIs.ChatAPI
 * @see TChatRoom in {@link Models.ChatRoom}
 * @see TChatMessage in {@link Models.ChatMessage}
 */

import { logger } from "../log/logger.js";
import {
  ChatRoom,
  ChatMessage,
  ChatFile,
  User,
  Registration,
  Board,
  Syllabus,
  Enrollment,
} from "../models/index.js";
import { getIoChat } from "../utils/webSocket.js";
import { chatMulter, isImageFile } from "../_s3/chatMulter.js";
import { signUrl, signUrlForView } from "../_s3/fileBucket.js";
import { sendChatWebPushes } from "../services/webPush.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
  LIMIT_FILE_SIZE,
  INVALID_FILE_TYPE,
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

    // 그룹 채팅 생성 차단 — 그룹 채팅은 보드 내에서만 사용
    if (type === "group") {
      return res.status(400).send({
        message: "그룹 채팅은 보드 내에서만 사용할 수 있습니다.",
      });
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

    // Filter out current user from participants (will be added automatically)
    const filteredParticipants = participants.filter(
      (p) => String(p.user) !== String(req.user._id)
    );

    // Add current user to participants
    const allParticipants = [
      {
        user: req.user._id,
        userId: req.user.userId,
        userName: req.user.userName,
        profile: req.user.profile,
        joinedAt: new Date(),
      },
      ...filteredParticipants.map((p) => ({
        user: p.user,
        userId: p.userId,
        userName: p.userName,
        profile: p.profile,
        joinedAt: new Date(),
      })),
    ];

    // For group chats, check if room with same participants already exists
    if (type === "group") {
      const allUserIds = allParticipants.map((p) => p.user);
      const existingRoom = await ChatRoom(req.user.academyId).findOne({
        type: "group",
        "participants.user": { $all: allUserIds },
        isActive: true,
      });

      if (existingRoom && existingRoom.participants.length === allUserIds.length) {
        return res.status(200).send({ room: existingRoom, existing: true });
      }
    }

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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
        type: { $ne: "board" }, // 보드 채팅은 보드 UI에서만 접근
      })
      .sort({ "lastMessage.sentAt": -1, updatedAt: -1 });

    const showArchived = req.query.archived === "true";

    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
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
        roomObj.isPinned = participant?.isPinned || false;
        roomObj.isArchived = participant?.isArchived || false;
        return roomObj;
      })
    );

    // Filter: show archived or non-archived
    const filtered = roomsWithUnread.filter((r) =>
      showArchived ? r.isArchived : !r.isArchived
    );

    // Sort: pinned first, then by last message time
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0; // preserve existing sort from DB query
    });

    return res.status(200).send({ rooms: filtered });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function RChatBoardRooms API
 * @description 내가 참여한 보드 채팅방 목록 (상단바용)
 * @version 1.0.0
 */
export const findBoardRooms = async (req, res) => {
  try {
    const currentSeasonId = req.query.season
      ? String(req.query.season)
      : null;
    const schoolId = req.query.school ? String(req.query.school) : null;

    const rooms = await ChatRoom(req.user.academyId)
      .find({
        "participants.user": req.user._id,
        isActive: true,
        type: "board",
      })
      .sort({ "lastMessage.sentAt": -1, updatedAt: -1 })
      .lean();

    const boardIds = [
      ...new Set(
        rooms.map((r) => (r.board ? String(r.board) : "")).filter(Boolean)
      ),
    ];
    const boardQuery = {
      _id: { $in: boardIds },
      isActive: { $ne: false },
    };
    if (schoolId) {
      boardQuery.school = schoolId;
    }
    const boards = await Board(req.user.academyId)
      .find(boardQuery)
      .select("_id name chatEnabled syllabus scope season school")
      .lean();
    const boardById = Object.fromEntries(
      boards.map((b) => [String(b._id), b])
    );

    const syllabusIds = [
      ...new Set(
        boards
          .map((b) => (b.syllabus ? String(b.syllabus) : ""))
          .filter(Boolean)
      ),
    ];
    const syllabuses =
      syllabusIds.length > 0
        ? await Syllabus(req.user.academyId)
            .find({ _id: { $in: syllabusIds } })
            .select("teachers user season")
            .lean()
        : [];
    const sylMap = new Map(syllabuses.map((s) => [String(s._id), s]));
    const enrollments =
      syllabusIds.length > 0
        ? await Enrollment(req.user.academyId)
            .find({
              student: req.user._id,
              syllabus: { $in: syllabusIds },
            })
            .select("_id syllabus")
            .lean()
        : [];
    const enrollBySyl = new Map(
      enrollments.map((e) => [String(e.syllabus), String(e._id)])
    );
    const isManager =
      req.user.auth === "admin" || req.user.auth === "manager";
    const userOid = String(req.user._id);

    const resolveCoursePath = (boardDoc) => {
      if (!boardDoc?.syllabus) return null;
      const sylId = String(boardDoc.syllabus);
      const syl = sylMap.get(sylId);
      const isMentor =
        !!syl &&
        (String(syl.user) === userOid ||
          (syl.teachers || []).some(
            (t) => String(t._id || t) === userOid
          ));
      if (isMentor || isManager) return `/courses/mentoring/${sylId}`;
      if (enrollBySyl.has(sylId)) {
        return `/courses/enrolled/${enrollBySyl.get(sylId)}`;
      }
      return null;
    };

    const isBoardInCurrentSeason = (boardDoc) => {
      if (!currentSeasonId) return true;
      if (boardDoc.scope === "season") {
        return String(boardDoc.season) === currentSeasonId;
      }
      if (boardDoc.syllabus) {
        const syl = sylMap.get(String(boardDoc.syllabus));
        const syllabusSeason = syl?.season ? String(syl.season) : null;
        return syllabusSeason === currentSeasonId;
      }
      return true;
    };

    const roomsWithUnread = await Promise.all(
      rooms
        .filter((room) => {
          const b = boardById[String(room.board)];
          if (!b || b.chatEnabled === false) return false;
          return isBoardInCurrentSeason(b);
        })
        .map(async (room) => {
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
          const unreadCount = await ChatMessage(
            req.user.academyId
          ).countDocuments(query);
          const boardDoc = boardById[String(room.board)];
          return {
            ...room,
            board: room.board ? String(room.board) : undefined,
            boardName: boardDoc?.name,
            coursePath: resolveCoursePath(boardDoc),
            unreadCount,
            isPinned: false,
            isArchived: false,
          };
        })
    );

    return res.status(200).send({ rooms: roomsWithUnread });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function UChatRoom API
 * @description 채팅방 수정 API (그룹 채팅 이름/설정 변경)
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
 * @param {Object?} req.body.settings - room settings (creator only)
 * @param {boolean?} req.body.settings.allowInvites
 * @param {boolean?} req.body.settings.allowChat
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

    const isCreator = room.creator?.toString() === req.user._id.toString();

    if (room.type === "group") {
      // Name can be changed by any participant
      if (req.body.name !== undefined) {
        room.name = req.body.name;
      }

      // Settings can only be changed by creator
      if (req.body.settings && isCreator) {
        if (!room.settings) {
          room.settings = {};
        }
        if (req.body.settings.allowInvites !== undefined) {
          room.settings.allowInvites = req.body.settings.allowInvites;
        }
        if (req.body.settings.allowChat !== undefined) {
          room.settings.allowChat = req.body.settings.allowChat;
        }
      }

      await room.save();
    }

    return res.status(200).send({ room });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function CAddParticipants API
 * @description 그룹 채팅방에 참가자 추가 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"POST"} req.method
 * @param {"/chats/rooms/:roomId/participants"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.body
 * @param {Object[]} req.body.participants - array of participant objects
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.room
 */
export const addParticipants = async (req, res) => {
  try {
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("participants") });
    }

    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);

    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Only group chats can have participants added
    if (room.type !== "group") {
      return res.status(400).send({
        message: FIELD_INVALID("room.type"),
        detail: "Cannot add participants to direct chat",
      });
    }

    // Check if user is participant
    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // Check invite permission
    const isCreator = room.creator?.toString() === req.user._id.toString();
    if (!isCreator && room.settings?.allowInvites === false) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // Add new participants (avoid duplicates)
    const existingUserIds = room.participants.map((p) => p.user.toString());
    const newParticipants = participants
      .filter((p) => !existingUserIds.includes(p.user.toString()))
      .map((p) => ({
        user: p.user,
        userId: p.userId,
        userName: p.userName,
        profile: p.profile,
        joinedAt: new Date(),
      }));

    if (newParticipants.length > 0) {
      room.participants.push(...newParticipants);
      await room.save();

      // Emit socket event to notify existing participants
      const ioChat = getIoChat();
      if (ioChat) {
        room.participants.forEach((participant) => {
          ioChat
            .to(`chat:${req.user.academyId}:${participant.userId}`)
            .emit("participants_added", {
              room: room._id,
              newParticipants,
              addedBy: req.user.userName,
            });
        });
      }
    }

    return res.status(200).send({ room });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function DRemoveParticipant API
 * @description 그룹 채팅방에서 참가자 제거 API (방장 전용)
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"DELETE"} req.method
 * @param {"/chats/rooms/:roomId/participants/:participantId"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 * @param {string} req.params.participantId - participant user ObjectId to remove
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.room
 */
export const removeParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;

    const room = await ChatRoom(req.user.academyId).findById(roomId);

    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Only group chats allow participant removal
    if (room.type !== "group") {
      return res.status(400).send({
        message: FIELD_INVALID("room.type"),
        detail: "Cannot remove participants from direct chat",
      });
    }

    // Only creator can remove participants
    const isCreator = room.creator?.toString() === req.user._id.toString();
    if (!isCreator) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // Cannot remove yourself (use deleteRoom instead)
    if (participantId === req.user._id.toString()) {
      return res.status(400).send({
        message: FIELD_INVALID("participantId"),
        detail: "Cannot remove yourself. Use leave room instead.",
      });
    }

    // Find and remove participant
    const participantIndex = room.participants.findIndex(
      (p) => p.user.toString() === participantId
    );
    if (participantIndex === -1) {
      return res.status(404).send({ message: __NOT_FOUND("participant") });
    }

    const removedParticipant = room.participants[participantIndex];
    room.participants.splice(participantIndex, 1);
    await room.save();

    // Emit socket event to notify all participants including the removed one
    const ioChat = getIoChat();
    if (ioChat) {
      // Notify the removed user
      ioChat
        .to(`chat:${req.user.academyId}:${removedParticipant.userId}`)
        .emit("participant_removed", {
          room: room._id,
          removedUserId: removedParticipant.userId,
          removedBy: req.user.userName,
        });

      // Notify remaining participants
      room.participants.forEach((participant) => {
        ioChat
          .to(`chat:${req.user.academyId}:${participant.userId}`)
          .emit("participant_removed", {
            room: room._id,
            removedUserId: removedParticipant.userId,
            removedBy: req.user.userName,
          });
      });
    }

    return res.status(200).send({ room });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function DChatRoomByCreator API
 * @description 채팅방 삭제 API (방장 전용)
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/chats/rooms/:roomId/creator"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 */
export const deleteRoomByCreator = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);

    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    // Check if user is creator
    if (room.creator.toString() !== req.user._id.toString()) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // Soft delete the room
    room.isActive = false;
    await room.save();

    // maybe emit a socket event to notify participants?
    const ioChat = getIoChat();
    if (ioChat) {
      room.participants.forEach((participant) => {
        ioChat
          .to(`chat:${req.user.academyId}:${participant.userId}`)
          .emit("room_deleted", {
            room: room._id,
            deletedBy: req.user.userName,
          });
      });
    }

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
 * @param {Object?} req.body.attachment - { url, fileName, fileSize, mimeType, key }
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.message - created message
 */
export const sendMessage = async (req, res) => {
  try {
    const { content, messageType, attachment } = req.body;

    if (!content) {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }

    // Validate attachment for image/file messages
    if ((messageType === "image" || messageType === "file") && !attachment) {
      return res.status(400).send({ message: FIELD_REQUIRED("attachment") });
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

    // Check chat permission for group chats
    if (room.type === "group") {
      const isCreator = room.creator?.toString() === req.user._id.toString();
      if (!isCreator && room.settings?.allowChat === false) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
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

    // Add attachment if provided (store key for signing later)
    if (attachment) {
      messageData.attachment = {
        url: attachment.url,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        key: attachment.key, // Store key for signed URL generation
      };
    }

    const message = await ChatMessage(req.user.academyId).create(messageData);

    // Update ChatFile with message reference if it's a file/image message
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

    // Prepare message with signed URL for response
    const messageObj = message.toObject();
    if (messageObj.attachment?.key) {
      messageObj.attachment.url = signUrlForView(messageObj.attachment.key, 3600);
    }

    // Emit via Socket.io + collect Web Push recipients (sender 제외)
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
            message: messageObj,
          });
      }
      pushRecipients.push({
        user: participant.user,
        userId: participant.userId,
      });
    });

    // 잠금화면 Web Push (설정 ON인 수신자) — 채팅 응답 지연 방지를 위해 비동기
    if (pushRecipients.length > 0) {
      const pushTitle =
        room.type === "direct"
          ? req.user.userName || "새 메시지"
          : room.name || req.user.userName || "그룹 채팅";
      sendChatWebPushes({
        academyId: req.user.academyId,
        recipients: pushRecipients,
        title: pushTitle,
        body: lastMessageContent,
        roomId: String(room._id),
      }).catch((err) => {
        logger.warn(`Chat Web Push failed: ${err.message}`);
      });
    }

    return res.status(200).send({ message: messageObj });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function DChatMessage API
 * @description 메시지 삭제 API (본인 메시지만 삭제 가능)
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/chats/rooms/:roomId/messages/:messageId"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 * @param {string} req.params.messageId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 */
export const deleteMessage = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const message = await ChatMessage(req.user.academyId).findById(
      req.params.messageId
    );
    if (!message) {
      return res.status(404).send({ message: __NOT_FOUND("message") });
    }

    if (message.room.toString() !== req.params.roomId) {
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
    const { limit: rawLimit = 50, before } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 50, 1), 100);

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

    // Return messages in chronological order
    return res.status(200).send({ messages: processedMessages.reverse() });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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
 * @param {string?} req.query.seasonId - filter by season (only users registered in this season)
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object[]} res.users
 */
export const searchUsers = async (req, res) => {
  try {
    const { q, sid, seasonId } = req.query;

    const escapeRegex = (str) =>
      str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // If seasonId is provided, get user IDs from registrations
    let seasonUserIds = null;
    if (seasonId) {
      const registrations = await Registration(req.user.academyId)
        .find({ season: seasonId })
        .select("user")
        .lean();
      seasonUserIds = registrations.map((r) => r.user);
    }

    const query = {};
    if (q) {
      const escaped = escapeRegex(q);
      query.$or = [
        { userId: { $regex: escaped, $options: "i" } },
        { userName: { $regex: escaped, $options: "i" } },
      ];
    }
    if (sid) {
      query["schools.school"] = sid;
    }
    if (seasonUserIds) {
      query._id = { $in: seasonUserIds };
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
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

//=================================
//         Pin / Archive
//=================================

/**
 * @memberof APIs.ChatAPI
 * @function UChatRoomPin API
 * @description 채팅방 고정/고정해제 API
 * @version 1.0.0
 */
export const pinRoom = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    const participantIndex = room.participants.findIndex(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (participantIndex === -1) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    room.participants[participantIndex].isPinned =
      !room.participants[participantIndex].isPinned;
    await room.save();

    return res.status(200).send({
      isPinned: room.participants[participantIndex].isPinned,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function UChatRoomArchive API
 * @description 채팅방 보관/보관해제 API
 * @version 1.0.0
 */
export const archiveRoom = async (req, res) => {
  try {
    const room = await ChatRoom(req.user.academyId).findById(req.params.roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    const participantIndex = room.participants.findIndex(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (participantIndex === -1) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    room.participants[participantIndex].isArchived =
      !room.participants[participantIndex].isArchived;
    // If archiving, also unpin
    if (room.participants[participantIndex].isArchived) {
      room.participants[participantIndex].isPinned = false;
    }
    await room.save();

    return res.status(200).send({
      isArchived: room.participants[participantIndex].isArchived,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

//=================================
//         File Upload
//=================================

/**
 * @memberof APIs.ChatAPI
 * @function CChatFileUpload API
 * @description 채팅 파일 업로드 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/chats/rooms/:roomId/upload"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.roomId
 *
 * @param {FormData} req.body - file
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object} res.attachment - { url, fileName, fileSize, mimeType, key }
 */
export const uploadChatFile = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists and user is participant
    const room = await ChatRoom(req.user.academyId).findById(roomId);
    if (!room) {
      return res.status(404).send({ message: __NOT_FOUND("room") });
    }

    const isParticipant = room.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // Check chat permission for group chats
    if (room.type === "group") {
      const isCreator = room.creator?.toString() === req.user._id.toString();
      if (!isCreator && room.settings?.allowChat === false) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    // Upload file using chatMulter
    chatMulter(roomId).single("file")(req, {}, async (err) => {
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

      try {
        const fileType = isImageFile(req.file.mimetype) ? "image" : "file";

        // Save to ChatFile collection for storage management
        await ChatFile(req.user.academyId).create({
          user: req.user._id,
          userId: req.user.userId,
          room: roomId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          key: req.tmp.key,
          url: req.file.location,
          fileType,
        });

        return res.status(200).send({
          attachment: {
            url: req.file.location,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            key: req.tmp.key,
          },
        });
      } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: "서버 오류가 발생했습니다." });
      }
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

//=================================
//         File Storage
//=================================

/**
 * @memberof APIs.ChatAPI
 * @function RChatFiles API
 * @description 내 채팅 파일 목록 조회 API (개인 저장소)
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/chats/files"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.fileType - "image" | "file"
 * @param {number?} req.query.limit - default 20
 * @param {string?} req.query.before - ISO date string for cursor pagination
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {Object[]} res.files
 */
export const findMyFiles = async (req, res) => {
  try {
    const { fileType, limit: rawFileLimit = 20, before } = req.query;
    const limit = Math.min(Math.max(parseInt(rawFileLimit) || 20, 1), 100);

    const query = {
      user: req.user._id,
      isDeleted: false,
    };

    if (fileType) {
      query.fileType = fileType;
    }

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const files = await ChatFile(req.user.academyId)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Sign URLs for viewing
    const filesWithSignedUrls = files.map((file) => {
      const fileObj = file.toObject();
      if (fileObj.key) {
        fileObj.url = signUrlForView(fileObj.key, 3600); // 1 hour expiry
      }
      return fileObj;
    });

    return res.status(200).send({ files: filesWithSignedUrls });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function DChatFile API
 * @description 채팅 파일 삭제 API (소프트 삭제)
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/chats/files/:fileId"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.fileId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 */
export const deleteFile = async (req, res) => {
  try {
    const file = await ChatFile(req.user.academyId).findById(req.params.fileId);

    if (!file) {
      return res.status(404).send({ message: __NOT_FOUND("file") });
    }

    // Only owner can delete
    if (file.user.toString() !== req.user._id.toString()) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    file.isDeleted = true;
    await file.save();

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ChatAPI
 * @function RChatFileSignedUrl API
 * @description 채팅 파일 다운로드용 Signed URL 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/chats/files/:fileId/signed"} req.url
 *
 * @param {Object} req.params
 * @param {string} req.params.fileId
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} res
 * @param {string} res.preSignedUrl
 * @param {string} res.expiryDate
 */
export const signChatFile = async (req, res) => {
  try {
    const file = await ChatFile(req.user.academyId).findById(req.params.fileId);

    if (!file || file.isDeleted) {
      return res.status(404).send({ message: __NOT_FOUND("file") });
    }

    // Check permission: owner or room participant
    const room = await ChatRoom(req.user.academyId).findById(file.room);
    const isOwner = file.user.toString() === req.user._id.toString();
    const isParticipant = room?.participants.some(
      (p) => p.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { preSignedUrl, expiryDate } = signUrl(file.key, file.fileName, 300);

    return res.status(200).send({ preSignedUrl, expiryDate });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
