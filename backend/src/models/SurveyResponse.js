/**
 * SurveyResponse namespace
 * @namespace Models.SurveyResponse
 * @version 1.0.0
 *
 * @description 설문 응답
 * | Indexes                      | Properties        |
 * | :-----                       | ----------        |
 * | _id                                    | UNIQUE            |
 * | post_1_surveyId_1_respondent_1        | UNIQUE; COMPOUND  |
 * | post_1_surveyId_1_createdAt_-1        | COMPOUND          |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

const surveyAnswerFileSchema = mongoose.Schema(
  {
    fileName: String,
    fileSize: Number,
    mimeType: String,
    key: String,
  },
  { _id: false }
);

const surveyAnswerSchema = mongoose.Schema(
  {
    questionId: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
    files: { type: [surveyAnswerFileSchema], default: [] },
  },
  { _id: false }
);

/**
 * @memberof Models.SurveyResponse
 * @typedef TSurveyResponse
 *
 * @prop {ObjectId} _id
 * @prop {ObjectId} post - post._id
 * @prop {ObjectId} respondent - 응답자._id
 * @prop {string} respondentId - 응답자.userId
 * @prop {string} respondentName - 응답자.userName
 * @prop {TSurveyAnswer[]} answers - 응답 목록
 */
const surveyResponseSchema = mongoose.Schema(
  {
    post: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },
    surveyId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },

    // 응답자 정보
    respondent: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    respondentId: {
      type: String,
      required: true,
    },
    respondentName: {
      type: String,
      required: true,
    },

    // 응답 목록
    answers: {
      type: [surveyAnswerSchema],
      required: true,
    },
  },
  { timestamps: true }
);

surveyResponseSchema.index(
  { post: 1, surveyId: 1, respondent: 1 },
  { unique: true }
);
surveyResponseSchema.index({ post: 1, surveyId: 1, createdAt: -1 });

export const SurveyResponse = (dbName) => {
  return conn[dbName].model("SurveyResponse", surveyResponseSchema);
};
