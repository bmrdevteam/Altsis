var passport = require('passport')

const { User } = require("../models/User");
const { checkSchema,validationResult } = require("express-validator")

const passwordRegExp = /[!@#$%^&*()]+/;

const schema={
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
            options:passwordRegExp
        }
    }
}

exports.validate = checkSchema(schema);

exports.register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try{
        const _user=await User.findOne({userId:req.body.userId});
        if(_user) return res.status(409).send({message: "User already exists with such id" });
        const user = new User(req.body);
        const doc = await user.save()
        return res.status(200).send({success: true});
    }
    catch(err){
        if (err) return res.status(500).send({ err });
    }
}

exports.login = (req, res, next) => {
    passport.authenticate('local', (authError, user, message) => {
        if (authError) return res.status(500).send({ authError });
        if (!user) return res.status(409).send(message);
        req.login(user, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            res.status(200).send({
                success: true, user
            });
        });
    })(req, res, next)
}

exports.logout = (req, res) => {
    req.logout((err)=>{
        if(err) return res.status(500).send({ err });
        req.session.destroy();
        console.log("you are logged out!")
        return res.status(200).send({success:true})
    });
}