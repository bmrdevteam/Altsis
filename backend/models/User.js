const mongoose=require('mongoose')
const bcrypt = require('bcrypt');
var config=require('../config/config.js')

const conn=require('../databases/connection')   

const userSchema=mongoose.Schema({
    auth:String,
    userId:{
        type:String,
        unique:true
    },
    password:String,
    name:String,
    email:String,
    userImg:String,
    timestamps:{
        type:String,
        default:Date.now
    },
    isAuthorized:{
        type:Boolean,
        default:false
    },
    school:Array
});

userSchema.pre('save',function(next){
    var user=this;
    if(user.isModified('password')){ //비밀번호가 바뀔때만 암호화
        bcrypt.genSalt(config.saltRounds,function(err,salt){
            if(err) return next(err);
            bcrypt.hash(user.password,salt,function(err,hash){
                if(err) return next(err);
                user.password=hash;
                next();
            })
        })
    }else{
        next()
    }
})

userSchema.methods.comparePassword=async function(plainPassword){
    var user=this;
    try{
        const isMatch = await bcrypt.compare(plainPassword,user.password)
        return isMatch
    }
    catch(err){
        return err
    }
}

module.exports=(dbName)=>{
    return conn[dbName].model('User',userSchema);
}