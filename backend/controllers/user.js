const User = require("../models/User");
const SchoolUser=require("../models/SchoolUser");
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
const optionalSchema = {
    "user.*.userId": {
        in: "body",
        optional:true,
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
        optional:true,
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
        optional:true,
        trim: true,
        isEmail: {
            errorMessage: "invalid email"
        }
    }
}
exports.validate = checkSchema(schema);
exports.optionalValidate = checkSchema(optionalSchema);

const generateHash=async(password)=>{
    try{
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password,salt);
        return hash;
    }
    catch(err){
        throw err;
    }
}

exports.loginLocal = async (req, res) => {
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

exports.loginGoogle = async (req, res) => {
    try {
        const client = new OAuth2Client(clientID);

        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: clientID,
        });

        const payload = ticket.getPayload();
        const user = await User(req.body.academy).findOne({ snsId:{'google':payload['email']}});
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

exports.connectGoogle=async (req, res) => {
    try {
        const client = new OAuth2Client(clientID);

        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: clientID,
        });

        const payload = ticket.getPayload();

        const _user=req.session.passport.user;

        const user=User(_user.academy).findById(_user._id);
        const snsId=(user["snsId"]||{});
        snsId['google']=payload['email'];
        await user.updateOne({snsId});
        
        return res.status(200).send({success:true})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.disconnectGoogle=async(req,res)=>{
    const _user=req.session.passport.user;

    const user=await User(_user.academy).findById(_user._id);
    const snsId=user["snsId"];
    delete snsId["google"];
    await user.updateOne({snsId})

    return res.status(200).send({success:true})
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
        const users = req.body.user.map(user => {
            user.auth = req.auth;
            return user;
        });
        const newUsers  = await User(req.academy).insertMany(users);
        if(req.auth=='member'){
            const schoolUsers= newUsers.reduce((acc, user) => {
                user.school.forEach(school => {
                    acc.push({
                        schoolId:school,
                        userId:user.userId,
                        userName:user.name,
                        userEmail: user.email
                    });
                });
                return acc;
              }, []);
            const newSchoolUsers  = await SchoolUser(req.academy).insertMany(schoolUsers);
        }
        return res.status(200).send({ user:newUsers});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}


exports.read = async (req, res) => {
    try {
        const user = await User(req.academy).find(req.query);
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
    try {
        const user=req.body.user[0];
        if(user.password){
            user.password=await generateHash(user.password)
        }
        const updatedUser = await User(req.academy).findByIdAndUpdate(user._id, user,{ returnDocument: 'after' });
        return res.status(200).send({ user: updatedUser })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await User(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


