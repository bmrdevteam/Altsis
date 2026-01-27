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
 * @typedef TChatRoom
 *
 * @prop {ObjectId} _id
 * @prop {"direct"|"group"} type - room type
 * @prop {string?} name - room name (for group chats)
 * @prop {ObjectId?} creator - ObjectId of room creator
 * @prop {string?} creatorId
 * @prop {string?} creatorName
 * @prop {TChatParticipant[]} participants - room participants
 * @prop {TLastMessage?} lastMessage - last message preview
 * @prop {boolean} isActive=true - whether room is active
 */
const chatRoomSchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    name: String,
    creator: mongoose.Types.ObjectId,
    creatorId: String,
    creatorName: String,
    participants: [chatParticipantSchema],
    lastMessage: lastMessageSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for efficient querying by participant
chatRoomSchema.index({ "participants.user": 1 });

export const ChatRoom = (dbName) => {
  return conn[dbName].model("ChatRoom", chatRoomSchema);
};
