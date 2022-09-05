const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { User } = require("../models/User");
const { Academy } = require("../models/Academy");

module.exports = () => {
  passport.use(
    new LocalStrategy(
      {
        academyId: "academyId",
        usernameField: "userId",
        passwordField: "password",
      },
      async (academyId, userId, password, done) => {
        try {
          console.log("test!");

          const academy = await Academy.findOne({
            academyId,
          });
          if (!academy) {
            const err = new Error("No academy!");
            err.code = 404;
            done(err, null, null);
          }

          const user = await User(academy.dbName)
            .findOne({ userId })
            .select("+password");
          if (!user) {
            const err = new Error("No user with such ID");
            err.code = 404;
            done(err, null, null);
          }
          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
            const err = new Error("Password is incorrect");
            err.code = 409;
            done(err, null, null);
          }

          done(null, user, academy.dbName);
        } catch (err) {
          done(err, null, null);
        }
      }
    )
  );
};
