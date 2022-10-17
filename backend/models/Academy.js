const mongoose = require("mongoose");
const conn = require("../databases/root");
const validator = require("validator");
const validate = require("mongoose-validator");

const academySchema = mongoose.Schema(
  {
    academyId: {
      type: String,
      unique: true,
      minLength: 3,
      maxLength: 20,
      validate: validate({ validator: "isAlphanumeric" }),
    },
    academyName: {
      type: String,
    },
    email: {
      type: String,
      validate: validate({ validator: "isEmail" }),
    },
    tel: {
      type: String,
    },
    adminId: {
      type: String,
      minLength: 4,
      maxLength: 20,
      validate: validate({ validator: "isAlphanumeric" }),
    },
    adminName: {
      type: String,
      minLength: 2,
      maxLength: 20,
    },
    dbName: {
      type: String,
    },
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

const check = {
  academyId: (val) =>
    validator.isLength(val, { min: 3, max: 20 }) &&
    validator.isAlphanumeric(val),
  email: (val) => validator.isEmail(val),
  tel: (val) => true,
  adminId: (val) =>
    validator.isLength(val, { min: 4, max: 20 }) &&
    validator.isAlphanumeric(val),
  adminName: (val) => validator.isLength(val, { min: 2, max: 20 }),
};

academySchema.methods.checkValidation = function (key) {
  if (key) {
    return check[key](this[key]);
  }
  for (const key in check) {
    if (!check[key](this[key])) return false;
  }
  return true;
};

module.exports = conn.model("Academy", academySchema);
