/**
 * ActivityTemplate namespace
 * @namespace Models.ActivityTemplate
 * @version 1.0.0
 *
 * @description 교육활동 템플릿
 * | Indexes                              | Properties |
 * | :-----                               | ---------- |
 * | _id                                  | UNIQUE     |
 * | scope_1_builtinKey_1                 | COMPOUND   |
 * | scope_1_school_1_type_1_createdAt_-1 | COMPOUND   |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const templatePresetSchema = mongoose.Schema(
  {
    content: { type: String, default: "" },
    attachments: {
      type: [
        mongoose.Schema(
          {
            name: String,
            key: String,
            url: String,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    altFormSchema: {
      type: mongoose.Schema(
        {
          fields: { type: [mongoose.Schema.Types.Mixed], default: [] },
          settings: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        { _id: false }
      ),
      default: { fields: [], settings: {} },
    },
    rubric: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
  },
  { _id: false }
);

/**
 * @memberof Models.ActivityTemplate
 * @typedef TActivityTemplate
 *
 * @prop {ObjectId} _id
 * @prop {"builtin"|"school"|"personal"} scope
 * @prop {ObjectId?} school
 * @prop {string?} schoolId
 * @prop {string?} schoolName
 * @prop {ObjectId?} creator
 * @prop {string?} creatorId
 * @prop {string?} creatorName
 * @prop {"assignment"|"quiz"|"discussion"} type
 * @prop {string} name
 * @prop {Object} preset
 * @prop {boolean} isEditable
 * @prop {boolean} isActive
 * @prop {string?} builtinKey
 */
const activityTemplateSchema = mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["builtin", "school", "personal"],
      required: true,
      default: "personal",
    },
    school: mongoose.Types.ObjectId,
    schoolId: String,
    schoolName: String,
    creator: mongoose.Types.ObjectId,
    creatorId: String,
    creatorName: String,
    type: {
      type: String,
      enum: ["assignment", "quiz", "discussion"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    preset: {
      type: templatePresetSchema,
      default: {
        content: "",
        attachments: [],
        altFormSchema: { fields: [], settings: {} },
        rubric: [],
      },
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    builtinKey: String,
  },
  { timestamps: true }
);

activityTemplateSchema.index({ scope: 1, builtinKey: 1 });
activityTemplateSchema.index({
  scope: 1,
  school: 1,
  type: 1,
  createdAt: -1,
});

export const ActivityTemplate = (dbName) => {
  return conn[dbName].model("ActivityTemplate", activityTemplateSchema);
};
