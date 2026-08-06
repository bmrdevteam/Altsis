/**
 * AiLibraryChunk namespace
 * @namespace Models.AiLibraryChunk
 * @description 학교 AI 라이브러리 문서 청크 (chat 키워드 검색용)
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const aiLibraryChunkSchema = mongoose.Schema(
  {
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    libraryItem: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["instruction", "learning"],
      default: "learning",
    },
    title: { type: String, default: "" },
    index: { type: Number, required: true },
    text: { type: String, default: "" },
    tokenHint: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiLibraryChunkSchema.index({ libraryItem: 1, index: 1 });
aiLibraryChunkSchema.index({ school: 1, libraryItem: 1 });
aiLibraryChunkSchema.index(
  { text: "text", title: "text" },
  { default_language: "none" }
);

export const AiLibraryChunk = (dbName) => {
  return conn[dbName].model("AiLibraryChunk", aiLibraryChunkSchema);
};
