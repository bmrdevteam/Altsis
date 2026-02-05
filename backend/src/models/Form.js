/**
 * Form namespace
 * @namespace Models.Form
 * @version 2.0.0
 *
 * @description 양식
 * | Indexes      | Properties  |
 * | :-----       | ----------  |
 * | _id          | UNIQUE      |
 */
import mongoose from "mongoose";
import { conn } from "../_database/mongodb/index.js";

/**
 * @memberof Models.Form
 * @typedef TFormPermissionException
 *
 * @prop {ObjectId} user - user._id
 * @prop {string} userId - user.userId
 * @prop {string} userName - user.userName
 * @prop {boolean} isAllowed - 허용 여부
 */
const formPermissionExceptionSchema = mongoose.Schema(
  {
    user: mongoose.Types.ObjectId,
    userId: String,
    userName: String,
    isAllowed: Boolean,
  },
  { _id: false }
);

/**
 * @memberof Models.Form
 * @typedef TFormPermission
 *
 * @prop {boolean} teacher - 교사 권한
 * @prop {boolean} student - 학생 권한
 * @prop {TFormPermissionException[]} exceptions - 일부 사용자 예외
 */
const formPermissionSchema = mongoose.Schema(
  {
    teacher: { type: Boolean, default: true },
    student: { type: Boolean, default: false },
    exceptions: [formPermissionExceptionSchema],
  },
  { _id: false }
);

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
 * @prop {TFormPermission} permissionView - 문서 열람 권한
 *
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
    permissionView: {
      type: formPermissionSchema,
      default: { teacher: true, student: false, exceptions: [] },
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
