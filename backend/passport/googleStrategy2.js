const passport = require("passport");
const CustomStrategy = require("passport-custom").Strategy;
const User = require("../models/User");
const Academy = require("../models/Academy");
const { OAuth2Client } = require("google-auth-library");
const clientID = require("../config/config")["GOOGLE-ID"];

module.exports = () => {
  passport.use(
    "google2",
    new CustomStrategy(async function (req, done) {
      try {
        const { academyId, credential } = req.body;

        const academy = await Academy.findOne({
          academyId,
        });
        if (!academy) {
          const err = new Error("No academy!");
          err.status = 404;
          throw err;
        }

        const client = new OAuth2Client(clientID);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientID,
        });
        const payload = ticket.getPayload();
        const user = await User(academy.dbName).findOne({
          "snsId.provider": "google",
          "snsId.email": payload["email"],
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
