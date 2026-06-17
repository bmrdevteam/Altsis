/**
 * ActivityTemplate namespace
 * @namespace Models.ActivityTemplate
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

const presetSchema = mongoose.Schema(
  {
    content: String,
    altFormSchema: { type: [], default: [] },
    rubric: { type: [rubricItemSchema], default: [] },
    aiTutor: Object,
  },
  { _id: false }
);

const activityTemplateSchema = mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["builtin", "school", "personal"],
      required: true,
    },
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["assignment", "quiz", "discussion"],
      required: true,
    },
    description: String,
    preset: { type: presetSchema, default: {} },
    isEditable: { type: Boolean, default: true },
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
  },
  { timestamps: true }
);

activityTemplateSchema.index({ scope: 1, type: 1 });

export const ActivityTemplate = (dbName) => {
  return conn[dbName].model("ActivityTemplate", activityTemplateSchema);
};
