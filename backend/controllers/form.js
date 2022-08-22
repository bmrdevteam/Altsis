const Form = require("../models/Form");

exports.create = async(req,res)=>{
    try {
        const exForm=await Form(req.user.dbName).findOne({title:req.body.title,type:req.body.type});
        if(exForm){
            res.status(409).send({message:"already existing form title and type"})
        }
        const _Form=Form(req.user.dbName);
        const form=new _Form(req.body);
        form["userId"]=req.user.userId;
        form["userName"]=req.user.userName;
        await form.save();
        return res.status(200).send({form})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.list = async (req, res) => {
    try {
        const forms = await Form(req.user.dbName).find({});
        return res.status(200).send({forms:forms.map(form=>{
            return {
                _id:form._id,
                type:form.type,
                title:form.title,
                userId:form.userId,
                userName:form.userName
            }
        })});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const form = await Form(req.user.dbName).findOne({_id:req.params._id});
        return res.status(200).send({form})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const form=await Form(req.user.dbName).findById(req.params._id);
        if(!form){
            return res.status(404).send({message:'no form'});
        }
        const fields=['type','title','contents'];

        if(req.params.field){
            if(fields.includes(req.params.field)){
                form[req.params.field]=req.body.new;
            }
            else{
                return res.status(400).send({message:`field '${req.params.field}' does not exist or cannot be updated`});
            }
        }
        else{
            fields.forEach(field => {
                form[field]=req.body.new[field];
            });
        }
           
        await form.save();
        return res.status(200).send({ form})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Form(req.user.dbName).findByIdAndDelete(req.params._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


