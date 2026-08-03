/**
 * AiLibraryItem namespace
 * @namespace Models.AiLibraryItem
 * @description 학교 공용 AI 지침·학습정보 라이브러리 항목
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AiLibraryItem
 * @typedef TAiLibraryItem
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} school - school._id
 * @prop {"instruction"|"learning"} kind - 지침 | 학습정보
 * @prop {string} title
 * @prop {string} content
 * @prop {string} [fileName]
 * @prop {string} [fileKey]
 * @prop {number} [fileSize]
 * @prop {string} [mimeType]
 * @prop {string[]} skillTags - 비어 있으면 모든 스킬에 노출
 */
const aiLibraryItemSchema = mongoose.Schema(
  {
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["instruction", "learning"],
      required: true,
      default: "learning",
    },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    fileName: String,
    fileKey: String,
    fileSize: Number,
    mimeType: String,
    skillTags: { type: [String], default: [] },
  },
  { timestamps: true }
);

aiLibraryItemSchema.index({ school: 1, kind: 1, createdAt: -1 });

export const AiLibraryItem = (dbName) => {
  return conn[dbName].model("AiLibraryItem", aiLibraryItemSchema);
};
