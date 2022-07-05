const passport = require('passport');
const local = require('./localStrategy');
const google=require('./googleStrategy');
const { User } = require('../models/User');

module.exports = () => {
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser((_id, done) => {
        User.findOne({ _id: _id }, (err, _user) => {
            if(err) done(err)
            done(null,_user)
        })
     });

     local();
     google();
};