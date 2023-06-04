/**
 * UserAPI namespace
 * @namespace APIs.UserAPI
 */
import { logger } from "../log/logger.js";
import passport from "passport";
import _ from "lodash";
import { User, Registration, School } from "../models/index.js";
import { getPayload } from "../utils/payload.js";
import { validate } from "../utils/validate.js";
import {
  CONNECTED_ALREADY,
  DISCONNECTED_ALREADY,
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { conn } from "../_database/mongodb/index.js";

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
 * @param {Object} res - returns nothing
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
 * @param {Object} res - returns nothing
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
  for (let field of ["academyId", "crential"]) {
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
 * @param {"GET"} req.method
 * @param {"/users/logout"} req.url
 *
 * @param {Object} res - returns nothing
 *
 * @throws {}
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
 * @function CGoogleAuth API
 * @description 구글 로그인 활성화 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/google"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {string} req.body.email
 *
 * @param {Object} res
 * @param {Object} res.snsId
 * @param {string} res.snsId.google
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
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} res
 * @param {Object} res.snsId
 * @param {string} res.snsId.google
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
 * @function CUser API
 * @description 사용자 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/users"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {Object} req.body.user
 * @param {Object} req.body.schools
 * @param {string} req.body.schools[0].school - objectId of school
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
 * @param {Object} res.user
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | USERID_IN_USE | if userId is in use  |
 * | 409    | SNSID.GOOGLE_IN_USE | if snsId.google is in use  |
 *
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

// ____________ find ____________

/**
 * @memberof APIs.UserAPI
 * @function RMySelf API
 * @description 본인 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users/current"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @returns {Object} res
 * @returns {Object} res.user
 * @returns {Object[]} res.registrations
 *
 * @throws {}
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
 * @function RUserProfile API
 * @description 사용자 프로필사진 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users/:_id"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @returns {Object} res
 * @returns {string} res.profile
 *
 * @throws {}
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
 * @function RUsersAPI API
 * @description 사용자 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users"} req.url
 *
 * @param {Object} req.user
 * @param {"owner"|"admin"|"manager"} req.user.auth
 *
 * @param {Object} req.query
 * @param {string?} req.query.sid - school objectId
 * @param {string?} req.query.academyId - required by owner
 *
 * @param {Object} res
 * @param {Object[]} res.users
 *
 * @throws {}
 */
export const findUsers = async (req, res) => {
  try {
    let academyId = req.user.academyId;

    /* if owner requested */
    if ("academyId" in req.query) {
      if (req.user.auth !== "owner") {
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
 * @function RUserAPI API
 * @description 사용자 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/users/:_id"} req.url
 *
 * @param {Object} req.user
 * @param {"owner"|"admin"|"manager"} req.user.auth
 *
 * @param {Object} req.params
 * @param {string} req.params._id - user objectId
 *
 * @param {Object} req.query
 * @param {string?} req.query.academyId - required by owner
 *
 * @param {Object} res
 * @param {Object} res.user
 *
 * @throws {}
 */
export const findUser = async (req, res) => {
  try {
    let academyId = req.user.academyId;

    /* if owner requested */
    if ("academyId" in req.query) {
      if (req.user.auth !== "owner") {
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

export const updateSchools = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findById(req.params._id);

    switch (req.user.auth) {
      case "owner":
        break;
      case "admin":
        // admin은 member 또는 manager의 school 정보를 수정할 수 있다.
        if (user.auth == "member" || user.auth == "manager") break;
      case "manager":
        // manager는 member의 school 정보를 수정할 수 있다.
        if (user.auth == "member") break;
      default:
        return res.status(401).send({ message: "You are not authorized." });
    }
    user.schools = req.body.new;
    await user.save();
    return res.status(200).send(user);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateSchoolsBulk = async (req, res) => {
  try {
    const users = await User(req.user.academyId).find({
      _id: { $in: req.body.userIds },
    });

    if (req.body.type === "add") {
      for (let i = 0; i < users.length; i++) {
        users[i].schools = _.uniqBy(
          [...users[i].schools, ...req.body.schools],
          "schoolId"
        );
      }
    } else if (req.body.type === "remove") {
      const schoolIds = req.body.schools.map((school) => school.schoolId);
      for (let i = 0; i < users.length; i++) {
        users[i].schools = _.filter(
          users[i].schools,
          (val) => !_.includes(schoolIds, val.schoolId)
        );
      }
    } else return res.status(400).send({});

    /* save documents */
    await Promise.all([
      users.forEach((user) => {
        user.save();
      }),
    ]);

    return res.status(200).send({ users });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

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
 * @function UUserAuth API
 * @description 등급 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/auth"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {"manager"|"member"} req.body.auth
 *
 * @param {Object} res
 * @param {"manager"|"member"} res.auth
 *
 * @throws {}
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
 * @function UUserEmail API
 * @description 이메일 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/email"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} req.body
 * @param {string?} req.body.email
 *
 * @param {Object} res
 * @param {string} res.email
 *
 * @throws {}
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
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {string?} req.body.tel
 *
 * @param {Object} res
 * @param {string} res.tel
 *
 * @throws {}
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
 * @function UUserPassword API
 * @description 비밀번호 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/password"} req.url
 *
 * @param {Object} req.user - logged in user
 *
 * @param {Object} req.body
 * @param {password} req.body.password
 *
 * @param {Object} res - returns nothing
 *
 * @throws {}
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
 * @function CUserSchool API
 * @description 소속 학교 추가 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/users/:_id/schools"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {ObjectId} req.body.sid - school._id
 *
 * @param {Object} res
 * @param {Object} res.body
 * @param {Object[]} res.body.schools
 * @param {ObjectId} res.body.schools[0].school
 * @param {string} res.body.schools[0].schoolId
 * @param {string} res.body.schools[0].schoolName
 *
 * @throws {}
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
 * @param {string} req.query.sid
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} res
 * @param {Object} res.body
 * @param {Object[]} res.body.schools
 * @param {ObjectId} res.body.schools[0].school
 * @param {string} res.body.schools[0].schoolId
 * @param {string} res.body.schools[0].schoolName
 *
 * @throws {}
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

// ____________ delete ____________

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
