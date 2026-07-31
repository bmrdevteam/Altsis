/**
 * ChatRoom namespace
 * @namespace Models.ChatRoom
 * @version 1.0.0
 *
 * @description 채팅방
 * | Indexes                   | Properties  |
 * | :-----                    | ----------  |
 * | _id                       | UNIQUE      |
 * | participants.user_1       |             |
 */
import mongoose from "mongoose";

import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.ChatRoom
 * @typedef TChatParticipant
 *
 * @prop {ObjectId} user - ObjectId of user
 * @prop {string} userId
 * @prop {string} userName
 * @prop {string?} profile - profile image URL
 * @prop {Date} joinedAt - when user joined the room
 * @prop {Date?} lastReadAt - last time user read messages
 */
const chatParticipantSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    profile: String,
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: Date,
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * @memberof Models.ChatRoom
 * @typedef TLastMessage
 *
 * @prop {string} content - truncated message content
 * @prop {ObjectId} sender - ObjectId of sender
 * @prop {string} senderName
 * @prop {Date} sentAt
 */
const lastMessageSchema = mongoose.Schema(
  {
    content: String,
    sender: mongoose.Types.ObjectId,
    senderName: String,
    sentAt: Date,
  },
  { _id: false }
);

/**
 * @memberof Models.ChatRoom
 * @typedef TChatRoomSettings
 *
 * @prop {boolean} allowInvites=true - whether non-creators can invite users
 * @prop {boolean} allowChat=true - whether non-creators can send messages
 */
const chatRoomSettingsSchema = mongoose.Schema(
  {
    allowInvites: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * @memberof Models.ChatRoom
 * @typedef TChatRoom
 *
 * @prop {ObjectId} _id
 * @prop {"direct"|"group"|"board"} type - room type
 * @prop {string?} name - room name (for group/board chats)
 * @prop {ObjectId?} creator - ObjectId of room creator
 * @prop {string?} creatorId
 * @prop {string?} creatorName
 * @prop {ObjectId?} board - 연결된 보드 (type: "board"일 때만 사용)
 * @prop {boolean?} isGeneral - 보드 전체 채팅 여부 (보드당 활성 1개)
 * @prop {boolean?} isPrivate - 초대제 팀방 여부 (!isGeneral 팀방은 true)
 * @prop {string?} description - 팀방 설명
 * @prop {TChatParticipant[]} participants - room participants
 * @prop {TLastMessage?} lastMessage - last message preview
 * @prop {boolean} isActive=true - whether room is active
 * @prop {TChatRoomSettings?} settings - room permission settings
 */
const chatRoomSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group", "board"],
      required: true,
    },
    name: String,
    description: String,
    isGeneral: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
    creator: mongoose.Types.ObjectId,
    board: {
      type: mongoose.Types.ObjectId,
      default: null,
    },
    creatorId: String,
    creatorName: String,
    participants: [chatParticipantSchema],
    lastMessage: lastMessageSchema,
    isActive: { type: Boolean, default: true },
    settings: chatRoomSettingsSchema,
  },
  { timestamps: true }
);

// Index for efficient querying by participant
chatRoomSchema.index({ "participants.user": 1 });
// Index for board chat room lookup
chatRoomSchema.index({ board: 1, isActive: 1 });
// 보드당 활성 전체 채팅은 하나
chatRoomSchema.index(
  { board: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "board",
      isGeneral: true,
      isActive: true,
    },
  }
);

export const ChatRoom = (dbName) => {
  return conn[dbName].model("ChatRoom", chatRoomSchema);
};
