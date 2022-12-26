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
          const err = new Error("Academy Not found");
          err.status = 404;
          throw err;
        }

        const user = await User(academyId)
          .findOne({
            "snsId.google": payload.email,
          })
          .select("+snsId");

        if (!user) {
          const err = new Error("User not found");
          err.status = 409;
          throw err;
        }

        return done(null, user, academyId);
      } catch (err) {
        return done(err, null, null);
      }
    })
  );
};
