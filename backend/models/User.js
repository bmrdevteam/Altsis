/**
 * User namespace
 * @namespace Models.User
 * @version 2.0.0
 */
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { conn } from "../_database/mongodb/index.js";

import { validate } from "../utils/validate.js";

/**
 * @memberof Models.User
 * @typedef TUserSchool
 *
 * @prop {ObjectId} school - ObjectId of school
 * @prop {string} schoolId
 * @prop {string} schoolName
 */

/**
 * @memberof Models.User
 * @typedef TSnsId
 *
 * @prop {string?} google - gogole email
 */

/**
 * @memberof Models.User
 * @typedef TUser
 *
 * @prop {ObjectId} _id
 * @prop {string} userId - unique; validate
 * @prop {string} userName - validate
 * @prop {string} password - validate; API로 조회할 수 없다; bcrypt로 해시화되어 저장된다;
 * @prop {"owner"|"admin"|"manager"|"member"} auth="member" - 등급
 * @prop {string?} email - validate
 * @prop {string?} tel - validate
 * @prop {TSnsId?} snsId - 소셜 로그인 계정
 * @prop {TUserSchool[]} schools - 등록된 학교 목록
 * @prop {string?} profile - 프로필 사진 주소
 * @prop {string} academyId
 * @prop {string} academyName
 *
 * @description 사용자
 */
const userSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      validate: (val) => validate("userId", val),
    },
    userName: {
      type: String,
      validate: (val) => validate("userName", val),
    },
    password: {
      type: String,
      validate: (val) => validate("password", val),
      select: false, //alwasy exclude password in user document
    },
    auth: {
      type: String,
      enum: ["owner", "admin", "manager", "member"],
      default: "member",
    },
    email: {
      type: String,
      validate: (val) => validate("email", val),
    },
    tel: {
      type: String,
      validate: (val) => validate("tel", val),
    },
    snsId: Object,
    schools: [
      mongoose.Schema(
        {
          school: mongoose.Types.ObjectId,
          schoolId: String,
          schoolName: String,
        },
        { _id: false }
      ),
    ],
    profile: String,
    academyId: String,
    academyName: String,
    calendar: String,

    // deprecated
    workspace: {
      type: mongoose.Schema(
        {
          id: String,
          email: String,
          accessToken: String,
          expires: Date,
          refreshToken: String,
          calendars: mongoose.Schema(
            {
              items: [Object],
            },
            { _id: false }
          ),
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  var user = this;
  if (user.isModified("password")) {
    //비밀번호가 바뀔때만 암호화
    bcrypt.genSalt(parseInt(process.env["saltRounds"]), function (err, salt) {
      if (err) return next(err);
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

userSchema.methods.comparePassword = async function (plainPassword) {
  var user = this;
  try {
    const isMatch = await bcrypt.compare(plainPassword, user.password);
    return isMatch;
  } catch (err) {
    return err;
  }
};

export const User = (dbName) => {
  return conn[dbName].model("User", userSchema);
};
