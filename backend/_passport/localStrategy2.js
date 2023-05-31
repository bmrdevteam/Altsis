import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { Academy, User } from "../models/index.js";

const local2 = () => {
  passport.use(
    "local2",
    new CustomStrategy(async function (req, done) {
      const { academyId, userId, password } = req.body;

      const academy = await Academy.findOne({
        academyId,
      });
      if (!academy) {
        const err = new Error("Academy not found");
        err.status = 404;
        return done(err, null, null);
      }
      if (!academy.isActivated) {
        const err = new Error("Academy is inactivated");
        err.status = 409;
        return done(err, null, null);
      }

      const user = await User(academyId)
        .findOne({ userId })
        .select("+password");
      if (!user) {
        const err = new Error("User not found");
        err.status = 404;
        return done(err, null, null);
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const err = new Error("Incorrect password");
        err.status = 409;
        return done(err, null, null);
      }

      user.password = undefined;
      return done(null, user, academyId);
    })
  );
};

export { local2 };
