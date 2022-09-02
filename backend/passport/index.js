const passport = require("passport");
const local = require("./localStrategy");
const google = require("./googleStrategy");
const User = require("../models/User");

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

  local();
  //  google();
};
