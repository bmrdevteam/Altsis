/**
 * Form namespace
 * @namespace Models.Form
 * @version 2.0.0
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Form
 * @typedef TForm
 *
 * @prop {ObjectId} _id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {string} type - ex) "timetable", "syllabus", "print"
 * @prop {string} title
 * @prop {Object} data - 에디터에 의해 설정됨
 * @prop {boolean} archived=false - 보관 처리 설정
 *
 * @description 양식
 */

const formSchema = mongoose.Schema(
  {
    userId: String,
    userName: String,
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Array,
    },
  },
  { timestamps: true }
);

// formSchema.index(
//   {
//     type: 1,
//     title: 1,
//   },
//   { unique: true }
// );

export const Form = (dbName) => {
  return conn[dbName].model("Form", formSchema);
};
