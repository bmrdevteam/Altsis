const School = require("../models/School");

exports.create = async (req, res) => {
    try {
        const _School = School(req.academy);
        const school=new _School(req.body.school);
        await school.save()
        return res.status(200).send({ school});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}


exports.read = async (req, res) => {
    try {
        const school = await School(req.academy).find(req.query);
        return res.status(200).send({school});
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.update = async (req, res) => {
    try {
        const school=req.body.school;
        const updatedSchool = await School(req.academy).findByIdAndUpdate(school._id, school,{ returnDocument: 'after' });
        return res.status(200).send({ school: updatedSchool })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await School(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


