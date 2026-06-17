/**
 * Activity namespace
 * @namespace Models.Activity
 * @version 1.0.0
 *
 * @description 수업 내 교육활동
 * | Indexes                        | Properties |
 * | :-----                         | ---------- |
 * | _id                            | UNIQUE     |
 * | syllabus_1_isActive_1_order_1  | COMPOUND   |
 * | syllabus_1_createdAt_-1        | COMPOUND   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const rubricItemSchema = mongoose.Schema(
  {
    label: String,
    description: String,
    score: Number,
  },
  { _id: false }
);

const attachmentSchema = mongoose.Schema(
  {
    name: String,
    key: String,
    url: String,
  },
  { _id: false }
);

/**
 * @memberof Models.Activity
 * @typedef TActivity
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} syllabus
 * @prop {ObjectId} season
 * @prop {ObjectId} school
 * @prop {string} schoolId
 * @prop {string} schoolName
 * @prop {string} year
 * @prop {string} term
 * @prop {string} classTitle
 * @prop {"assignment"|"quiz"|"discussion"} type
 * @prop {"draft"|"published"|"closed"} status
 * @prop {string} title
 * @prop {string} content
 * @prop {Object[]} attachments
 * @prop {ObjectId?} altForm
 * @prop {ObjectId?} altBoard
 * @prop {Date?} openAt
 * @prop {Date?} dueAt
 * @prop {boolean} allowLateSubmission
 * @prop {boolean} allowResubmit
 * @prop {"none"|"feedback"|"formal"} evaluationMode
 * @prop {Object[]} rubric
 * @prop {ObjectId?} sourceTemplate
 * @prop {number} order
 * @prop {ObjectId} creator
 * @prop {string} creatorId
 * @prop {string} creatorName
 * @prop {boolean} isActive
 */
const activitySchema = mongoose.Schema(
  {
    syllabus: { type: mongoose.Types.ObjectId, required: true },
    season: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId, required: true },
    schoolId: { type: String, required: true },
    schoolName: { type: String, required: true },
    year: { type: String, required: true },
    term: { type: String, required: true },
    classTitle: { type: String, required: true },
    type: {
      type: String,
      enum: ["assignment", "quiz", "discussion"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    altForm: mongoose.Types.ObjectId,
    altBoard: mongoose.Types.ObjectId,
    openAt: Date,
    dueAt: Date,
    allowLateSubmission: { type: Boolean, default: false },
    allowResubmit: { type: Boolean, default: false },
    evaluationMode: {
      type: String,
      enum: ["none", "feedback", "formal"],
      default: "feedback",
    },
    rubric: { type: [rubricItemSchema], default: [] },
    sourceTemplate: mongoose.Types.ObjectId,
    order: { type: Number, default: 0 },
    creator: mongoose.Types.ObjectId,
    creatorId: String,
    creatorName: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

activitySchema.index({ syllabus: 1, isActive: 1, order: 1 });
activitySchema.index({ syllabus: 1, createdAt: -1 });

export const Activity = (dbName) => {
  return conn[dbName].model("Activity", activitySchema);
};
