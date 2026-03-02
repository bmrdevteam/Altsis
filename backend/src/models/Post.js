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
 * @prop {string} [type] - 첨부 유형 ("file" | "link" | "youtube"), 기본값 "file"
 * @prop {string} url - 파일/링크 URL
 * @prop {string} fileName - 파일명 또는 표시 이름
 * @prop {number} fileSize - 파일 크기 (링크/YouTube는 0)
 * @prop {string} mimeType - MIME 타입
 * @prop {string} [key] - S3 key (파일 첨부 전용)
 * @prop {string} [ogTitle] - OG 제목 (링크/YouTube)
 * @prop {string} [ogDescription] - OG 설명 (링크)
 * @prop {string} [ogImage] - OG 이미지 URL (링크/YouTube 썸네일)
 * @prop {string} [youtubeVideoId] - YouTube 영상 ID
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
    type: {
      type: String,
      enum: ["file", "link", "youtube"],
      default: "file",
    },
    url: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    key: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    youtubeVideoId: String,
  },
  { _id: false }
);

/**
 * @memberof Models.Post
 * @typedef TSurveyFileInfo
 */
const surveyFileSchema = mongoose.Schema(
  {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    key: String,
  },
  { _id: false }
);

/**
 * @memberof Models.Post
 * @typedef TSurveyOption
 */
const surveyOptionSchema = mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

/**
 * @memberof Models.Post
 * @typedef TSurveyQuestion
 */
const surveyQuestionSchema = mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "singleChoice",
        "multipleChoice",
        "shortText",
        "longText",
        "rating",
        "linearScale",
        "dropdown",
        "date",
        "fileUpload",
      ],
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    isRequired: { type: Boolean, default: false },
    // choice/dropdown용
    options: { type: [surveyOptionSchema], default: [] },
    // linearScale용
    scaleMin: { type: Number, default: 1 },
    scaleMax: { type: Number, default: 5 },
    scaleMinLabel: { type: String, default: "" },
    scaleMaxLabel: { type: String, default: "" },
    // 질문 첨부파일 (모든 유형 공통)
    attachments: { type: [surveyFileSchema], default: [] },
    // fileUpload 질문용
    maxFiles: { type: Number, default: 1 },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 },
  },
  { _id: false }
);

/**
 * @memberof Models.Post
 * @typedef TSurveySettings
 */
const surveySettingsSchema = mongoose.Schema(
  {
    isAnonymous: { type: Boolean, default: false },
    showResults: {
      type: String,
      enum: ["creator", "afterResponse"],
      default: "afterResponse",
    },
    deadline: { type: Date, default: null },
    allowModify: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * @memberof Models.Post
 * @typedef TSurvey
 */
const surveySchema = mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  questions: { type: [surveyQuestionSchema], required: true },
  settings: { type: surveySettingsSchema, default: () => ({}) },
  responseCount: { type: Number, default: 0 },
});

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
 * @prop {string} postType - 게시글 유형 ("general" | "survey")
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

    // 게시글 유형
    postType: {
      type: String,
      enum: ["general", "survey"],
      default: "general",
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

    // 설문 (첨부파일처럼 여러 개 가능)
    surveys: {
      type: [surveySchema],
      default: [],
    },
  },
  { timestamps: true }
);

postSchema.index({ board: 1, createdAt: -1 });
postSchema.index({ board: 1, isPinned: -1, createdAt: -1 });

export const Post = (dbName) => {
  return conn[dbName].model("Post", postSchema);
};
