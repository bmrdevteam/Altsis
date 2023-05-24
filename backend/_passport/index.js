import passport from "passport";
import { local2 } from "./localStrategy2.js";
import { google2, workspace } from "./googleStrategy2.js";
import { User } from "../models/index.js";

const config = () => {
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
  workspace();
};

export { config };
