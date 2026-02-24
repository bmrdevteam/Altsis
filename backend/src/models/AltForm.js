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

  // Phase 2: 중복 검사
  duplicateCheck: {
    type: {
      enabled: { type: Boolean, default: false },
      mode: { type: String, enum: ["free", "preRegistration"], default: "free" },
      allowedCount: { type: Number, default: 1 },
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
 * @prop {boolean} allowResubmit - 재제출 허용
 */
const altFormSettingsSchema = mongoose.Schema(
  {
    openAt: { type: Date },
    closeAt: { type: Date },
    allowResubmit: { type: Boolean, default: false },
    allowMultipleResponses: { type: Boolean, default: false },

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

    settings: {
      type: altFormSettingsSchema,
      default: { allowResubmit: false },
    },

    sheet: mongoose.Types.ObjectId,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

altFormSchema.index({ board: 1 });
altFormSchema.index({ board: 1, createdAt: -1 });

export const AltForm = (dbName) => {
  return conn[dbName].model("AltForm", altFormSchema);
};
