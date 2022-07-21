const SchoolUser = require("../models/SchoolUser");
const { checkSchema, validationResult } = require("express-validator");

exports.read = async (req, res) => {
    try {
        const user = await SchoolUser(req.academy).find(req.query);
        return res.status(200).send({user})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const user=req.body.user[0];
        if(user.password){
            user.password=await generateHash(user.password)
        }
        const updatedUser = await SchoolUser(req.academy).findByIdAndUpdate(user._id, user,{ returnDocument: 'after' });
        return res.status(200).send({ user: updatedUser })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await SchoolUser(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


