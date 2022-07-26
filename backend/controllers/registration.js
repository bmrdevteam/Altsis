const Registration = require("../models/Registration");

exports.create = async(req,res)=>{
    try {
        const _Registration=Registration(req.session.passport.user.academy);
        const registration = new _Registration(req.body.registration);
        await registration.save();
        return res.status(200).send({registration})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const registration = await Registration(req.session.passport.user.academy).find(req.query);
        return res.status(200).send({registration})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const registration=req.body.registration;
        const updatedRegistration = await Registration(req.session.passport.user.academy).findByIdAndUpdate(registration._id, registration,{ returnDocument: 'after' });
        return res.status(200).send({ registration: updatedRegistration })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Registration(req.session.passport.user.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


