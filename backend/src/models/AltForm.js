/**
 * AltForm namespace
 * @namespace Models.AltForm
 * @version 1.0.0
 *
 * @description Alt Board 양식
 * | Indexes                    | Properties        |
 * | :-----                     | ----------        |
 * | _id                        | UNIQUE            |
 * | board_1                    |                   |
 * | board_1_createdAt_-1       | COMPOUND          |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.AltForm
 * @typedef TAltFormField
 *
 * @prop {ObjectId} _id
 * @prop {string} label - 필드명
 * @prop {string} type - 필드 타입
 * @prop {string} permission - 권한 (respondent|owner)
 * @prop {boolean} visibleToRespondent - owner 필드일 때 응답자에게 공개 여부
 * @prop {boolean} required - 필수 여부
 * @prop {string[]} options - 선택지 (select/radio/checkbox용)
 * @prop {Object} validation - 타입별 검사 규칙
 * @prop {number} order - 정렬 순서
 */
const altFormFieldSchema = mongoose.Schema({
  _id: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: [
      "text",
      "textarea",
      "number",
      "date",
      "multiDate",
      "time",
      "file",
      "select",
      "multiSelect",
      "checkbox",
      "radio",
      "userSelect",
      "rating",
      "scale",
      "counter",
      "approval",
      "circulation",
      "link",
      "content",
      "docResponse",
      "aiChat",
    ],
    required: true,
  },
  permission: {
    type: String,
    enum: ["respondent", "owner"],
    default: "respondent",
  },
  visibleToRespondent: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  options: { type: [String], default: undefined },
  validation: { type: mongoose.Schema.Types.Mixed },
  /** content: 읽기 전용 안내 / docResponse: 응답 템플릿 / aiChat: 챗봇 지침 마크다운 */
  content: { type: String, default: "" },
  /** content / docResponse / aiChat 참고 파일 (응답값으로 저장되지 않음) */
  attachments: {
    type: [
      {
        originalName: { type: String, required: true },
        key: { type: String, required: true },
        mimeType: { type: String, default: "" },
        size: { type: Number },
      },
    ],
    default: undefined,
  },
  /** content / docResponse / aiChat 참고 링크 */
  links: {
    type: [
      {
        title: { type: String, default: "" },
        url: { type: String, required: true },
        ogTitle: { type: String, default: "" },
        ogDescription: { type: String, default: "" },
        ogImage: { type: String, default: "" },
      },
    ],
    default: undefined,
  },
  order: { type: Number, default: 0 },

  // Phase 2: 조건부 표시
  displayCondition: {
    type: {
      enabled: { type: Boolean, default: false },
      logic: { type: String, enum: ["and", "or"], default: "and" },
      conditions: [
        {
          fieldId: String,
          operator: {
            type: String,
            enum: [
              "equals",
              "notEquals",
              "contains",
              "isEmpty",
              "isNotEmpty",
            ],
          },
          value: mongoose.Schema.Types.Mixed,
        },
      ],
    },
    default: undefined,
  },

  // Phase 2: 퀴즈 모드
  correctAnswer: { type: mongoose.Schema.Types.Mixed },
  points: { type: Number, default: 0 },

  // 평가 모드: 항목별 채점 방식
  gradingMethod: {
    type: String,
    enum: ["none", "completion", "manual_score", "rubric"],
    default: undefined,
  },
  /** @deprecated gradingMethod === rubric 단일 루브릭 (하위 호환) */
  rubricId: { type: String, default: undefined },
  /** gradingMethod === rubric 일 때 form.rubrics[].id 목록 */
  rubricIds: { type: [String], default: undefined },

  // Phase 2: 중복 검사
  duplicateCheck: {
    type: {
      enabled: { type: Boolean, default: false },
      mode: { type: String, enum: ["free", "preRegistration"], default: "free" },
      allowedCount: { type: Number, default: 1 },
    },
    default: undefined,
  },

  // 결재선 (approval 필드) — 양식에 저장되어 복제·가져오기 시 함께 이동
  approvalLine: {
    type: {
      steps: [
        {
          order: { type: Number, default: 0 },
          label: { type: String, default: "" },
          mode: {
            type: String,
            enum: ["fixed", "pick"],
            default: "pick",
          },
          approver: {
            type: {
              user: String,
              userId: String,
              userName: String,
            },
            default: undefined,
          },
        },
      ],
      // 결재 단계와 별도. 제출 행 보기만 (승인 권한 없음)
      circulation: {
        type: {
          mode: {
            type: String,
            enum: ["off", "pick", "fixed"],
            default: "off",
          },
          users: [
            {
              user: String,
              userId: String,
              userName: String,
            },
          ],
        },
        default: undefined,
      },
    },
    default: undefined,
  },

  // 회람 필드 (type === circulation). 예전 양식은 approvalLine.circulation
  circulation: {
    type: {
      mode: {
        type: String,
        enum: ["off", "pick", "fixed"],
        default: "pick",
      },
      users: [
        {
          user: String,
          userId: String,
          userName: String,
        },
      ],
    },
    default: undefined,
  },
});

/**
 * @memberof Models.AltForm
 * @typedef TAltFormSettings
 *
 * @prop {Date} openAt - 공개 시작
 * @prop {Date} closeAt - 공개 종료
 * @prop {boolean} allowResubmit - 재제출 허용 (수정·삭제. 복수 응답과 함께 쓰면 건별)
 */
const altFormSettingsSchema = mongoose.Schema(
  {
    openAt: { type: Date },
    closeAt: { type: Date },
    allowResubmit: { type: Boolean, default: false },
    allowMultipleResponses: { type: Boolean, default: false },
    /**
     * 필수 + 복수 응답일 때 목표 제출 횟수.
     * myResponseCount >= requiredResponseCount 이면 제출완료.
     */
    requiredResponseCount: { type: Number, min: 1 },
    /**
     * 필수 모드: 미제출 표시·활동 뱃지 대상.
     * true일 때만 필수. 필드 없는 기존 양식·false는 선택 제출.
     */
    requiredMode: { type: Boolean, default: false },

    /**
     * 요일마다: 출제 요일의 startTime부터 +endDayOffset일 endTime까지 회차 창.
     * 전제: requiredMode + allowMultipleResponses + openAt + closeAt
     */
    weekdaySchedule: {
      type: {
        enabled: { type: Boolean, default: false },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        startTime: { type: String },
        endTime: { type: String },
        /** 0=당일, 최대 14. 출제일 시작 시각 ~ N일 뒤 종료 시각 */
        endDayOffset: { type: Number, min: 0, max: 14, default: 0 },
      },
      default: undefined,
    },

    // Phase 2: 퀴즈 모드
    quizMode: { type: Boolean, default: false },
    quizSettings: {
      type: {
        scoreReveal: {
          type: String,
          enum: ["immediately", "afterDeadline", "never"],
          default: "immediately",
        },
        answerReveal: {
          type: String,
          enum: ["immediately", "afterDeadline", "never"],
          default: "afterDeadline",
        },
        showWrongMarks: { type: Boolean, default: true },
      },
      default: undefined,
    },

    // 평가 모드 (퀴즈와 상호 배타)
    assessmentMode: { type: Boolean, default: false },
    assessmentSettings: {
      type: {
        revealOn: {
          type: String,
          enum: ["finalized"],
          default: "finalized",
        },
        finalEvaluation: {
          mode: {
            type: String,
            enum: ["rubric_only", "score_only", "both"],
            default: "both",
          },
        },
      },
      default: undefined,
    },

    // Phase 2: 직접 입력 모드
    directInputMode: { type: Boolean, default: false },

    // Phase 3: 응답 공개 설정
    shareResponses: { type: Boolean, default: false },
    showOwnerFields: { type: Boolean, default: false },
    showOwnResponse: { type: Boolean, default: true },
  },
  { _id: false }
);

/**
 * @memberof Models.AltForm
 * @typedef TAltForm
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} board - board._id
 * @prop {ObjectId} school - school._id
 * @prop {ObjectId} creator - 생성자._id
 * @prop {string} creatorId - 생성자.userId
 * @prop {string} creatorName - 생성자.userName
 * @prop {string} title - 양식 제목
 * @prop {string} description - 양식 설명
 * @prop {TAltFormField[]} fields - 필드 목록
 * @prop {TAltFormSettings} settings - 설정
 * @prop {ObjectId} sheet - 자동 생성된 AltSheet._id
 * @prop {boolean} isActive - 활성화 상태
 */
const altFormSchema = mongoose.Schema(
  {
    board: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId, required: true },

    creator: mongoose.Types.ObjectId,
    creatorId: String,
    creatorName: String,

    title: { type: String, required: true },
    description: { type: String, default: "" },

    fields: { type: [altFormFieldSchema], default: [] },

    /** 양식 스코프 루브릭 (평가 모드) */
    rubrics: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          levels: [
            {
              id: { type: String, required: true },
              label: { type: String, required: true },
              description: { type: String, default: "" },
              points: { type: Number },
            },
          ],
        },
      ],
      default: [],
    },

    /** 양식 스코프 결재·회람 그룹 */
    approvalGroups: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          kind: {
            type: String,
            enum: ["approver", "circulation", "both"],
            default: "both",
          },
          members: [
            {
              label: { type: String, default: "" },
              user: {
                user: String,
                userId: String,
                userName: String,
              },
            },
          ],
        },
      ],
      default: [],
    },

    settings: {
      type: altFormSettingsSchema,
      default: { allowResubmit: false },
    },

    sheet: mongoose.Types.ObjectId,

    isActive: { type: Boolean, default: true },
    /**
     * 비공개(true): 작성자만 목록·열람. 응답·캘린더 없음.
     * 공개(false): 멤버에게 노출.
     * DB 기본은 공개(false). 신규 비공개 생성은 컨트롤러에서 isDraft:true 로 지정.
     */
    isDraft: { type: Boolean, default: false },

    /**
     * 양식 멤버 (보드와 동일 형태). 비어 있으면 보드 멤버를 따름.
     * groups + users 중 하나라도 있으면 이 양식만 제한.
     */
    members: {
      type: {
        groups: {
          manager: { type: Boolean, default: false },
          teacher: { type: Boolean, default: false },
          student: { type: Boolean, default: false },
        },
        users: {
          type: [
            {
              user: mongoose.Types.ObjectId,
              userId: String,
              userName: String,
            },
          ],
          default: [],
        },
      },
      default: undefined,
    },
    /**
     * 양식 작성 권한 (기록 전체). 비어 있으면 보드 writer를 따름.
     */
    writers: {
      type: {
        groups: {
          manager: { type: Boolean, default: false },
          teacher: { type: Boolean, default: false },
          student: { type: Boolean, default: false },
        },
        users: {
          type: [
            {
              user: mongoose.Types.ObjectId,
              userId: String,
              userName: String,
            },
          ],
          default: [],
        },
      },
      default: undefined,
    },
  },
  { timestamps: true }
);

altFormSchema.index({ board: 1 });
altFormSchema.index({ board: 1, createdAt: -1 });

export const AltForm = (dbName) => {
  return conn[dbName].model("AltForm", altFormSchema);
};
