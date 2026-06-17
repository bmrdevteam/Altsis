/**
 * ActivitySubmission namespace
 * @namespace Models.ActivitySubmission
 * @version 1.0.0
 *
 * @description 교육활동 제출/피드백 상태
 * | Indexes                              | Properties |
 * | :-----                               | ---------- |
 * | _id                                  | UNIQUE     |
 * | activity_1_enrollment_1              | UNIQUE     |
 * | activity_1_status_1_submittedAt_-1   | COMPOUND   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const feedbackSchema = mongoose.Schema(
  {
    author: mongoose.Types.ObjectId,
    authorId: String,
    authorName: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * @memberof Models.ActivitySubmission
 * @typedef TActivitySubmission
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} activity
 * @prop {ObjectId} syllabus
 * @prop {ObjectId} season
 * @prop {ObjectId} school
 * @prop {ObjectId} enrollment
 * @prop {ObjectId} student
 * @prop {string} studentId
 * @prop {string} studentName
 * @prop {ObjectId?} altSheetRow
 * @prop {"not_started"|"in_progress"|"submitted"|"returned"|"completed"} status
 * @prop {Date?} submittedAt
 * @prop {number} resubmitCount
 * @prop {Object[]} feedback
 * @prop {boolean} isActive
 */
const activitySubmissionSchema = mongoose.Schema(
  {
    activity: { type: mongoose.Types.ObjectId, required: true },
    syllabus: { type: mongoose.Types.ObjectId, required: true },
    season: { type: mongoose.Types.ObjectId, required: true },
    school: { type: mongoose.Types.ObjectId, required: true },
    enrollment: { type: mongoose.Types.ObjectId, required: true },
    student: { type: mongoose.Types.ObjectId, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    altSheetRow: mongoose.Types.ObjectId,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "submitted", "returned", "completed"],
      default: "not_started",
    },
    submittedAt: Date,
    resubmitCount: { type: Number, default: 0 },
    feedback: { type: [feedbackSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

activitySubmissionSchema.index({ activity: 1, enrollment: 1 }, { unique: true });
activitySubmissionSchema.index({ activity: 1, status: 1, submittedAt: -1 });

export const ActivitySubmission = (dbName) => {
  return conn[dbName].model("ActivitySubmission", activitySubmissionSchema);
};
