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
 * @typedef TMemberUser
 *
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
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
 * @memberof Models.Board
 * @typedef TBoardMembers
 *
 * @prop {Object} groups - 역할 그룹 초대
 * @prop {boolean} groups.manager - 관리자 그룹
 * @prop {boolean} groups.teacher - 교사 그룹
 * @prop {boolean} groups.student - 학생 그룹
 * @prop {TMemberUser[]} users - 개별 초대 사용자
 */
const boardMemberSchema = mongoose.Schema(
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

// 하위호환용 - 기존 permission 구조 (레거시 데이터 읽기용)
const boardPermissionExceptionSchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
    isAllowed: Boolean,
  },
  { _id: false }
);

const boardPermissionSchema = mongoose.Schema(
  {
    manager: { type: Boolean, default: false },
    teacher: { type: Boolean, default: false },
    student: { type: Boolean, default: false },
    exceptions: [boardPermissionExceptionSchema],
  },
  { _id: false }
);

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
 * @prop {TBoardMembers} members - 보드 멤버 (접근 권한)
 * @prop {TBoardMembers} writers - 작성 권한
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

    // 멤버 (보드에 접근할 수 있는 사람)
    members: {
      type: boardMemberSchema,
      default: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
    },

    // 작성 권한 (게시글을 작성할 수 있는 사람)
    writers: {
      type: boardMemberSchema,
      default: {
        groups: { manager: false, teacher: false, student: false },
        users: [],
      },
    },

    // 하위호환용 - 기존 권한 필드 (레거시 데이터)
    permissionWrite: { type: boardPermissionSchema },
    permissionRead: { type: boardPermissionSchema },
    permissionComment: { type: boardPermissionSchema },

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

    // 콘텐츠 뷰 모드 (보드 관리자가 설정, 전체 사용자에게 적용)
    contentViewMode: {
      type: String,
      enum: ["table", "blog"],
      default: "blog",
    },

    // 보드 유형 (official: 관리자 생성, user: 일반 사용자 생성)
    boardType: {
      type: String,
      enum: ["official", "user"],
      default: "official",
    },

    // 커버 이미지/색상
    coverImage: String,
    coverColor: String,

    // Alt Board 확장 필드
    boardMode: {
      type: String,
      enum: ["classic", "alt"],
      default: "alt",
    },
    syllabus: mongoose.Types.ObjectId,
    altBoardRole: {
      type: Map,
      of: {
        type: String,
        enum: ["admin", "writer", "respondent"],
      },
    },

    // 보드 채팅 기능 활성화
    chatEnabled: {
      type: Boolean,
      default: false,
    },

    // 보드 알림 이벤트 설정
    notificationEvents: {
      type: {
        newPost: { type: Boolean, default: false },
        boardInvitation: { type: Boolean, default: false },
        altFormApprovalRequest: { type: Boolean, default: false },
        altFormApprovalResult: { type: Boolean, default: false },
        formDeadlineCalendar: { type: Boolean, default: false },
      },
      default: {
        newPost: false,
        boardInvitation: false,
        altFormApprovalRequest: false,
        altFormApprovalResult: false,
        formDeadlineCalendar: false,
      },
    },
  },
  { timestamps: true }
);

boardSchema.index({ school: 1 });
boardSchema.index({ school: 1, slug: 1 }, { unique: true });

export const Board = (dbName) => {
  return conn[dbName].model("Board", boardSchema);
};
