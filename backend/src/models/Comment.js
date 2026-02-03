/**
 * Comment namespace
 * @namespace Models.Comment
 * @version 1.0.0
 *
 * @description 게시글 댓글
 * | Indexes                    | Properties  |
 * | :-----                     | ----------  |
 * | _id                        | UNIQUE      |
 * | post_1_createdAt_1         | COMPOUND    |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Comment
 * @typedef TComment
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} post - post._id
 * @prop {ObjectId} author - 작성자._id
 * @prop {string} authorId - 작성자.userId
 * @prop {string} authorName - 작성자.userName
 * @prop {string?} authorProfile - 작성자.profile
 * @prop {string} content - 댓글 내용
 * @prop {boolean} isActive - 활성화 상태 (soft delete)
 * @prop {ObjectId} parentComment - 부모 댓글 (대댓글인 경우)
 */
const commentSchema = mongoose.Schema(
  {
    post: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },

    // 작성자 정보
    author: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorProfile: {
      type: String,
    },

    // 댓글 내용
    content: {
      type: String,
      required: true,
    },

    // 메타데이터
    isActive: {
      type: Boolean,
      default: true,
    },

    // 대댓글 (답글)
    parentComment: {
      type: mongoose.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, createdAt: 1 });

export const Comment = (dbName) => {
  return conn[dbName].model("Comment", commentSchema);
};
