const User = require("../models/User");
const { OAuth2Client } = require('google-auth-library');
const { checkSchema, validationResult } = require("express-validator");
const clientID = require('../config/config')["GOOGLE-ID"]
const saltRounds=require('../config/config')["saltRounds"]
const bcrypt=require('bcrypt')

const specialRegExp = /[!@#$%^&*()]+/;
const schema = {
    "user.*.userId": {
        in: "body",
        isLength: {
            errorMessage: "ID length error",
            options: { min: 4, max: 20 }
        },
        isAlphanumeric: {
            errorMessage: "ID must be alphanumeric"
        }
    },
    "user.*.password": {
        in: "body",
        isLength: {
            errorMessage: "Password length error",
            options: { min: 8, max: 20 }
        },
        matches: {
            errorMessage: "Password must contain one special character",
            options: specialRegExp
        }
    },
    "user.*.email": {
        in: "body",
        trim: true,
        isEmail: {
            errorMessage: "invalid email"
        }
    }
}
exports.validate = checkSchema(schema);

const generateHash=async(password)=>{
    try{
        console.log('generating...')
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password,salt);
        return hash;
    }
    catch(err){
        throw err;
    }
}

exports.localLogin = async (req, res) => {
    try {
        /* authentication */
        const user = await User(req.body.academy).findOne({ userId: req.body.userId });
        if (!user) {
            return res.status(409).send({ message: 'No user with such ID' });
        }
        const isMatch = await user.comparePassword(req.body.password)
        if (!isMatch) {
            return res.status(409).send({ message: 'Password is incorrect' });
        }

        /* login */
        req.login({ user, academy: req.body.academy }, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            return res.status(200).send({
                success: true, user:{
                    _id:user._id,
                    userId:user.userId,
                    auth:user.auth,
                    school:user.school
                }
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

        const payload = ticket.getPayload();
        const user = await User(req.body.academy).findOne({ email: payload["email"], isAuthorized: true });
        if (!user) return res.status(409).send({
            message: "User doesn't exists with such google account"
        })

        /* login */
        req.login({ user, academy: req.body.academy }, loginError => {
            if (loginError) return res.status(500).send({ loginError: loginError.message });
            return res.status(200).send({
                success: true, user:{
                    _id:user._id,
                    userId:user.userId,
                    auth:user.auth,
                    school:user.school
                }
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
        res.clearCookie('connect.sid');
        return res.status(200).send({ success: true })
    });
}

exports.info = async (req, res) => {
    const academy = req.session.passport.user["academy"];
    const _id = req.session.passport.user["_id"];

    const user = await User(academy).findOne({ _id: _id })
    if (!user) {
        return res.status(409).send({ message: "User doesn't exists with such _id&academy" })
    }
    return res.status(200).send({
        success: true,
        _user: user
    });
}


exports.create = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const academy = req.body.academy;
        const users = req.body.user.map(user => {
            user.auth = (req.body.auth);
            return user;
        });
        const newUsers  = await User(academy).insertMany(users)
        return res.status(200).send({ newUsers});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}


exports.read = async (req, res) => {
    try {
        const academy = req.query.academy;
        if (!academy) {
            return res.status(409).send({ message: "academy info is needed" });
        }

        let dbQuery = req.query;
        delete dbQuery.academy;
        const user = await User(academy).find(dbQuery);
        if (user.length == 0) return res.status(404).send({ message: "no user!" })
        return res.status(200).send({user})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    if (!req.body.hasOwnProperty("academy")) {
        return res.status(409).send({ message: "academy is needed" });
    }
    try {
        const academy = req.body.academy;
        const user=req.body.user[0];
        if(user.password){
            user.password=await generateHash(user.password)
        }
        const updatedUser = await User(academy).findByIdAndUpdate(user._id, user,{ returnDocument: 'after' });
        return res.status(200).send({ user: updatedUser })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    const academy = req.query.academy;
    if (!academy) {
        return res.status(409).send({ message: "academy info is needed" });
    }
    try {
        const doc = await User(academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


