import passport from "passport";
import { local2 } from "./localStrategy2.js";
import { google2 } from "./googleStrategy2.js";
import { User } from "../models/index.js";

const config = () => {
  passport.serializeUser(({ user, academyId }, done) => {
    done(null, { _id: user._id, academyId });
  });

  passport.deserializeUser(({ _id, academyId }, done) => {
    // 세션에 남은 유저가 DB에 없으면 user가 null → 속성 세팅 시 서버 크래시
    User(academyId).findOne({ _id }, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      user.academyId = academyId;
      return done(null, user);
    });
  });

  local2();
  google2();
};

export { config };
