import mongoose from "mongoose";
import { root as conn } from "../_database/mongodb/root.js";

import { validate } from "../utils/validate.js";

const academySchema = mongoose.Schema(
  {
    academyId: {
      type: String,
      unique: true,
      validate: (val) => validate("academyId", val),
    },
    academyName: {
      type: String,
      validate: (val) => validate("academyName", val),
    },
    email: {
      type: String,
      validate: (val) => validate("email", val),
    },
    tel: {
      type: String,
      validate: (val) => validate("tel", val),
    },
    adminId: {
      type: String,
      validate: (val) => validate("userId", val),
    },
    adminName: {
      type: String,
      validate: (val) => validate("userName", val),
    },
    dbName: {
      type: String,
      select: false,
    },
    isActivated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

academySchema.pre("save", function (next) {
  var academy = this;
  if (academy.isModified("academyId")) {
    academy.dbName = academy.academyId + "-db";
  }
  next();
});

export const Academy =
  process.env.NODE_ENV?.trim() !== "test"
    ? conn?.model("Academy", academySchema)
    : {};
