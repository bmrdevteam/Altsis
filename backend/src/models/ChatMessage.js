/**
 * ChatMessage namespace
 * @namespace Models.ChatMessage
 * @version 1.0.0
 *
 * @description 채팅 메시지
 * | Indexes              | Properties  |
 * | :-----               | ----------  |
 * | _id                  | UNIQUE      |
 * | room_1               |             |
 * | room_1_createdAt_-1  | COMPOUND    |
 */
import mongoose from "mongoose";

import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.ChatMessage
 * @typedef TReadBy
 *
 * @prop {ObjectId} user - ObjectId of user who read
 * @prop {Date} readAt - when user read the message
 */
const readBySchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    readAt: Date,
  },
  { _id: false }
);

/**
 * @memberof Models.ChatMessage
 * @typedef TAttachment
 *
 * @prop {string} url - file URL (signed URL)
 * @prop {string} fileName
 * @prop {number} fileSize - size in bytes
 * @prop {string} mimeType
 * @prop {string} key - S3 key for signed URL generation
 */
const attachmentSchema = mongoose.Schema(
  {
    url: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    key: String,
  },
  { _id: false }
);

/**
 * @memberof Models.ChatMessage
 * @typedef TReactionUser
 *
 * @prop {ObjectId} user
 * @prop {string} userId
 * @prop {string} userName
 */
const reactionUserSchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
  },
  { _id: false }
);

/**
 * @memberof Models.ChatMessage
 * @typedef TReaction
 *
 * @prop {string} emoji
 * @prop {TReactionUser[]} users
 */
const reactionSchema = mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: [reactionUserSchema],
  },
  { _id: false }
);

/**
 * @memberof Models.ChatMessage
 * @typedef TChatMessage
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} room - ObjectId of chat room
 * @prop {ObjectId} sender - ObjectId of sender
 * @prop {string} senderId
 * @prop {string} senderName
 * @prop {string} content - message content
 * @prop {"text"|"image"|"file"|"system"} messageType="text" - message type
 * @prop {TAttachment?} attachment - attachment for image/file messages
 * @prop {TReadBy[]} readBy - users who read this message
 * @prop {TReaction[]} reactions - emoji reactions
 * @prop {boolean} isDeleted=false - soft delete flag
 */
const chatMessageSchema = mongoose.Schema(
  {
    room: { type: mongoose.Types.ObjectId, required: true, index: true },
    sender: { type: mongoose.Types.ObjectId, required: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    attachment: attachmentSchema,
    readBy: [readBySchema],
    reactions: { type: [reactionSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for pagination queries
chatMessageSchema.index({ room: 1, createdAt: -1 });

export const ChatMessage = (dbName) => {
  return conn[dbName].model("ChatMessage", chatMessageSchema);
};
