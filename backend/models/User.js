import mongoose from "mongoose";
import bcrypt from "bcrypt";

import { conn } from "../databases/connection.js";

import { validate } from "../utils/validate.js";

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
    workspace: {
      type: mongoose.Schema(
        {
          id: String,
          email: String,
          accessToken: String,
          expires: Date,
          refreshToken: String,
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

userSchema.statics.isValid = function (user) {
  for (let field of ["userId", "userName"]) {
    if (!validate(field, user[field])) return false;
  }
  if (user["email"] && !validate("email", user["email"])) return false;
  if (user["tel"] && !validate("tel", user["tel"])) return false;
  return true;
};

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

userSchema.statics.generatePassword = function () {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const specialChars = "!@#$%^&*()";

  const randomNumber = Math.floor(Math.random() * specialChars.length);
  let password = specialChars[randomNumber];
  for (var i = 0; i < 11; i++) {
    const randomNumber = Math.floor(Math.random() * chars.length);
    password += chars[randomNumber];
  }
  return password;
};

export const User = (dbName) => {
  return conn[dbName].model("User", userSchema);
};
