import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { Strategy as GogoleStrategy } from "passport-google-oauth20";
import { Academy, User } from "../models/index.js";
import { getPayload } from "../utils/payload.js";

const google2 = () => {
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

const getEmail = (profile) => {
  if (profile.emails) {
    for (let _email of profile.emails) {
      if (_email.verified) return _email.value;
    }
  }
  return undefined;
};

const workspace = () => {
  passport.use(
    "workspace",
    new GogoleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID.trim() ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
        callbackURL: "/api/workspaces/auth/callback",
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const expires = new Date();
          expires.setHours(expires.getHours() + 1);

          const user = req.user;
          user.workspace = {
            id: profile.id,
            email: getEmail(profile),
            accessToken: accessToken,
            expires,
            refreshToken: refreshToken,
          };

          await user.save();
          return done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
};

export { google2, workspace };