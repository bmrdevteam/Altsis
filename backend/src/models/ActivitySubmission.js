/**
 * ActivitySubmission namespace
 * @namespace Models.ActivitySubmission
 * @version 1.0.0
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const feedbackSchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
    content: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const activitySubmissionSchema = mongoose.Schema(
  {
    activity: { type: mongoose.Types.ObjectId, required: true },
    altSheetRow: mongoose.Types.ObjectId,
    enrollment: { type: mongoose.Types.ObjectId, required: true },
    student: { type: mongoose.Types.ObjectId, required: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    studentGrade: String,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "submitted", "returned", "completed"],
      default: "not_started",
    },
    feedback: { type: [feedbackSchema], default: [] },
    submittedAt: Date,
    resubmitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

activitySubmissionSchema.index({ activity: 1, enrollment: 1 }, { unique: true });

export const ActivitySubmission = (dbName) => {
  return conn[dbName].model("ActivitySubmission", activitySubmissionSchema);
};
