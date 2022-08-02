const Form = require("../models/Form");

exports.create = async(req,res)=>{
    try {
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
        const updatedForm = await Form(req.user.dbName).findByIdAndUpdate(req.params._id, req.body,{ returnDocument: 'after' });
        return res.status(200).send({ form: updatedForm })
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


