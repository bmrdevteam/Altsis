import mongoose from "mongoose";
import { conn } from "../databases/connection.js";

const memoSchema = mongoose.Schema({
  title: String,
  day: String,
  start: String,
  end: String,
  memo: String,
});

const registrationSchema = mongoose.Schema({
  season: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  school: mongoose.Types.ObjectId,
  schoolId: String,
  schoolName: String,
  year: String,
  term: String,
  period: Object,
  user: { type: mongoose.Types.ObjectId, required: true },
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  grade: String,
  group: String,
  teacher: mongoose.Types.ObjectId,
  teacherId: String,
  teacherName: String,
  subTeacher: mongoose.Types.ObjectId,
  subTeacherId: String,
  subTeacherName: String,
  isActivated: {
    type: Boolean,
    default: false,
  },
  memos: [memoSchema],
});

registrationSchema.index({
  user: 1,
});

registrationSchema.index(
  {
    season: 1,
    user: 1,
  },
  { unique: true }
);

export const Registration = (dbName) => {
  return conn[dbName].model("Registration", registrationSchema);
};
