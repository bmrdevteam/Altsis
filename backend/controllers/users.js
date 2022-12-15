const passport = require("passport");
const _ = require("lodash");
const {
  User,
  Academy,
  Registration,
  School,
  Notification,
} = require("../models");
const { getPayload } = require("../utils/payload");

// ____________ common ____________

module.exports.loginLocal = async (req, res) => {
  passport.authenticate("local2", (authError, user, academyId) => {
    try {
      if (authError) throw authError;
      console.log("DEBUG: authentication is over");
      return req.login({ user, academyId }, (loginError) => {
        if (loginError) throw loginError;
        console.log("DEBUG: login is over");
        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === "true") {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        console.log("DEBUG: sending response");
        return res.status(200).send(user);
      });
    } catch (err) {
      return res.status(err.status || 500).send({ message: err.message });
    }
  })(req, res);
};

module.exports.loginGoogle = async (req, res) => {
  passport.authenticate("google2", (authErr, user, academyId) => {
    try {
      if (authErr) throw authErr;
      return req.login({ user, academyId }, (loginError) => {
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
    const _User = User(req.user.academyId);

    /* check duplication */
    const exUser = await _User.findOne({ userId: req.body.userId });
    if (exUser)
      return res.status(409).send({
        message: `userId '${req.body.userId}' is already in use`,
      });

    /* create document */
    const user = new _User({
      ...req.body,
      academyId: req.user.academyId,
      academyName: req.user.academyName,
    });

    /* check validation */
    if (!user.checkValidation() || !user.checkValidation("password"))
      return res.status(400).send({ message: "validation failed" });

    /* save document */
    await user.save();
    user.password = req.user.auth === "admin" ? user.password : undefined;
    return res.status(200).send(user);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.createBulk = async (req, res) => {
  try {
    const _User = User(req.user.academyId);
    const users = [];

    /* check userId duplication */
    const exUsers = await _User.find({});
    const duplicatedUserIds = _([...exUsers, ...req.body.users])
      .groupBy((x) => x.userId)
      .pickBy((x) => x.length > 1)
      .keys()
      .value();

    if (!_.isEmpty(duplicatedUserIds)) {
      return res
        .status(409)
        .send({ message: `userId '${duplicatedUserIds}' are already in use` });
    }

    for (let _user of req.body.users) {
      /* create document */
      const user = new _User(_user);
      console.log(user);
      /* validate */
      if (!user.checkValidation())
        return res.status(400).send({ message: "validation failed", user });

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

    // // school의 activatedSeason
    // const schools = await Promise.all(
    //   user.schools.map((school) =>
    //     School(user.academyId)
    //       .findOne({ schoolId: school.schoolId })
    //       .select(["schoolId", "schoolName", "activatedSeason"])
    //   )
    // );

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
      ]);

    // notifications
    const notifications = await Notification(user.academyId).find({
      userId: user.userId,
      checked: false,
    });

    return res
      .status(200)
      .send({ ...user.toObject(), registrations, notifications });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
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

    if (queries["fields"]) {
      fields = queries["fields"].split(",");
      delete queries["fields"];
      users = await User(req.user.academyId).find(queries).select(fields);
    } else {
      users = await User(req.user.academyId).find(queries);
    }

    return res.status(200).send({ users });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// ____________ update ____________

module.exports.updateAuth = async (req, res) => {
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
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateSchools = async (req, res) => {
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
    const exUser = await User(req.user.academyId)
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

module.exports.updatePassword = async (req, res) => {
  try {
    let user = undefined;

    if (req.user._id == req.params._id) {
      user = req.user;
    } else if (["admin", "manager", "owner"].includes(req.user.auth)) {
      user = await User(req.user.academyId).findById(req.params._id);
    } else {
      return res.status(401).send({ message: "You are not authorized." });
    }

    user.password = req.body.new;
    if (!user.checkValidation("password"))
      return res.status(400).send({ message: "validation failed" });

    await user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.update = async (req, res) => {
  try {
    let user = undefined;

    if (req.user._id === req.params._id) {
      user = req.user;
    } else if (["admin", "manager", "owner"].includes(req.user.auth)) {
      user = await User(req.user.academyId).findById(req.params._id);
    } else {
      return res.status(401).send({ message: "You are not authorized." });
    }

    if (req.body.auth && req.user.auth === "owner") {
      user.auth = req.body.auth;
    }
    user.email = req.body.email;
    user.tel = req.body.tel;

    if (!user.checkValidation())
      return res.status(400).send({ message: "validation failed" });

    await user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

// ____________ delete ____________

module.exports.delete = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findById(req.params._id);
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
