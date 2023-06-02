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
 * @function ConnectGoogleByAdmin API
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
export const connectGoogleByAdmin = async (req, res) => {
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
 * @function disConnectGoogleByAdmin API
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
export const disconnectGoogleByAdmin = async (req, res) => {
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
 * @function CUserByAdmin API
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
export const createByAdmin = async (req, res) => {
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

/* 자기 자신을 읽음 */
export const current = async (req, res) => {
  try {
    const user = req.user;

    // registrations
    const registrations = await Registration(user.academyId)
      .find({ userId: user.userId })
      .select([
        "school",
        "schoolId",
        "schoolName",
        "season",
        "year",
        "term",
        "isActivated",
        "role",
        "period",
        "memos",
        "permissionSyllabusV2",
        "permissionEnrollmentV2",
        "permissionEvaluationV2",
      ])
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

export const findProfile = async (req, res) => {
  try {
    const user = await User(req.user.academyId)
      .findById(req.params._id)
      .select("profile");
    return res.status(200).send(user);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    // 소속 아카데미의 user 정보 조회 가능
    if (req.params._id) {
      const user = await User(req.user.academyId).findById(req.params._id);
      return res.status(200).send(user);
    }

    const queries = req.query;
    let fields = [];
    let users = [];

    if (queries.school) {
      queries["schools.school"] = queries.school;
      delete queries.school;
    }
    if (queries.schoolId) {
      queries["schools.schoolId"] = queries.schoolId;
      delete queries.schoolId;
    }
    if (queries["no-school"]) {
      queries["schools"] = { $size: 0 };
      delete queries["no-school"];
    }
    if (queries.matches) {
      queries[queries.field] = { $regex: queries.matches };
      delete queries.matches;
      delete queries.field;
    }

    if (queries["fields"]) {
      fields = queries["fields"].split(",");
      delete queries["fields"];
      users = await User(req.user.academyId).find(queries).select(fields);
    } else {
      users = await User(req.user.academyId).find(queries);
    }

    return res.status(200).send({ users });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

// ____________ update ____________

export const updateAuth = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findById(req.params._id);

    switch (req.user.auth) {
      case "owner":
        break;
      case "admin":
        // admin은 member를 manager로 승격시킬 수 있다.
        if (req.body.new == "manager" && user.auth == "member") break;
        // admin은 manager를 member로 만들 수 있다.
        if (req.body.new == "member" && user.auth == "manager") break;
      default:
        return res.status(401).send({ message: "You are not authorized." });
    }
    user.auth = req.body.new;
    await user.save();
    return res.status(200).send(user);
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

// ____________ update(myself) ____________

// 기존 비밀번호가 필요한 버전
// export const updatePassword = async (req, res) => {
//   try {
//     /* validate */
//     if (!validate("password", req.body.new))
//       return res.status(400).send({ message: "validation failed" });

//     const user = req.user;
//     req.body.academyId = req.user.academyId;
//     req.body.userId = req.user.userId;
//     req.body.password = req.body.old;

//     passport.authenticate("local2", async (authError, user, academyId) => {
//       try {
//         if (authError) throw authError;
//         console.log("DEBUG: authentication is over");
//         user.password = req.body.new;
//         await user.save();
//         return res.status(200).send();
//       } catch (err) {
//         return res.status(err.status || 500).send({ message: err.message });
//       }
//     })(req, res);
//   } catch (err) {
//     logger.error(err.message);
// return res.status(500).send({ message: err.message });
//   }
// };

export const updatePassword = async (req, res) => {
  try {
    /* validate */
    if (!validate("password", req.body.new))
      return res.status(400).send({ message: "validation failed" });

    const user = req.user;
    user.password = req.body.new;
    await user.save();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateEmail = async (req, res) => {
  try {
    if (!validate("email", req.body.email))
      return res.status(400).send({ message: "validation failed" });

    const user = req.user;
    user.email = req.body.email;
    await user.save();
    return res.status(200).send({ email: user.email });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateTel = async (req, res) => {
  try {
    if (!validate("tel", req.body.tel))
      return res.status(400).send({ message: "validation failed" });

    const user = req.user;
    user.tel = req.body.tel;
    await user.save();
    return res.status(200).send({ tel: user.tel });
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
 * @function UAuthByAdmin API
 * @description 등급 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
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
export const updateAuthByAdmin = async (req, res) => {
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
 * @function UEmailByAdmin API
 * @description 이메일 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/users/:_id/email"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {string} req.body.email
 *
 * @param {Object} res
 * @param {string} res.email
 *
 * @throws {}
 *
 */
export const updateEmailByAdmin = async (req, res) => {
  if (!("email" in req.body)) {
    return res.status(400).send({ message: FIELD_REQUIRED("email") });
  }
  if (!validate("email", req.body.email)) {
    return res.status(400).send({ message: FIELD_INVALID("email") });
  }

  const admin = req.user;

  const user = await User(admin.academyId).findById(req.params._id);
  if (!user) {
    return res.status(404).send({ message: __NOT_FOUND("user") });
  }

  user.email = req.body.email;
  await user.save();

  return res.status(200).send({ email: user.email });
};

/**
 * @memberof APIs.UserAPI
 * @function UTelByAdmin API
 * @description 전화번호 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/users/:_id/tel"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {tel} req.body.tel
 *
 * @param {Object} res
 * @param {string} res.tel
 *
 * @throws {}
 *
 */
export const updateTelByAdmin = async (req, res) => {
  if (!("tel" in req.body)) {
    return res.status(400).send({ message: FIELD_REQUIRED("tel") });
  }
  if (!validate("tel", req.body.tel)) {
    return res.status(400).send({ message: FIELD_INVALID("tel") });
  }

  const admin = req.user;

  const user = await User(admin.academyId).findById(req.params._id);
  if (!user) {
    return res.status(404).send({ message: __NOT_FOUND("user") });
  }

  user.tel = req.body.tel;
  await user.save();

  return res.status(200).send({ tel: user.tel });
};

/**
 * @memberof APIs.UserAPI
 * @function UPasswordByAdmin API
 * @description 비밀번호 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/users/:_id/password"} req.url
 *
 * @param {Object} req.user
 * @param {"admin"} req.user.auth
 *
 * @param {Object} req.body
 * @param {password} req.body.password
 *
 * @param {Object} res - returns nothing
 *
 * @throws {}
 */
export const updatePasswordByAdmin = async (req, res) => {
  try {
    if (!("password" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("password") });
    }
    if (!validate("password", req.body.password)) {
      return res.status(400).send({ message: FIELD_INVALID("password") });
    }

    const admin = req.user;

    const user = await User(admin.academyId).findById(req.params._id);
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
 * @function CUserSchoolByAdmin API
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
export const createUserSchoolByAdmin = async (req, res) => {
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
 * @function DUserSchoolByAdmin API
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
export const removeUserSchoolByAdmin = async (req, res) => {
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

export const remove = async (req, res) => {
  try {
    if (!req.query._ids) return res.status(400).send();
    const _idList = _.split(req.query._ids, ",");
    const result = await User(req.user.academyId).deleteMany({
      _id: { $in: _idList },
    });
    return res.status(200).send(result);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
