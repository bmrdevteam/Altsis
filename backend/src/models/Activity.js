/**
 * Activity namespace
 * @namespace Models.Activity
 * @version 1.0.0
 */

import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const rubricItemSchema = mongoose.Schema(
  {
    label: String,
    maxScore: { type: Number, default: 0 },
    description: String,
  },
  { _id: false }
);

const attachmentSchema = mongoose.Schema(
  {
    name: String,
    url: String,
    size: Number,
  },
  { _id: false }
);

const activitySchema = mongoose.Schema(
  {
    syllabus: { type: mongoose.Types.ObjectId, required: true },
    season: mongoose.Types.ObjectId,
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
    year: String,
    term: String,
    title: { type: String, required: true },
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
    content: String,
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
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
  },
  { timestamps: true }
);

activitySchema.index({ syllabus: 1, order: 1 });
activitySchema.index({ season: 1 });

export const Activity = (dbName) => {
  return conn[dbName].model("Activity", activitySchema);
};
