const passport = require('passport');
const local = require('./localStrategy');
const google=require('./googleStrategy');
const User = require("../models/User");

module.exports = () => {
    passport.serializeUser(({user,academy}, done) => {
        done(null, {_id:user._id,auth:user.auth,academy});
    });

    passport.deserializeUser(({_id,auth,academy}, done) => {
        User(academy).findOne({_id:_id}, (err, _user) => {
            if(err) done(err)
            done(null,_user)
        })
     });

     local();
     google();
};