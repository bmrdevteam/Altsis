import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { Academy, User } from "../models/index.js";
import { getPayload } from "../utils/payload.js";

const google2 = () => {
  passport.use(
    "google2",
    new CustomStrategy(async function (req, done) {
      try {
        const { academyId, credential } = req.body;

        const payload = await getPayload(credential);

        const academy = await Academy.findOne({
          academyId,
        });
        if (!academy) {
          const err = new Error(__NOT_FOUND("academy"));
          return done(err, null, null);
        }
        if (!academy.isActivated) {
          const err = new Error(ACADEMY_INACTIVATED);
          return done(err, null, null);
        }

        const user = await User(academyId)
          .findOne({
            "snsId.google": payload.email,
          })
          .select("+snsId");
        if (!user) {
          const err = new Error(__NOT_FOUND("user"));
          return done(err, null, null);
        }

        return done(null, user, academyId);
      } catch (err) {
        return done(err, null, null);
      }
    })
  );
};

export { google2 };
