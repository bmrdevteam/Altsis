const User = require("../models/User");
const SchoolUser = require("../models/SchoolUser");
const School = require("../models/School");
const { OAuth2Client } = require("google-auth-library");
const clientID = require("../config/config")["GOOGLE-ID"];
const saltRounds = require("../config/config")["saltRounds"];
const bcrypt = require("bcrypt");
const _ = require("lodash");
const Academy = require("../models/Academy");
const passport = require("passport");

const generateHash = async (password) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (err) {
    throw err;
  }
};

exports.loginLocal = async (req, res) => {
  passport.authenticate("local2", (err, user, dbName) => {
    try {
      if (err) throw err;

      return req.login({ user, dbName }, (loginError) => {
        if (loginError) throw loginError;
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
  passport.authenticate("google2", (err, user, dbName) => {
    try {
      if (err) throw err;

      return req.login({ user, dbName }, (loginError) => {
        if (loginError) throw loginError;
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
    const client = new OAuth2Client(clientID);

    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: clientID,
    });

    const payload = ticket.getPayload();

    const user = await User(req.user.dbName).findOne({
      "snsId.provider": "google",
      "snsId.email": payload["email"],
    });
    if (user)
      return res.status(409).send({
        message: "This account is already in use",
      });

    const snsId = req.user["snsId"];
    if (!snsId.some((obj) => obj.provider === "google")) {
      snsId.push({ provider: "google", email: payload["email"] });
    } else {
      return res.status(409).send({
        message: "You already have a connected google account",
      });
    }
    await req.user.updateOne({ snsId });
    return res.status(200).send();
  } catch (err) {
    console.log(err);
    if (err) return res.status(500).send({ err: err.status });
  }
};

exports.disconnectGoogle = async (req, res) => {
  try {
    const snsId = req.user["snsId"];
    const idx = snsId.findIndex((obj) => obj.provider === "google");
    if (idx == -1) {
      return res.status(409).send({
        message: "no google account connected to this account",
      });
    }
    req.user["snsId"].splice(idx, 1);
    await req.user.updateOne({ snsId });
    return res.status(200).send();
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.logout = (req, res) => {
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
    const exUser = await _User.findOne({ userId: req.body.userId });
    if (exUser)
      return res.status(409).send({
        message: `userId '${req.body.userId}' is already in use`,
      });

    const user = new _User(req.body);
    const password = _User.generatePassword();
    user.password = password;
    user.auth = "owner";
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

    // db의 userId 목록
    const _userIds = (await _User.find({})).map((_user) => _user.userId);

    for (let _user of req.body.users) {
      // userId 중복 검사
      if (_userIds.includes(_user.userId)) {
        return res
          .status(409)
          .send({ message: "duplicate userId " + _user.userId });
      }

      // validate
      if (!_User.validationCheck(_user)) {
        return res.status(400).send({ message: "validation failed" });
      }
    }

    const users = [];
    const schoolUsers = [];
    for (let _user of req.body.users) {
      const user = new _User(_user);
      user.academyId = req.user.academyId;
      user.academyName = req.user.academyName;

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

    const school = await _School.findOne({
      schoolId: req.body.schoolId,
    });
    if (!school) {
      return res.status(404).send({ message: "no school!" });
    }

    const users = [];
    const schoolUsers = [];

    for (const _user of req.body.users) {
      const user = await _User.findOne({
        userId: _user.userId,
      });
      if (!user) {
        return res.status(404).send({ message: "no user!" });
      }

      if (
        _.findIndex(user.schools, {
          schoolId: school.schoolId,
        }) !== -1
      ) {
        return res.status(409).send({
          message: `user ${user.userId} is already entered`,
        });
      }
      user.schools.push({
        schoolId: school.schoolId,
        schoolName: school.schoolName,
      });
      users.push(user);

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

    await Promise.all([
      users.map((user) => user.save()),
      schoolUsers.map((schoolUser) => schoolUser.save()),
    ]);

    return res.status(200).send({ schoolUsers });
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.appointManager = async (req, res) => {
  try {
    const user = await User(req.user.dbName).findOne({
      _id: req.params._id,
    });

    if (!user) {
      return res.status(409).send({ message: "no such user!" });
    }

    if (user.auth != "member") {
      return res.status(401).send({ message: "you cannot update this user" });
    }

    user.auth = "manager";
    await user.save();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.cancelManager = async (req, res) => {
  try {
    const user = await User(req.user.dbName).findOne({
      _id: req.params._id,
    });
    if (!user) {
      return res.status(409).send({ message: "no such user!" });
    }
    if (user.auth != "manager") {
      return res
        .status(401)
        .send({ message: "you can't appoint user as member" });
    }

    user.auth = "member";
    await user.save();

    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

exports.readOwners = async (req, res) => {
  try {
    const users = await User("root").find({});
    return res.status(200).send({ users });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.readAdmin = async (req, res) => {
  try {
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
    const users = await User(req.user.dbName).find({});
    return res.status(200).send({ users });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.updateMemberField = async (req, res) => {
  try {
    const _User = User(req.user.dbName);

    const user = await _User.findById(req.params._id);
    if (!user) {
      return res.status(409).send({ message: "no user with such _id" });
    }

    if (user.auth != "member") {
      return res.status(401).send({ message: "you cannot update this user" });
    }

    user[req.params.field] = req.body.new;
    if (!_User.validationCheck(user, req.params.field)) {
      return res.status(400).send({ message: "validation failed" });
    }

    await user.save();
    return res.status(200).send({ user });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.read = async (req, res) => {
  try {
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
    user[req.params.field] = req.body.new;

    if (!User(req.user.dbName).validationCheck(user, req.params.field)) {
      return res.status(400).send({ message: "validation failed" });
    }
    await user.save();
    return res.status(200).send({ user });
  } catch (err) {
    if (err) return res.status(500).send({ err: err.message });
  }
};

exports.deleteMember = async (req, res) => {
  try {
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
