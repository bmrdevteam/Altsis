var passport = require('passport')

const User = require("../models/User");
const { OAuth2Client } = require('google-auth-library');
const clientID = require('../config/config')["GOOGLE-ID"]

exports.login = async(req, res, next) => {
    try {
        /* authentication */
        const user = await User(req.body.academy).findOne({userId:req.body.userId});
        if (!user){    
            return res.status(409).send({ message: 'No user with such ID' });
        }
        const isMatch = await user.comparePassword(req.body.password)
        if (!isMatch) {
            return res.status(409).send({ message: 'Password is incorrect'});
        }

       /* login */
       req.login({user,academy:req.body.academy}, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            return res.status(200).send({
                success: true,owner: user
            });
        });
    }
    catch (err) {
        res.status(500).send(err)
    }
}