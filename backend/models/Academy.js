const mongoose = require("mongoose");
const conn = require("../databases/root");

const validate = require("../utils/validate");

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
    },
    isActivated: { type: Boolean, default: true },
  },
  { timestamps: true }
);

academySchema.pre("save", function (next) {
  var user = this;
  if (user.isModified("academyId")) {
    user.dbName = user.academyId + "-db";
  }
  next();
});

module.exports = conn.model("Academy", academySchema);
