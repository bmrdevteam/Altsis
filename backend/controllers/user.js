const { OAuth2Client } = require("google-auth-library");
const passport = require("passport");
const _ = require("lodash");

const config = require("../config/config");
const { User, SchoolUser, School, Academy } = require("../models/models");

exports.loginLocal = async (req, res) => {
  /* authenticate */
  passport.authenticate("local2", (err, user, dbName) => {
    try {
      if (err) throw err;

      /* login */
      return req.login({ user, dbName }, (loginError) => {
        if (loginError) throw loginError;

        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === "true") {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        return res.status(200).send({
          user,
        });
      });
    } catch (err) {
      return res.status(err.status || 500).send({ err: err.message });
    }
  })(req, res);
};

exports.loginGoogle = async (req, res) => {
  /* authenticate */
  passport.authenticate("google2", (err, user, dbName) => {
    try {
      if (err) throw err;

      /* login */
      return req.login({ user, dbName }, (loginError) => {
        if (loginError) throw loginError;

        /* set maxAge as 1 year if auto login is requested */
        if (req.body.persist === "true") {
          req.session.cookie["maxAge"] = 365 * 24 * 60 * 60 * 1000; //1 year
        }
        return res.status(200).send({
          user,
        });
      });
    } catch (err) {
      return res.status(err.status || 500).send({ err: err.message });
    }
  })(req, res);
};

exports.connectGoogle = async (req, res) => {
  try {
    const user = req.user;

    /* set snsId using credential */
    const client = new OAuth2Client(config.clientID);
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: config.clientID,
    });
    const payload = ticket.getPayload();
    const snsId = {
      "snsId.provider": "google",
      "snsId.email": payload.email,
    };

    /* check email duplication */
    const exUser = await User(user.dbName).findOne(snsId);
    if (exUser)
      return res.status(409).send({
        message: `email '${payload.email}'is already in use`,
      });

    /* check google duplication */
    if (!user.snsId.some((snsId) => snsId.provider === "google")) {
      snsId;
    } else {
      return res.status(409).send({
        message: "google email is already connected",
      });
    }

    /* save document */
    user.snsId.push({ snsId });
    await user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.disconnectGoogle = async (req, res) => {
  try {
    const user = req.user;

    /* find google snsId idx */
    const idx = user.snsId.findIndex((snsId) => snsId.provider === "google");
    if (idx == -1) {
      return res.status(404).send({
        message: "google email not found",
      });
    }

    /* delete google snsId */
    user.snsId.splice(idx, 1);

    /* save document */
    await user.save();
    return res.status(200).send();
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.logout = (req, res) => {
  /* logout */
  req.logout((err) => {
    if (err) return res.status(500).send({ err });
    req.session.destroy();
    res.clearCookie("connect.sid");
    return res.status(200).send();
  });
};

exports.createOwner = async (req, res) => {
  try {
    const _User = User("root");

    /* check duplication */
    const exUser = await _User.findOne({ userId: req.body.userId });
    if (exUser)
      return res.status(409).send({
        message: `userId '${req.body.userId}' is already in use`,
      });

    /* create document */
    const user = new _User(req.body);
    user.auth = "owner";
    // generate password
    const password = _User.generatePassword();
    user.password = password;

    /* save document */
    await user.save();

    user.password = password;
    return res.status(200).send({
      user,
    });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.createMembers = async (req, res) => {
  try {
    const _User = User(req.user.dbName);
    const _SchoolUser = SchoolUser(req.user.dbName);

    /* get userId list */
    const exUserIds = (await _User.find({})).map((user) => user.userId);

    for (let _user of req.body.users) {
      /* check userId duplication */
      if (exUserIds.includes(_user.userId)) {
        return res
          .status(409)
          .send({ message: `userId '${_user.userId}' is already in use` });
      }

      /* check validation */
      if (!_User.checkValidation(_user)) {
        return res.status(400).send({ message: "validation failed" });
      }
    }

    /* create user & schoolUser document */
    const users = [];
    const schoolUsers = [];
    for (const _user of req.body.users) {
      const user = new _User(_user);
      user.academyId = req.user.academyId;
      user.academyName = req.user.academyName;

      /* register school if requested */
      if (_user.schoolId) {
        user["schools"] = [
          {
            schoolId: _user.schoolId,
            schoolName: _user.schoolName,
          },
        ];

        const schoolUser = new _SchoolUser(user);
        schoolUser.schoolId = _user.schoolId;
        schoolUser.schoolName = _user.schoolName;
        schoolUser.role = _user.role;
        schoolUsers.push(schoolUser);
      }

      users.push(user);
    }

    /* save documents */
    await Promise.all([
      users.map((user) => user.save()),
      schoolUsers.map((schoolUser) => schoolUser.save()),
    ]);
    return res.status(200).send({ users, schoolUsers });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.enterMembers = async (req, res) => {
  try {
    const _User = User(req.user.dbName);
    const _School = School(req.user.dbName);
    const _SchoolUser = SchoolUser(req.user.dbName);

    /* find school */
    const school = await _School.findOne({
      schoolId: req.body.schoolId,
    });
    if (!school) {
      return res.status(404).send({ message: "school not found" });
    }

    const users = [];
    const schoolUsers = [];
    for (const _user of req.body.users) {
      /* find user */
      const user = await _User.findOne({
        userId: _user.userId,
      });
      if (!user) {
        return res
          .status(404)
          .send({ message: `user '${_user.userId}' not found` });
      }

      /* check if user is already entered */
      if (
        _.findIndex(user.schools, {
          schoolId: school.schoolId,
        }) !== -1
      ) {
        return res.status(409).send({
          message: `user ${user.userId} is already entered`,
        });
      }

      /* update user document */
      user.schools.push({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      });
      users.push(user);

      /* create schoolUser document */
      const schoolUser = new _SchoolUser({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
        userId: user.userId,
        userName: user.userName,
        role: _user.role,
        info: _user.info,
      });
      schoolUsers.push(schoolUser);
    }

    const [newUsers, newSchoolUsers] = await Promise.all([
      users.map((user) => user.save()),
      schoolUsers.map((schoolUser) => schoolUser.save()),
    ]);

    return res.status(200).send({ schoolUsers: newSchoolUsers });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.appointManager = async (req, res) => {
  try {
    /* find user */
    const user = await User(req.user.dbName).findOne({
      _id: req.params._id,
    });
    if (!user) {
      return res.status(409).send({ message: `user not found` });
    }

    /* check if user is a member */
    if (user.auth != "member") {
      return res.status(401).send({ message: "user is not a member" });
    }

    /* update & save document */
    user.auth = "manager";
    await user.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.cancelManager = async (req, res) => {
  try {
    /* find user */
    const user = await User(req.user.dbName).findOne({
      _id: req.params._id,
    });
    if (!user) {
      return res.status(409).send({ message: `user not found` });
    }

    /* check if user is a manager */
    if (user.auth != "manager") {
      return res.status(401).send({ message: "user is not a manager" });
    }

    /* update & save user document */
    user.auth = "member";
    await user.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.readOwners = async (req, res) => {
  try {
    /* find users */
    const users = await User("root").find({});
    return res.status(200).send({ users });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.readAdmin = async (req, res) => {
  try {
    /* find admin */
    const academy = await Academy.findOne({ academyId: req.query.academyId });
    const user = await User(academy.dbName).findOne({
      userId: academy.adminId,
    });
    return res.status(200).send({ user });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.readMembers = async (req, res) => {
  try {
    /* find members */
    const users = await User(req.user.dbName).find({});
    return res.status(200).send({ users });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.updateMemberField = async (req, res) => {
  try {
    const _User = User(req.user.dbName);

    /* find user */
    const user = await _User.findById(req.params._id);
    if (!user) {
      return res.status(409).send({ message: "user not found" });
    }

    /* check if user is a member */
    if (user.auth != "member") {
      return res.status(401).send({ message: "user is not a member" });
    }

    /* update document & check validation */
    user[req.params.field] = req.body.new;
    if (!_User.checkValidation(user, req.params.field)) {
      return res.status(400).send({ message: "validation failed" });
    }

    /* save document */
    await user.save();
    return res.status(200).send({ user });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.read = async (req, res) => {
  try {
    /* find user and schoolUser */
    const user = req.user;
    const schoolUsers = await Promise.all(
      user.schools.map((school) =>
        SchoolUser(req.user.dbName).findOne({
          userId: user.userId,
          schoolId: school.schoolId,
        })
      )
    );
    res.status(200).send({
      user,
      schoolUsers,
    });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.updateField = async (req, res) => {
  try {
    const user = req.user;

    /* update user document & check validation */
    user[req.params.field] = req.body.new;
    if (!User(req.user.dbName).checkValidation(user, req.params.field)) {
      return res.status(400).send({ message: "validation failed" });
    }
    /* save document */
    await user.save();

    user.password = undefined;
    return res.status(200).send({ user });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.deleteMember = async (req, res) => {
  try {
    /* delete user & schoolUsers */
    const exUser = await User(req.user.dbName).findByIdAndDelete({
      _id: req.params._id,
      auth: "member",
    });

    await SchoolUser(req.user.dbName).deleteMany({
      userId: exUser.userId,
    });
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
