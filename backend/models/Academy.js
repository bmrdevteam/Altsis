const mongoose = require("mongoose");
const conn = require("../databases/root");
const validator = require("validator");

const defaultVal = "root";

const academySchema = mongoose.Schema(
  {
    academyId: {
      type: String,
      unique: true,
      default: defaultVal,
    },
    academyName: {
      type: String,
      default: defaultVal,
    },
    email: String,
    tel: String,
    adminId: String,
    adminName: String,
    dbName: {
      type: String,
      default: defaultVal,
    },
  },
  { timestamps: true }
);

academySchema.pre("save", function (next) {
  var user = this;
  if (user.isModified("academyId") && user.academyId != defaultVal) {
    user.dbName = user.academyId + "-db";
  }
  next();
});

academySchema.statics.getDefault = function () {
  return {
    academyId: defaultVal,
    academyName: defaultVal,
    dbName: defaultVal,
  };
};

const check = {
  academyId: (val) => validator.isLength(val, { min: 3, max: 20 }),
  adminId: (val) =>
    validator.isLength(val, { min: 4, max: 20 }) &&
    validator.isAlphanumeric(val),
  adminName: (val) => validator.isLength(val, { min: 2, max: 20 }),
  email: (val) => validator.isEmail(val),
};

academySchema.methods.validationCheck = function (key) {
  if (!key) {
    for (const key in check) {
      if (!check[key](this[key])) return false;
    }
  }
  return check[key](this[key]);
};

module.exports = conn.model("Academy", academySchema);
