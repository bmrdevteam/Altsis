const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const { User } = require('../models/User');

module.exports = () => {
    passport.use(
        new LocalStrategy(
            {
                usernameField : 'userId',
                passwordField : 'pw'
            }, //async-await로 바꾸기
            (_userId, pw, done) => {
                User.findOne({ userId: _userId }, (err, _user) => {
                    if (err) done(err);
                    if (!_user){
                        done(null, false, { message: 'No user with such ID' });
                    }
                    _user.comparePassword(pw, (err, isMatch) => {
                        if (err) return res.status(500).send({ err });
                        if (!isMatch) {
                            done(null, false, { message: 'Password is incorrect' });
                        }
                        done(null, _user);
                    });
                })
            },
        ),
    );
};