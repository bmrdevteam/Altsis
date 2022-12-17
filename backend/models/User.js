const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const validate = require("mongoose-validator");

const { conn } = require("../databases/connection");
const specialRegExp = /[!@#$%^&*()]+/;

const userSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      minLength: 4,
      maxLength: 20,
      validate: validate({ validator: "isAlphanumeric" }),
    },
    userName: {
      type: String,
      minLength: 2,
      maxLength: 20,
    },
    password: {
      type: String,
      min: 8,
      max: 26,
      match: specialRegExp,
      select: false, //alwasy exclude password in user document
    },
    auth: {
      type: String,
      default: "member",
    },
    email: {
      type: String,
      validate: validate({ validator: "isEmail" }),
    },
    tel: String,
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

const check = {
  userId: (val) =>
    validator.isLength(val, { min: 4, max: 20 }) &&
    validator.isAlphanumeric(val),
  userName: (val) => validator.isLength(val, { min: 2, max: 20 }),
  email: (val) => !val || validator.isEmail(val),
  password: (val) =>
    validator.isLength(val, { min: 8, max: 26 }) &&
    validator.matches(val, specialRegExp),
  tel: (val) => new RegExp(pattern.tel).test(val),
};

const pattern = {
  userId: "^[a-z|A-Z|0-9]{4,20}$",
  userName: "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$",
  password: "^(?=.*?[!@#$%^&*()])[a-z|A-Z|0-9|!@#$%^&*()]{8,26}$",
  email: "@",
  tel: "^[0-9]{3}-[0-9]{4}-[0-9]{4}$",
};

userSchema.methods.checkValidation = function (key) {
  if (key) {
    return check[key](this[key]);
  }
  for (const key in check) {
    if (key === "password") continue;
    if (!check[key](this[key])) return false;
  }
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
