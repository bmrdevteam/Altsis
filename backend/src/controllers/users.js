/**
 * UserAPI namespace
 * @namespace APIs.UserAPI
 * @see TUser in {@link Models.User}
 */
/**
 * @typedef {import('../models/User.js').TUser} TUser
 * @typedef {import('../models/User.js').TUserSchool} TUserSchool
 */
import { logger } from "../log/logger.js";
import passport from "passport";
import _ from "lodash";
import { User, Registration, School } from "../models/index.js";
import { validate } from "../utils/validate.js";
import {
  CONNECTED_ALREADY,
  DISCONNECTED_ALREADY,
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  INVALID_FILE_TYPE,
  LIMIT_FILE_SIZE,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { conn } from "../_database/mongodb/index.js";
import { profileMulter } from "../_s3/profileMulter.js";

/**
 * @memberof APIs.UserAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | USER_NOT_FOUND | if user is not found  |
 */

/**
 * @memberof APIs.UserAPI
 * @function LocalLogin API
 * @description 로컬 로그인 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/users/login/local"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.academyId
 * @param {string} req.body.userId
 * @param {string} req.body.password
 * @param {boolean?} req.body.persist - if true, auto login is set up
 *
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 401    | ACADEMY_NOT_FOUND | if academy is not found  |
 * | 401    | ACADEMY_INACTIVATED | if academy is inactivated  |
 * | 401    | USER_NOT_FOUND | if user is not found  |
 * | 401    | PASSWORD_INCORRECT | if password is incorrect  |
 *
 */
export const loginLocal = async (req, res) => {
  for (let field of ["academyId", "userId", "password"]) {
    if (!(field in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED(field) });
    }
  }
  passport.authenticate("local2", (authError, user, academyId) => {
    try {
      if (authError) {
        return res.status(401).send({ message: authError.message });
      }
      return req.login({ user, academyId }, (loginError) => {
        if (loginError) throw loginError;
        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === true) {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        return res.status(200).send();
      });
    } catch (err) {
      return res.status(500).send({ message: err.message });
    }
  })(req, res);
};

/**
 * @memberof APIs.UserAPI
 * @function LocalGoogle API
 * @description 구글 로그인 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/users/login/google"} req.url
 *
 * @param {Object} req.body
 * @param {string} req.body.academyId
 * @param {string} req.body.credential
 * @param {boolean?} req.body.persist - if true, auto login is set up
 *
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 401    | ACADEMY_NOT_FOUND | if academy is not found  |
 * | 401    | ACADEMY_INACTIVATED | if academy is inactivated  |
 * | 401    | USER_NOT_FOUND | if user is not found  |
 * | 401    | PASSWORD_INCORRECT | if password is incorrect  |
 *
 */
export const loginGoogle = async (req, res) => {
  for (let field of ["academyId", "credential"]) {
    if (!(field in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED(field) });
    }
  }
  passport.authenticate("google2", (authError, user, academyId) => {
    try {
      if (authError) {
        return res.status(401).send({ message: authError.message });
      }
      return req.login({ user, academyId }, (loginError) => {
        if (loginError) throw loginError;
        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === true) {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        return res.status(200).send();
      });
    } catch (err) {
      return res.status(500).send({ message: err.message });
    }
  })(req, res);
};

/**
 * @memberof APIs.UserAPI
 * @function Logout API
 * @description 로그아웃 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {Object} req.user
 *
 * @param {"GET"} req.method
 * @param {"/users/logout"} req.url
 *
 * @param {Object} res
 *
 */
export const logout = async (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send({ message: err.message });

    req.session.destroy();
    res.clearCookie("connect.sid");
    return res.status(200).send();
  });
};

/**
 * @memberof APIs.UserAPI
 * @function CUser API
 * @description 사용자 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/users"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {Object[]} req.body.schools - ex) [{school:"1234sdf"}]
 * @param {"member"|"manager"} req.body.auth
 * @param {string} req.body.userId
 * @param {string} req.body.userName
 * @param {string} req.body.password
 * @param {string?} req.body.tel
 * @param {string?} req.body.email
 * @param {Object?} req.body.snsId
 * @param {string?} req.body.snsId.google
 *
 * @param {Object} res
 * @param {TUser} res.user - created user
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | USERID_IN_USE | if userId is in use  |
 * | 409    | SNSID.GOOGLE_IN_USE | if snsId.google is in use  |
 *
 * @see {@link Models.User} for validation
 */
export const create = async (req, res) => {
  try {
    /* validate */
    if (!("schools" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("schools") });
    }
    if (_.find(req.body.schools, (_school) => !("school" in _school))) {
      return res.status(400).send({ message: FIELD_INVALID("schools") });
    }
    if (!("auth" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("auth") });
    }
    if (req.body.auth !== "member" && req.body.auth !== "manager") {
      return res.status(400).send({ message: FIELD_INVALID("auth") });
    }
    for (let field of ["userId", "userName", "password"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
      if (!validate(field, req.body[field])) {
        return res.status(400).send({ message: FIELD_INVALID(field) });
      }
    }
    for (let field of ["tel", "email"]) {
      if (field in req.body && !validate(field, req.body[field])) {
        return res.status(400).send({ message: FIELD_INVALID(field) });
      }
    }
    if (
      "snsId" in req.body &&
      "google" in req.body.snsId &&
      !validate("email", req.body.snsId.google)
    ) {
      return res.status(400).send({ message: FIELD_INVALID("snsId") });
    }

    const admin = req.user;

    /* check duplication */
    if (
      await User(admin.academyId).findOne({
        userId: req.body.userId,
      })
    ) {
      return res.status(409).send({
        message: FIELD_IN_USE("userId"),
      });
    }

    if (
      "snsId" in req.body &&
      "google" in req.body.snsId &&
      (await User(admin.academyId).findOne({
        "snsId.google": req.body.snsId.google,
      }))
    ) {
      return res.status(409).send({ message: FIELD_IN_USE("snsId.google") });
    }

    /* find schools */
    const schools = [];
    for (let _school of req.body.schools) {
      const schoolData = await School(admin.academyId).findById(_school.school);
      if (!schoolData) {
        return res.status(404).send({ message: __NOT_FOUND("school") });
      }
      schools.push({
        school: schoolData._id,
        schoolId: schoolData.schoolId,
        schoolName: schoolData.schoolName,
      });
    }

    /* create user */
    const user = await User(admin.academyId).create({
      schools,
      auth: req.body.auth,
      userId: req.body.userId,
      userName: req.body.userName,
      password: req.body.password,
      tel: req.body.tel,
      email: req.body.email,
      snsId: req.body.snsId ?? {},
      academyId: admin.academyId,
      academyName: admin.academyName,
    });

    return res.status(200).send({ user });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function RUsersAPI API
 * @description 사용자 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.sid - school ObjectId
 * @param {string?} req.query.academyId - if user is owner
 *
 * @param {Object} req.user - "owner"|"admin"|"manager"
 *
 * @param {Object} res
 * @param {TUser[]} res.users
 *
 * @throws {}
 */
export const findUsers = async (req, res) => {
  try {
    let academyId = req.user.academyId;

    /* if owner || admin requested */
    if ("academyId" in req.query) {
      if (req.user.auth !== "owner" && req.user.auth !== "admin") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      if (!conn[req.query.academyId]) {
        return res.status(404).send({ message: __NOT_FOUND("academy") });
      }
      academyId = req.query.academyId;
    }

    /* find users by school objectId */
    if ("sid" in req.query) {
      const users = await User(academyId)
        .find({ "schools.school": req.query.sid })
        .lean();
      return res.status(200).send({ users });
    }
    /* find all users */
    const users = await User(academyId).find({}).lean();
    return res.status(200).send({ users });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function RMySelf API
 * @description 본인 조회 API; registrations와 함께 반환함
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users/current"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {TUser} res.user
 * @param {Object[]} res.registrations
 *
 */
export const current = async (req, res) => {
  try {
    const user = req.user;

    // registrations
    const registrations = await Registration(user.academyId)
      .find({ user: user._id, isActivated: true })
      .lean();

    return res.status(200).send({
      user: user.toObject(),
      registrations,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function RUserAPI API
 * @description 사용자 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users/:_id"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.academyId - if user is owner
 *
 * @param {Object} req.user - "owner"|"admin"|"manager"
 *
 * @param {Object} res
 * @param {TUser} res.user
 *
 */
export const findUser = async (req, res) => {
  try {
    let academyId = req.user.academyId;

    /* if owner requested */
    if ("academyId" in req.query) {
      if (req.user.auth !== "owner" && req.user.auth !== "admin") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      if (!conn[req.query.academyId]) {
        return res.status(404).send({ message: __NOT_FOUND("academy") });
      }
      academyId = req.query.academyId;
    }

    const user = await User(academyId).findById(req.params._id);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND(user) });
    }
    return res.status(200).send({ user });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function RUserProfile API
 * @description 사용자 프로필사진 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {string} res.profile
 *
 */
export const findProfile = async (req, res) => {
  try {
    const user = await User(req.user.academyId)
      .findById(req.params._id)
      .select("profile");

    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }
    return res.status(200).send({ profile: user.profile });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function UUserProfile API
 * @description 프로필 사진 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/profile"} req.url
 *
 * @param {Object} req.user
 *
 * @param {formData} req.body
 *
 * @param {Object} res
 * @param {string} res.profile
 *
 */
export const updateProfile = async (req, res) => {
  profileMulter.single("img")(req, {}, async (err) => {
    try {
      if (err) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            return res.status(409).send({ message: LIMIT_FILE_SIZE });
          case "INVALID_FILE_TYPE":
            return res.status(409).send({ message: INVALID_FILE_TYPE });
          default:
            return res.status(500).send({ message: err.code });
        }
      }
      const user = req.user;

      // 프로필은 AWS Lambda로 자동으로 사이즈가 축소되어 /thumb/ 폴더에 저장된다
      user.profile = req.file.location.replace("/original/", "/thumb/");
      await user.save();

      return res.status(200).send({ profile: user.profile });
    } catch (err) {
      return res.status(500).send({ message: err.message });
    }
  });
};

/**
 * @memberof APIs.UserAPI
 * @function UUserCalendar API
 * @description 캘린더 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/calendar"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} req.body
 * @param {string?} req.body.calendar
 *
 * @param {Object} res
 * @param {string} res.calendar - updated calendar
 *
 */
export const updateCalendar = async (req, res) => {
  try {
    const user = req.user;
    user.calendar = req.body.calendar;
    await user.save();
    return res.status(200).send({ calendar: user.calendar });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function UUserPassword API
 * @description 비밀번호 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/password"} req.url
 *
 * @param {Object} req.user - "admin"|"user"
 *
 * @param {Object} req.body
 * @param {string} req.body.password
 *
 * @param {Object} res
 *
 */
export const updatePassword = async (req, res) => {
  try {
    if (!("password" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("password") });
    }
    if (!validate("password", req.body.password)) {
      return res.status(400).send({ message: FIELD_INVALID("password") });
    }

    if (req.user._id.toString() !== req.params._id) {
      if (req.user.auth !== "admin") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    const user = await User(req.user.academyId).findById(req.params._id);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }

    user.password = req.body.password;
    await user.save();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function UUserEmail API
 * @description 이메일 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/email"} req.url
 *
 * @param {Object} req.user - "admin"|"user"
 *
 * @param {Object} req.body
 * @param {string?} req.body.email
 *
 * @param {Object} res
 * @param {string} res.email - updated email
 *
 */
export const updateEmail = async (req, res) => {
  if ("email" in req.body && !validate("email", req.body.email)) {
    return res.status(400).send({ message: FIELD_INVALID("email") });
  }

  if (req.user._id.toString() !== req.params._id) {
    if (req.user.auth !== "admin") {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
  }

  const user = await User(req.user.academyId).findById(req.params._id);
  if (!user) {
    return res.status(404).send({ message: __NOT_FOUND("user") });
  }

  user.email = req.body.email;
  await user.save();

  return res.status(200).send({ email: user.email });
};

/**
 * @memberof APIs.UserAPI
 * @function UUserTel API
 * @description 전화번호 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/tel"} req.url
 *
 * @param {Object} req.user - "admin"|"user"
 *
 * @param {Object} req.body
 * @param {string?} req.body.tel
 *
 * @param {Object} res
 * @param {string} res.tel - updated tel
 *
 */
export const updateTel = async (req, res) => {
  if ("tel" in req.body && !validate("tel", req.body.tel)) {
    return res.status(400).send({ message: FIELD_INVALID("tel") });
  }

  if (req.user._id.toString() !== req.params._id) {
    if (req.user.auth !== "admin") {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
  }

  const user = await User(req.user.academyId).findById(req.params._id);
  if (!user) {
    return res.status(404).send({ message: __NOT_FOUND("user") });
  }

  user.tel = req.body.tel;
  await user.save();

  return res.status(200).send({ tel: user.tel });
};

/**
 * @memberof APIs.UserAPI
 * @function UUserAuth API
 * @description 등급 변경 API; admin이 사용자 등급을 manager 또는 member로 수정할 수 있다.
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/auth"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {"manager"|"member"} req.body.auth
 *
 * @param {Object} res
 * @param {"manager"|"member"} res.auth - updated auth
 *
 */
export const updateAuth = async (req, res) => {
  if (!("auth" in req.body)) {
    return res.status(400).send({ message: FIELD_REQUIRED("auth") });
  }
  if (req.body.auth !== "manager" && req.body.auth !== "member") {
    return res.status(400).send({ message: FIELD_INVALID("auth") });
  }

  const admin = req.user;
  if (admin._id.equals(req.params._id)) {
    return res.status(403).send({ message: PERMISSION_DENIED });
  }

  const user = await User(admin.academyId).findById(req.params._id);
  if (!user) {
    return res.status(404).send({ message: __NOT_FOUND("user") });
  }

  user.auth = req.body.auth;
  await user.save();

  return res.status(200).send({ auth: user.auth });
};

/**
 * @memberof APIs.UserAPI
 * @function CGoogleAuth API
 * @description 구글 로그인 활성화 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/google"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {string} req.body.email
 *
 * @param {Object} res
 * @param {Object} res.snsId
 * @param {string} res.snsId.google - updated snsId.google
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 400    | EMAIL_INVALID | if email is invalid  |
 * | 409    | EMAIL_CONNECTED_ALREADY | if email is already connected  |
 * | 409    | EMAIL_IN_USE | if email is in use  |
 *
 */
export const connectGoogleAuth = async (req, res) => {
  try {
    /* validate */
    if (!("email" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("email") });
    }
    if (!validate("email", req.body.email)) {
      return res.status(400).send({ message: FIELD_INVALID("email") });
    }

    const admin = req.user;

    /* find user */
    const user = await User(admin.academyId).findById(req.params._id);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }
    if (user.snsId && "google" in user.snsId) {
      return res.status(409).send({ message: CONNECTED_ALREADY("email") });
    }

    /* check if snsId.google is duplicated */
    const exUser = await User(admin.academyId).findOne({
      "snsId.google": req.body.email,
    });
    if (exUser) {
      return res.status(409).send({
        message: FIELD_IN_USE("email"),
      });
    }

    /* update user.snsId.google */
    user.snsId = {
      ...(user.snsId ?? {}),
      google: req.body.email,
    };
    await user.save();

    return res.status(200).send({ snsId: user.snsId });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function DGoogleAuth API
 * @description 구글 로그인 비활성화 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/users/:_id/google"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} res
 * @param {Object} res.snsId
 * @param {undefined} res.snsId.google - updated snsId.google
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | EMAIL_DISCONNECTED_ALREADY | if email is already connected  |
 *
 */
export const disconnectGoogleAuth = async (req, res) => {
  const admin = req.user;

  /* find user */
  const user = await User(admin.academyId).findById(req.params._id);
  if (!user) {
    return res.status(404).send({ message: __NOT_FOUND("user") });
  }
  if (!user.snsId || !("google" in user.snsId)) {
    return res.status(409).send({ message: DISCONNECTED_ALREADY("email") });
  }

  user.snsId = {
    ...(user.snsId ?? {}),
    google: undefined,
  };
  await user.save();

  return res.status(200).send({ snsId: user.snsId });
};

/**
 * @memberof APIs.UserAPI
 * @function CUserSchool API
 * @description 소속 학교 추가 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/users/:_id/schools"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {string} req.body.sid - ObjectId of school
 *
 * @param {Object} res
 * @param {Object} res.body
 * @param {TUserSchool[]} res.body.schools
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | SCHOOL_CONNECTED_ALREADY | if user already registered to school  |
 *
 */
export const registerSchool = async (req, res) => {
  try {
    if (!("sid" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("sid") });
    }

    const admin = req.user;

    const newSchool = await School(admin.academyId).findById(req.body.sid);
    if (!newSchool) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const user = await User(admin.academyId).findById(req.params._id);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }
    if (
      _.find(user.schools, (_school) => _school.school.equals(newSchool._id))
    ) {
      return res.status(409).send({ message: CONNECTED_ALREADY("school") });
    }

    user.schools = [
      ...user.schools,
      {
        school: newSchool._id,
        schoolId: newSchool.schoolId,
        schoolName: newSchool.schoolName,
      },
    ];
    user.markModified("schools");

    await user.save();

    return res.status(200).send({ schools: user.schools });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function DUserSchool API
 * @description 소속 학교 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/users/:_id/schools"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.sid - ObjectId of school
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} res
 * @param {Object} res.body
 * @param {TUserSchool[]} res.body.schools
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | SCHOOL_DISCONNECTED_ALREADY | if user already deregistered to school  |
 *
 */
export const deregisterSchool = async (req, res) => {
  try {
    if (!("sid" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("sid") });
    }

    const admin = req.user;

    const user = await User(admin.academyId).findById(req.params._id);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }

    const idx = _.findIndex(
      user.schools,
      (_school) => _school.school.toString() === req.query.sid
    );

    if (idx === -1) {
      return res.status(409).send({ message: DISCONNECTED_ALREADY("school") });
    }

    user.schools.splice(idx, 1);
    user.markModified("schools");

    await user.save();

    return res.status(200).send({ schools: user.schools });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.UserAPI
 * @function DUser API
 * @description 사용자 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/users/:_id"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} res - returns nothing
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | SCHOOL_DISCONNECTED_ALREADY | if user already deregistered to school  |
 *
 */
export const remove = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findById(req.params._id);
    if (!user) {
      return res.status(404).send({ message: __NOT_FOUND("user") });
    }
    await user.remove();
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
