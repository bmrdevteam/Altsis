const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
 
const { User } = require('../models/User');
const config=require('../config/config')

module.exports = () => {
   passport.use(
      new GoogleStrategy(
         {
            clientID: config["GOOGLE-ID"],
            clientSecret: config["GOOGLE-SECRET"],
            callbackURL: config["GOOGLE-REDIRECT-URI"], 
         },
         async (accessToken, refreshToken, profile, done) => {
            try {
                console.log("entered to googleStrategy")
               const exUser = await User.findOne({ snsId: profile.id, provider: 'google' });
               // 이미 가입된 구글 프로필인 경우 로그인 인증 완료
               if (exUser) {
                console.log('You have account! Now you are logged in.')
                  done(null, exUser); 
               } 
               // 가입되지 않은 유저인 경우 회원가입+로그인
               else {
                console.log('You should register first.')
                  const _user = new User({
                     email: profile?.emails[0].value,
                     name: profile.displayName,
                     snsId: profile.id,
                     provider: 'google',
                  });
                  // register and done
                  const doc = await _user.save()
                  done(null, _user);
               }
            } catch (err) {
               done(err);
            }
         },
      ),
   );
};