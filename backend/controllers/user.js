const passport = require("passport");
const _ = require("lodash");
const { User, Academy, Registration } = require("../models/models");
const { getPayload } = require("../utils/payload");

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
  try {
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
    if (!user.checkValidation())
      return res.status(400).send({ message: "validation failed" });

    /* save document */
    await user.save();
    user.password = undefined;
    return res.status(200).send(user);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createBulk = async (req, res) => {
  try {
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
    const exUsers = await _User.find({});
    const duplicatedUserIds = _([...exUsers, ...req.body])
      .groupBy((x) => x.userId)
      .pickBy((x) => x.length > 1)
      .keys()
      .value();

    if (!_.isEmpty(duplicatedUserIds)) {
      return res
        .status(409)
        .send({ message: `userId '${duplicatedUserIds}' are already in use` });
    }

    for (let _user of req.body) {
      /* create document */
      const user = new _User(_user);
      /* validate */
      if (!user.checkValidation())
        return res.status(400).send({ message: "validation failed" });

      user.academyId = req.user.academyId;
      user.academyName = req.user.academyName;
      user.auth = "member";
      users.push(user);
    }

    /* save documents */
    await Promise.all([
      users.forEach((user) => {
        user.save();
      }),
    ]);

    return res.status(200).send({ users });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// ____________ find ____________

/* 자기 자신을 읽음 */
module.exports.current = async (req, res) => {
  try {
    const user = req.user;

    const registrations = await Registration(user.dbName)
      .find({ userId: user.userId })
      .select(["season", "year", "term"]);

    user.registrations = registrations;

    return res.status(200).send({ ...user.toObject(), registrations });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    let _User = null;
    if (req.query.academyId || req.query.academyName) {
      // owner만이 타 아카데미의 user 정보 조회 가능
      if (req.user.auth == "owner") {
        let academy = null;
        if (req.query.academyId)
          academy = await Academy.findOne({
            academyId: req.query.academyId,
          });
        else
          academy = await Academy.findOne({
            academyName: req.query.academyName,
          });
        _User = User(academy.dbName);
      } else return res.status(401).send();
    }
    // owner, admin, manager, member => 본인 아카데미의 user 정보 조회 가능
    else {
      _User = User(req.user.dbName);
    }

    const queries = req.query;
    if (queries.schoolId) {
      queries["schools.schoolId"] = queries.schoolId;
      delete queries.schoolId;
    }
    if (queries.schoolName) {
      queries["schools.schoolName"] = queries.schoolName;
      delete queries.schoolName;
    }
    const users = await _User.find(queries);
    return res.status(200).send({ users });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// ____________ update ____________

module.exports.updateAuth = async (req, res) => {
  try {
    const user = await User(req.user.dbName).findById(req.params._id);

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
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSchools = async (req, res) => {
  try {
    const user = await User(req.user.dbName).findById(req.params._id);

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
    return res.status(500).send({ message: err.message });
  }
};

// ____________ update(myself) ____________

module.exports.connectGoogle = async (req, res) => {
  try {
    const { credential } = req.body;

    /* get payload */
    const payload = await getPayload(credential);

    /* check email duplication */
    const exUser = await User(req.user.dbName)
      .findOne({
        "snsId.google": payload.email,
      })
      .select("+snsId");
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
    return res.status(500).send({ message: err.message });
  }
};

module.exports.disconnectGoogle = async (req, res) => {
  delete req.user.snsId.google;
  req.user.markModified("snsId");
  await req.user.save();

  return res.status(200).send();
};

module.exports.updateField = async (req, res) => {
  try {
    if (["password", "email"].indexOf(req.params.field) == -1)
      return res.status(400);

    req.user[req.params.field] = req.body.new;
    if (!req.user.checkValidation(req.params.field))
      return res.status(400).send({ message: "validation failed" });

    await req.user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// ____________ delete ____________

module.exports.delete = async (req, res) => {
  try {
    const user = await User(req.user.dbName).findById(req.params._id);
    if (!user) return res.status(404).send();

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
    return res.status(500).send({ message: err.message });
  }
};
