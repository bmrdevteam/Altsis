const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { conn } = require("../databases/connection");

const myValidate = require("../utils/myValidate");

const userSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      validate: (val) => myValidate("userId", val),
    },
    userName: {
      type: String,
      validate: (val) => myValidate("userName", val),
    },
    password: {
      type: String,
      validate: (val) => myValidate("password", val),
      select: false, //alwasy exclude password in user document
    },
    auth: {
      type: String,
      default: "member",
    },
    email: {
      type: String,
      validate: (val) => myValidate("email", val),
    },
    tel: {
      type: String,
      validate: (val) => myValidate("tel", val),
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
  },
  { timestamps: true }
);

userSchema.methods.validate = function (key) {
  if (key) {
    return regExp[key].test(this[key]);
  }

  if (!myValidate("userId", this["userId"])) return false;
  if (!myValidate("userName", this["userName"])) return false;
  if (this["email"] && !myValidate("email", this["email"])) return false;
  if (this["tel"] && !myValidate("tel", this["tel"])) return false;
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

module.exports = (dbName) => {
  return conn[dbName].model("User", userSchema);
};
