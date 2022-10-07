const passport = require("passport");
const CustomStrategy = require("passport-custom").Strategy;
const User = require("../models/User");
const Academy = require("../models/Academy");
const { getPayload } = require("../utils/payload");

module.exports = () => {
  passport.use(
    "google2",
    new CustomStrategy(async function (req, done) {
      try {
        const { academyId, credential } = req.body;

        const [payload, academy] = await Promise.all([
          getPayload(credential),
          Academy.findOne({
            academyId,
          }),
        ]);

        if (!academy) {
          const err = new Error("No academy!");
          err.status = 404;
          throw err;
        }

        const user = await User(academy.dbName).findOne({
          "snsId.google": payload.email,
        });

        if (!user) {
          const err = new Error("User doesn't exists with such google account");
          err.status = 409;
          throw err;
        }

        return done(null, user, academy.dbName);
      } catch (err) {
        return done(err, null, null);
      }
    })
  );
};
