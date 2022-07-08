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
               const exUser = await User.findOne({ snsId: profile.id, provider: 'google' });
               if (exUser) { //이미 가입된 유저
                  done(null, exUser); 
               } 
               else { //가입되지 않은 유저
                  done(null, null,{ message: 'You should register first.',profile:{
                     name: profile.displayName,
                     email: profile?.emails[0].value,
                     snsId: profile.id,
                     userImg:profile?.photos[0].value,
                     provider: 'google',
                  } });
               }
            } catch (err) {
               done(err);
            }
         },
      ),
   );
};