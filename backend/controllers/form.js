const Form = require("../models/Form");

exports.create = async(req,res)=>{
    try {
        const _Form=Form(req.academy);
        const form=new _Form(req.body.form);
        await form.save();
        return res.status(200).send({form})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const form = await Form(req.academy).find(req.query);
        return res.status(200).send({form})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const form=req.body.form;
        const updatedForm = await Form(req.academy).findByIdAndUpdate(form._id, form,{ returnDocument: 'after' });
        return res.status(200).send({ form: updatedForm })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Form(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


