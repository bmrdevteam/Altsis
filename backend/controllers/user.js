const passport = require("passport");
const _ = require("lodash");
const { User, Academy } = require("../models/models");
const { getPayload } = require("../utils/payload");
const { isLower } = require("../middleware/auth");

// ____________ common ____________

module.exports.loginLocal = async (req, res) => {
  passport.authenticate("local2", (authError, user, dbName) => {
    try {
      if (authError) throw authError;
      return req.login({ user, dbName }, (loginError) => {
        if (loginError) throw loginError;

        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === "true") {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        return res.status(200).send(user);
      });
    } catch (err) {
      return res.status(err.status || 500).send({ message: err.message });
    }
  })(req, res);
};

module.exports.loginGoogle = async (req, res) => {
  passport.authenticate("google2", (authErr, user, dbName) => {
    try {
      if (authErr) throw authErr;
      return req.login({ user, dbName }, (loginError) => {
        if (loginError) throw loginError;

        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === "true") {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        return res.status(200).send(user);
      });
    } catch (err) {
      return res.status(err.status || 500).send({ message: err.message });
    }
  })(req, res);
};

module.exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send({ err });
    req.session.destroy();
    res.clearCookie("connect.sid");
    return res.status(200).send();
  });
};

// ____________ create ____________

module.exports.create = async (req, res) => {
  switch (req.user.auth) {
    case "owner":
      if (req.body.auth == "owner" || req.body.auth == "admin") break;
    case "admin":
      if (req.body.auth == "manager" || req.body.auth == "member") break;
      break;
    case "manager":
      if (req.body.auth == "member") break;
    default:
      return res.status(401).send({ message: "You are not authorized." });
  }

  const _User = User(req.user.dbName);

  /* check duplication */
  const exUser = await _User.findOne({ userId: req.body.userId });
  if (exUser)
    return res.status(409).send({
      message: `userId '${req.body.userId}' is already in use`,
    });

  /* create document */
  const user = new _User(req.body);
  user.academyId = req.user.academyId;
  user.academyName = req.user.academyName;

  /* check validation */
  if (!user.checkValidation()) {
    return res.status(400).send({ message: "validation failed" });
  }

  /* save document */
  await user.save();
  user.password = undefined;
  return res.status(200).send(user);
};

module.exports.createBulk = async (req, res) => {
  switch (req.user.auth) {
    case "admin":
      break;
    case "manager":
      break;
    default:
      return res.status(401).send({ message: "You are not authorized." });
  }

  const _User = User(req.user.dbName);
  const users = [];

  /* check userId duplication */
  const mergedUserIds = _.merge(
    (await _User.find({})).map((_user) => _user.userId), //exUserIds
    req.body.map((_user) => _user.userId) //newUserIds
  );
  const duplicatedUserIds = [];
  const counter = _.countBy(mergedUserIds);
  for (const userId in counter) {
    if (counter[userId] != 1) {
      duplicatedUserIds.push(userId);
    }
  }

  if (!_.isEmpty(duplicatedUserIds)) {
    return res
      .status(409)
      .send({ message: `userId '${duplicatedUserIds}' is already in use` });
  }

  for (let _user of req.body) {
    /* create document */
    const user = new _User(_user);
    /* validate */
    if (!user.checkValidation()) {
      return res.status(400).send({ message: "validation failed" });
    }

    user.academyId = req.user.academyId;
    user.academyName = req.user.academyName;
    user.auth = "member";
    users.push(user);
  }

  /* save documents */
  await Promise.all([users.map((user) => user.save())]);
  return res.status(200).send(users);
};

// ____________ find ____________

module.exports.find = async (req, res) => {
  try {
    /* query가 없으면 자기 자신을 읽음 */
    console.log("debug: req.query is ", req.query);
    if (_.isEmpty(req.query)) {
      /* include registrations */
      const registrations = [
        { year: "2022년", term: "1쿼터" },
        { year: "2022년", term: "2쿼터" },
      ];

      /*
      const registrations=await Promise.all(
        user.schools.map((school) =>
        Registration(user.dbName).findOne({
            userId: user.userId,
            schoolId: school.schoolId,
          })
        )
      );
      */

      return res
        .status(200)
        .send(_.merge(req.user.toObject(), { registrations }));
    }

    /* owner만 다른 아카데미 유저 정보 조회 가능 */

    let _User = null;
    if (req.user.academyId == req.query.academyId) {
      _User = User(req.user.dbName);
    } else if (req.user.auth == "owner") {
      const academy = await Academy.findOne({ academyId: req.query.academyId });
      _User = User(academy.dbName);
    } else {
      return res.status(401).send({ message: "You are not authorized." });
    }

    /* find by userId or userName */
    if (req.query.userId) {
      const user = await _User.findOne({ userId: req.query.userId });
      return res.status(200).send(user);
    }
    if (req.query.userName) {
      const user = await _User.findOne({ userName: req.query.userName });
      return res.status(200).send(user);
    }

    /* find by auth, schoolId, schoolName */
    let users = null;
    if (req.query.auth) {
      /* auth가 낮은 유저는 조회 권한이 없음 */
      if (isLower(req.user.auth, req.query.auth)) {
        return res.status(401).send({ message: "You are not authorized." });
      }
      users = await _User.find({ auth: req.query.auth });
    } else if (req.query.schoolId) {
      users = await _User.find({ "schools.schoolId": req.query.schoolId });
    } else if (req.query.schoolName) {
      users = await _User.find({
        "schools.schoolName": req.query.schoolName,
      });
    } else {
      users = await _User.find();
    }
    return res.status(200).send(users);
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

// ____________ update(myself) ____________

module.exports.updatePassword = async (req, res) => {
  try {
    req.user.password = req.body.new;
    if (!req.user.checkValidation("password")) {
      return res.status(400).send({ message: "validation failed" });
    }
    await req.user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateEmail = async (req, res) => {
  try {
    req.user.email = req.body.new;
    if (!req.user.checkValidation("email")) {
      return res.status(400).send({ message: "validation failed" });
    }
    await req.user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.connectGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    /* get payload */
    const payload = await getPayload(credential);

    /* check email duplication */
    const exUser = await User(req.user.dbName).findOne({
      "snsId.google": payload.email,
    });
    if (exUser)
      return res.status(409).send({
        message: `email '${payload.email}'is already in use`,
      });

    /* update document */
    req.user["snsId.google"] = payload.email;
    req.user.markModified(field);
    await req.user.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.disconnectGoogle = async (req, res) => {
  delete req.user.snsId.google;
  req.user.markModified("snsId");
  await req.user.save();

  return res.status(200).send();
};

// ____________ update ____________

module.exports.updateAuth = async (req, res) => {
  try {
    const _User = User(req.user.dbName);
    const user = await _User.findById(req.params._id);

    switch (req.user.auth) {
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
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateSchools = async (req, res) => {
  try {
    const _User = User(req.user.dbName);
    const user = await _User.findById(req.params._id);

    switch (req.user.auth) {
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
    return res.status(err.status || 500).send({ message: err.message });
  }
};

// ____________ delete ____________

module.exports.delete = async (req, res) => {
  try {
    const _User = User(req.user.dbName);
    const user = await _User.findById(req.params._id);
    if (!user) {
      return res.status(404).send();
    }

    switch (req.user.auth) {
      case "admin":
        if (user.auth == "member") break;
      case "manager":
        if (user.auth == "member") break;
      default:
        return res.status(401).send({ message: "You are not authorized." });
    }

    /* delete document */
    user.remove();
    return res.status(200).send();
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};
