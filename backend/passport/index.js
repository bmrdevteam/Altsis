const passport = require("passport");
const local2 = require("./localStrategy2");
const google2 = require("./googleStrategy2");
const { User } = require("../models");

module.exports = () => {
  passport.serializeUser(({ user, academyId }, done) => {
    done(null, { _id: user._id, academyId });
  });

  passport.deserializeUser(({ _id, academyId }, done) => {
    User(academyId).findOne({ _id }, (err, user) => {
      if (err) done(err);
      user["academyId"] = academyId;
      done(null, user);
    });
  });

  local2();
  google2();
};
