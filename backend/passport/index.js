const passport = require("passport");
const local2 = require("./localStrategy2");
const google2 = require("./googleStrategy2");
const { User } = require("../models/models");

module.exports = () => {
  passport.serializeUser(({ user, dbName }, done) => {
    done(null, { _id: user._id, dbName });
  });

  passport.deserializeUser(({ _id, dbName }, done) => {
    User(dbName).findOne({ _id: _id }, (err, user) => {
      if (err) done(err);
      user["dbName"] = dbName;
      done(null, user);
    });
  });

  local2();
  google2();
};
