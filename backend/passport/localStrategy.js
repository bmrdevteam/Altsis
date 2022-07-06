const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models/User');

module.exports = () => {
    passport.use(
        new LocalStrategy(
            {
                usernameField : 'userId',
                passwordField : 'password'
            }, 
            async (_userId, password, done) => {
                try{
                    const _user=await User.findOne({userId:_userId})
                    if (!_user){
                        done(null, false, { message: 'No user with such ID' });
                    }
                    const isMatch = await _user.comparePassword(password)
                    if (!isMatch) {
                        done(null, false, { message: 'Password is incorrect' });
                    }
                    done(null, {
                        _id:_user._id,
                        userId:_user.userId,
                        auth:_user.auth,
                        school:_user.school
                    });
                }
                catch(err){
                    done(err)
                }
            },
        ),
    );
};