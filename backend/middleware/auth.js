const{User}=require('../models/User')
const moment = require("moment");

let auth=(req,res,next)=>{
    let token=req.cookies.w_auth;
    let tokenExp=req.cookies.w_authExp;
    if(moment().valueOf()>tokenExp){
        return res.status(401).send({message:"token is expired"})
    }
    User.findByToken(token,(err,_user)=>{
        if (err) return res.status(500).send({ err });
        if(!_user) return res.status(401).send({message:"invalid token"})
        req.token=token;
        req.user=_user;
        next();
    })
}

module.exports = { auth };