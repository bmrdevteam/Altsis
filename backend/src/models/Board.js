/**
 * Board namespace
 * @namespace Models.Board
 * @version 1.0.0
 *
 * @description 게시판
 * | Indexes                    | Properties        |
 * | :-----                     | ----------        |
 * | _id                        | UNIQUE            |
 * | school_1                   |                   |
 * | school_1_slug_1            | UNIQUE; COMPOUND  |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Board
 * @typedef TBoardPermissionException
 *
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {boolean} isAllowed - 허용 여부
 */
const boardPermissionExceptionSchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
    isAllowed: Boolean,
  },
  { _id: false }
);

/**
 * @memberof Models.Board
 * @typedef TBoardPermission
 *
 * @prop {boolean} manager - 관리자 권한
 * @prop {boolean} teacher - 교사 권한
 * @prop {boolean} student - 학생 권한
 * @prop {TBoardPermissionException[]} exceptions - 일부 사용자 예외
 */
const boardPermissionSchema = mongoose.Schema(
  {
    manager: { type: Boolean, default: false },
    teacher: { type: Boolean, default: false },
    student: { type: Boolean, default: false },
    exceptions: [boardPermissionExceptionSchema],
  },
  { _id: false }
);

const boardPermissionDefault = {
  manager: false,
  teacher: false,
  student: false,
  exceptions: [],
};

/**
 * @memberof Models.Board
 * @typedef TBoard
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} school - school._id
 * @prop {string} schoolId - school.schoolId
 * @prop {string} schoolName - school.schoolName
 * @prop {string} name - 게시판 이름
 * @prop {string} slug - URL 슬러그
 * @prop {string} description - 게시판 설명
 * @prop {ObjectId} creator - 생성자._id
 * @prop {string} creatorId - 생성자.userId
 * @prop {string} creatorName - 생성자.userName
 * @prop {TBoardPermission} permissionCreate - 게시판 생성 권한 (관리자만 가능하므로 사용하지 않음)
 * @prop {TBoardPermission} permissionWrite - 게시글 작성 권한
 * @prop {TBoardPermission} permissionRead - 게시글 읽기 권한
 * @prop {TBoardPermission} permissionComment - 댓글 작성 권한
 * @prop {boolean} isDefault - 기본 게시판 (공지사항) 여부
 * @prop {boolean} isActive - 활성화 상태
 * @prop {number} order - 정렬 순서
 * @prop {number} postCount - 게시글 수
 */
const boardSchema = mongoose.Schema(
  {
    school: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    schoolId: {
      type: String,
      required: true,
    },
    schoolName: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },

    // 생성자 정보
    creator: mongoose.Types.ObjectId,
    creatorId: String,
    creatorName: String,

    // 권한 설정 (관리자, 교사, 학생, 일부 사용자)
    permissionWrite: {
      type: boardPermissionSchema,
      default: { manager: true, teacher: true, student: false, exceptions: [] },
    },
    permissionRead: {
      type: boardPermissionSchema,
      default: { manager: true, teacher: true, student: true, exceptions: [] },
    },
    permissionComment: {
      type: boardPermissionSchema,
      default: { manager: true, teacher: true, student: true, exceptions: [] },
    },

    // 기본 게시판 (공지사항) 여부
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    postCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

boardSchema.index({ school: 1 });
boardSchema.index({ school: 1, slug: 1 }, { unique: true });

export const Board = (dbName) => {
  return conn[dbName].model("Board", boardSchema);
};
