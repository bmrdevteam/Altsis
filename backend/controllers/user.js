var passport = require('passport')

const { User } = require("../models/User");
const { checkSchema,validationResult } = require("express-validator")
const {OAuth2Client} = require('google-auth-library');
const clientID=require('../config/config')["GOOGLE-ID"]

const specialRegExp = /[!@#$%^&*()]+/;

const localSchema={
    userId:{
        in:"body",
        trim:true,
        isLength:{
            errorMessage:"ID length error",
            options:{min:4,max:20}
        },
        isAlphanumeric:{
            errorMessage:"ID must be alphanumeric"
        }
    },
    password:{
        in:"body",
        trim:true,
        isLength:{
            errorMessage:"Password length error",
            options:{min:8,max:20}
        },
        matches:{
            errorMessage:"Password must contain one special character",
            options:specialRegExp
        }
    },
    email:{
        in:"body",
        trim:true,
        isEmail:{
            errorMessage:"invalid email"
        }
    }
}

const googleSchema={
    userId:{
        in:"body",
        trim:true,
        isLength:{
            errorMessage:"ID length error",
            options:{min:4,max:20}
        },
        isAlphanumeric:{
            errorMessage:"ID must be alphanumeric"
        }
    },
    email:{
        in:"body",
        trim:true,
        isEmail:{
            errorMessage:"invalid email"
        }
    }
}

exports.localValidate = checkSchema(localSchema);
exports.googleValidate=checkSchema(googleSchema);

exports.login = (req, res, next) => {
    passport.authenticate('local', (authError, user, message) => {
        if (authError) return res.status(500).send({ authError });
        if (!user) return res.status(409).send(message);
        req.login(user, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            return res.status(200).send({
                success: true, user
            });
        });
    })(req, res, next)
}

exports.register = async  (req, res, next) => {

    /* validation */
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try{
        /* check redundancy */
        const exUser1=await User.findOne({userId:req.body.userId});
        if(exUser1) return res.status(409).send({message: "User already exists with such id" });
        const exUser2=await User.findOne({email:req.body.email});
        if(exUser2) return res.status(409).send({message: "User already exists with such email" })

        /* register */
        const newUser = new User(req.body);
        const doc = await newUser.save()

        /* login */
        req.login(newUser, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            return res.status(200).send({
                success: true, newUser
            });
        });
    }
    catch(err){
        if (err) return res.status(500).send({ err });
    }
}

exports.googleAuth=async (req,res)=>{
    try{
        const client = new OAuth2Client(clientID);

        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: clientID,
        });

        const payload = ticket.getPayload();
        const exUser=await User.findOne({email:payload["email"]});
        if(!exUser) return res.status(409).send({message: "User doesn't exists with such email" })
 
         /* login */
         req.login(exUser, loginError => {
             if (loginError) return res.status(500).send({ loginError });
             return res.status(200).send({
                 success: true, exUser
             });
         });
    }
    catch(err){
        if (err) return res.status(500).send({ err:err.message });
    }
}


exports.logout = (req, res) => {
    req.logout((err)=>{
        if(err) return res.status(500).send({ err });
        req.session.destroy();  
        console.log("you are logged out!")
        return res.status(200).send({success:true})
    });
}

exports.info =async (req,res)=>{
    const _id=req.session.passport.user;
    const _user=await User.findOne({_id:_id})
    if(!_user){
        return res.status(409).send({message: "User doesn't exists with such _id" })
    }

    return res.status(200).send({
        success: true,
        _user
    });
}