const User = require("../models/User");
const { OAuth2Client } = require('google-auth-library');
const clientID = require('../config/config')["GOOGLE-ID"]

exports.localLogin = async(req, res) => {
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

exports.googleLogin = async (req, res) => {
    try {
        const client = new OAuth2Client(clientID);

        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: clientID,
        });

        const payload =  ticket.getPayload();
        const user = await User(req.body.academy).findOne({ email: payload["email"], provider: "google" });
        if (!user) return res.status(409).send({
            message: "User doesn't exists with such google account"
        })

        /* login */
        req.login({user,academy:req.body.academy}, loginError => {
            if (loginError) return res.status(500).send({ loginError: loginError.message });
            return res.status(200).send({
                success: true, user
            });
        });
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).send({ err });
        req.session.destroy();
        return res.status(200).send({ success: true })
    });
}

exports.info = async (req, res) => {
    const academy = req.session.passport.user["academy"];
    const _id=req.session.passport.user["_id"];

    const user = await User(academy).findOne({ _id:_id})
    if (!user) {
        return res.status(409).send({ message: "User doesn't exists with such _id&academy" })
    }
    return res.status(200).send({
        success: true,
        _user: user
    });
}