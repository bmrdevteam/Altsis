import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { Academy, User } from "../models/index.js";
import {
  ACADEMY_INACTIVATED,
  PASSWORD_INCORRECT,
  __NOT_FOUND,
} from "../messages/index.js";

const local2 = () => {
  passport.use(
    "local2",
    new CustomStrategy(async function (req, done) {
      const { academyId, userId, password } = req.body;

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
        .findOne({ userId })
        .select("+password");
      if (!user) {
        const err = new Error(__NOT_FOUND("user"));
        return done(err, null, null);
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const err = new Error(PASSWORD_INCORRECT);
        return done(err, null, null);
      }

      user.password = undefined;
      return done(null, user, academyId);
    })
  );
};

export { local2 };
