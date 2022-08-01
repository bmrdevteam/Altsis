const User = require("../models/User");
const SchoolUser=require("../models/SchoolUser");
const { OAuth2Client } = require('google-auth-library');
const { checkSchema, validationResult } = require("express-validator");
const clientID = require('../config/config')["GOOGLE-ID"]
const saltRounds=require('../config/config')["saltRounds"]
const bcrypt=require('bcrypt')

const specialRegExp = /[!@#$%^&*()]+/;
const schemaOwner ={
    "userId": {
        in: "body",
        isLength: {
            errorMessage: "ID length error",
            options: { min: 4, max: 20 }
        },
        isAlphanumeric: {
            errorMessage: "ID must be alphanumeric"
        }
        
    },
    "userName": {
        in: "body",
        isLength: {
            errorMessage: "userName length error",
            options: { min: 2, max: 20 }
        }
    },
    "email": {
        in: "body",
        trim: true,
        isEmail: {
            errorMessage: "invalid email"
        }
    }
}
const schemaMembers = {
    "users.*.userId": {
        in: "body",
        isLength: {
            errorMessage: "ID length error",
            options: { min: 4, max: 20 }
        },
        isAlphanumeric: {
            errorMessage: "ID must be alphanumeric"
        }
        
    },
    "users.*.userName": {
        in: "body",
        isLength: {
            errorMessage: "userName length error",
            options: { min: 2, max: 20 }
        }
    },
    "users.*.password": {
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
    "users.*.email": {
        in: "body",
        trim: true,
        optional:true,
        isEmail: {
            errorMessage: "invalid email"
        }
    }
}
const schemaUpdate={
    "password": {
        in: "body",
        isLength: {
            errorMessage: "Password length error",
            options: { min: 8, max: 20 }
        },
        matches: {
            errorMessage: "Password must contain one special character",
            options: specialRegExp
        },
        optional:true,
    },
    "email": {
        in: "body",
        trim: true,
        isEmail: {
            errorMessage: "invalid email"
        },
        optional:true
    }
}

exports.validateOwner=checkSchema(schemaOwner);
exports.validateMembers = checkSchema(schemaMembers);
exports.validateUpdate = checkSchema(schemaUpdate);

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
        let dbName='root'
        if(req.body.academyId){
            dbName=req.body.academyId+'-db';
        }

        const user = await User(dbName).findOne({ userId: req.body.userId });
        if (!user) {
            return res.status(409).send({ message: 'No user with such ID' });
        }
 
        const isMatch = await user.comparePassword(req.body.password)
        if (!isMatch) {
            return res.status(409).send({ message: 'Password is incorrect' });
        }

        /* login */
        req.login({ user, dbName }, loginError => {
            if (loginError) return res.status(500).send({ loginError });
            return res.status(200).send({
                success: true, user:{
                    _id:user._id,
                    userId:user.userId,
                    userName:user.userName,
                    auth:user.auth
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
        let dbName='root'
        if(req.body.academyId){
            dbName=req.body.academyId+'-db';
        }

        const client = new OAuth2Client(clientID);

        const ticket = await client.verifyIdToken({
            idToken: req.body.credential,
            audience: clientID,
        });

        const payload = ticket.getPayload();
        const user = await User(dbName).findOne({ "snsId.provider":'google',"snsId.email":payload['email']});
        if (!user) return res.status(409).send({
            message: "User doesn't exists with such google account"
        })

        /* login */
        req.login({ user,dbName }, loginError => {
            if (loginError) return res.status(500).send({ loginError: loginError.message });
            return res.status(200).send({
                success: true, user:{
                    _id:user._id,
                    userId:user.userId,
                    auth:user.auth,
                    schools:user.schools
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

        let dbName='root'
        if(req.body.academyId){
            dbName=req.body.academyId+'-db';
        }
        const user = await User(dbName).findOne({ "snsId.provider":'google',"snsId.email":payload['email']});
        if (user) return res.status(409).send({
            message: "User already exists with such google account"
        })

        const snsId=req.user["snsId"];
        const idx = snsId.findIndex(obj => obj.provider === 'google');
        if(idx==-1){
            snsId.push({provider:'google', email:payload['email']});
        }
        else{
            snsId[idx].email=payload['email'];
        }
        await req.user.updateOne({snsId});
        return res.status(200).send({user:{
            userId:req.user.userId,
            userName:req.user.userName,
            snsId:req.user.snsId
        }})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.disconnectGoogle=async (req, res) => {
    try {

        let dbName='root'
        if(req.body.academyId){
            dbName=req.body.academyId+'-db';
        }

        const snsId=req.user["snsId"];
        const idx = snsId.findIndex(obj => obj.provider === 'google');
        if(idx==-1){
            return res.status(409).send({message:"no google account connected to this account"})
        }
        req.user["snsId"].splice(idx, 1);
        await req.user.updateOne({snsId});
        return res.status(200).send({user:{
            userId:req.user.userId,
            userName:req.user.userName,
            snsId:req.user.snsId
        }})
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

exports.createOwner = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const _User=User('root');
        const exUser=await _User.findOne({userId:req.body.userId});
        if (exUser) return res.status(409).send({
            message: `userId '${req.body.userId}' is already in use`
        })

         // generate random password
         var chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
         let password=''
         for (var i = 0; i < 12; i++) {
             var randomNumber = Math.floor(Math.random() * chars.length);
             password += chars[randomNumber];
         }
        
        const user=new _User(req.body);
        user.auth='owner';
        user.password=password;
       
        await user.save();
        return res.status(200).send({
            success: true, user:{
                _id:user._id,
                userId:user.userId,
                userName:user.userName,
                password:password,
                auth:user.auth
            }
        });
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}

exports.createMembers = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        // 중복 검사를 여기서 매번 해야 하는가?

        const users = await Promise.all(req.body.users.map(async (user) => {
            user.auth = 'member';
            //insertMany를 할 때는 여기서 해쉬를 생성해야 한다.
            user.password=await generateHash(user.password); 
            return user;
        }));

        const newUsers=await User(req.user.dbName).insertMany(users);
        return res.status(200).send({users:newUsers.map(user=>{
            return {
                _id:user._id,
                userId:user.userId,
                userName:user.userName,
                email:user.email
            }
        })});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}

exports.appointManager= async (req, res) => {

    try {
        const user=await User(req.user.dbName).findOne({_id:req.params._id});
        if(!user){
            return res.status(409).send({message:"no such user!"});
        }
        if(user.auth!='member'){
            return res.status(401).send({message:"you can't appoint user as manager"});
        }

        user.auth='manager';
        await user.save();

        return res.status(200).send({
            success: true, user:{
                _id:user._id,
                userId:user.userId,
                userName:user.userName,
                auth:user.auth
            }
        });
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}

exports.cancelManager= async (req, res) => {

    try {
        const user=await User(req.user.dbName).findOne({_id:req.params._id});
        if(!user){
            return res.status(409).send({message:"no such user!"});
        }
        if(user.auth!='manager'){
            return res.status(401).send({message:"you can't appoint user as member"});
        }

        user.auth='member';
        await user.save();

        return res.status(200).send({
            success: true, user:{
                _id:user._id,
                userId:user.userId,
                userName:user.userName,
                auth:user.auth
            }
        });
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}

exports.readUsers = async (req, res) => {
    try {
        const users = await User(req.user.dbName).find({});
        return res.status(200).send({users:users.map(user=>{
            user.password=undefined;
            return user;
        })})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.updateAdmin = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User('root').find({_id:req.params._id,auth:"admin"});
        if(!user){
            return res.status(409).send({message:'no user with such _id'});
        }
        const fields=['password','email','tel']
        if(fields.includes(req.params.field)){
            user[req.params.field]=req.body[req.params.field];
        }
        else{
            return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
        }
        await user.save();
        return res.status(200).send({ user})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.updateMember = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User(req.user.dbName).findById(req.params._id);
        if(!user){
            return res.status(409).send({message:'no user with such _id'});
        }
        if(user.auth!='member'){
            return res.status(401).send({message:'you cannot update this user'});
        }

        const fields=['password','email','tel']
        if(fields.includes(req.params.field)){
            user[req.params.field]=req.body[req.params.field];
        }
        else{
            return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
        }
        await user.save();
        user.password=undefined;
        return res.status(200).send({user})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.read = async (req, res) => {
    try {
        const user=req.user;
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
        const user=req.user;
        const fields=['password','email','tel']
        if(fields.includes(req.params.field)){
            user[req.params.field]=req.body[req.params.field];
        }
        else{
            return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
        }
        await user.save();
        return res.status(200).send({ user:{
            userId:user.userId,
            userName:user.userName,
            email:user.email,
            tel:user.tel
        }})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.deleteMember = async (req, res) => {
    try {
        const doc = await User(req.user.dbName).findByIdAndDelete({_id:req.params._id,auth:'member'});
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}

