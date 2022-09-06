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
    },
    academyName: {
      type: String,
    },
    email: {
      type: String,
      validate: validate({ validator: "isEmail" }),
    },
    tel: String,
    adminId: {
      type: String,
      minLength: 4,
      maxLength: 20,
      validate: validate({ validator: "isAlphanumeric" }),
    },
    adminName: {
      type: String,
      min: 2,
      max: 20,
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

module.exports = conn.model("Academy", academySchema);
