/**
 * Post namespace
 * @namespace Models.Post
 * @version 1.0.0
 *
 * @description 게시글
 * | Indexes                              | Properties  |
 * | :-----                               | ----------  |
 * | _id                                  | UNIQUE      |
 * | board_1_createdAt_-1                 | COMPOUND    |
 * | board_1_isPinned_-1_createdAt_-1     | COMPOUND    |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Post
 * @typedef TPostAttachment
 *
 * @prop {string} url - 파일 URL
 * @prop {string} fileName - 파일명
 * @prop {number} fileSize - 파일 크기
 * @prop {string} mimeType - MIME 타입
 * @prop {string} key - S3 key
 */
/**
 * @memberof Models.Post
 * @typedef TMemberUser
 */
const memberUserSchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
  },
  { _id: false }
);

/**
 * @memberof Models.Post
 * @typedef TPostPermissionRead
 *
 * @prop {Object} groups - 역할 그룹
 * @prop {TMemberUser[]} users - 개별 사용자
 */
const postPermissionReadSchema = mongoose.Schema(
  {
    groups: {
      manager: { type: Boolean, default: false },
      teacher: { type: Boolean, default: false },
      student: { type: Boolean, default: false },
    },
    users: { type: [memberUserSchema], default: [] },
  },
  { _id: false }
);

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
 * @memberof Models.Post
 * @typedef TPost
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} author - 작성자._id
 * @prop {string} authorId - 작성자.userId
 * @prop {string} authorName - 작성자.userName
 * @prop {string?} authorProfile - 작성자.profile
 * @prop {string} title - 제목
 * @prop {string} content - 내용 (Markdown)
 * @prop {string} category - 카테고리 (선택)
 * @prop {boolean} isPinned - 상단 고정 여부
 * @prop {boolean} isActive - 활성화 상태 (soft delete)
 * @prop {number} viewCount - 조회수
 * @prop {TPostAttachment[]} attachments - 첨부파일
 * @prop {ObjectId} legacyNotificationId - 기존 알림 마이그레이션용
 */
const postSchema = mongoose.Schema(
  {
    board: {
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

    // 게시글 내용
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },

    // 메타데이터
    category: String,
    isPinned: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },

    // 읽기 권한 (보드 멤버 범위 내, null이면 전체 멤버 공개)
    permissionRead: {
      type: postPermissionReadSchema,
    },

    // 하위호환용 - 기존 대상 지정 (레거시 데이터)
    targetAudience: {
      type: {
        type: String,
        enum: ["all", "manager", "teacher", "student", "custom"],
        default: "all",
      },
      users: [
        {
          user: mongoose.Types.ObjectId,
          userId: String,
          userName: String,
        },
      ],
      grade: Number,
    },

    // 첨부파일
    attachments: [attachmentSchema],

    // 기존 알림 마이그레이션용 참조
    legacyNotificationId: mongoose.Types.ObjectId,
  },
  { timestamps: true }
);

postSchema.index({ board: 1, createdAt: -1 });
postSchema.index({ board: 1, isPinned: -1, createdAt: -1 });

export const Post = (dbName) => {
  return conn[dbName].model("Post", postSchema);
};
