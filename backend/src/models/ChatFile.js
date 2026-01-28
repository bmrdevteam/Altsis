/**
 * ChatFile namespace
 * @namespace Models.ChatFile
 * @version 1.0.0
 *
 * @description 채팅 파일 저장소 (사용자별 공유 파일 관리)
 * | Indexes              | Properties  |
 * | :-----               | ----------  |
 * | _id                  | UNIQUE      |
 * | user_1_createdAt_-1  | COMPOUND    |
 * | user_1_fileType_1    | COMPOUND    |
 */
import mongoose from "mongoose";

import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.ChatFile
 * @typedef TChatFile
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} user - owner user ObjectId
 * @prop {string} userId
 * @prop {ObjectId} room - chat room ObjectId
 * @prop {ObjectId} message - chat message ObjectId
 * @prop {string} fileName - original file name
 * @prop {number} fileSize - size in bytes
 * @prop {string} mimeType
 * @prop {string} key - S3 key
 * @prop {string} url - public URL
 * @prop {"image"|"file"} fileType
 * @prop {boolean} isDeleted=false - soft delete flag
 */
const chatFileSchema = mongoose.Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    room: { type: mongoose.Types.ObjectId, required: true },
    message: { type: mongoose.Types.ObjectId },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    key: { type: String, required: true },
    url: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["image", "file"],
      required: true,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
chatFileSchema.index({ user: 1, createdAt: -1 });
chatFileSchema.index({ user: 1, fileType: 1, createdAt: -1 });

export const ChatFile = (dbName) => {
  return conn[dbName].model("ChatFile", chatFileSchema);
};
