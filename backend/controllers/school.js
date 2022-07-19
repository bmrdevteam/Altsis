const School = require("../models/School");

exports.create = async (req, res) => {
    try {
        const academy = req.body.academy;
        if (!academy) {
            return res.status(409).send({ message: "academy info is needed" });
        }
        const _School = School(academy);
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
        const academy = req.query.academy;
        if (!academy) {
            return res.status(409).send({ message: "academy info is needed" });
        }

        let dbQuery = req.query;
        delete dbQuery.academy;
        const school = await School(academy).find(dbQuery);
        if (school.length == 0) return res.status(404).send({ message: "no school!" })
        return res.status(200).send({school})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.update = async (req, res) => {
    try {
        const academy=req.body.academy;
        if (!academy) {
            return res.status(409).send({ message: "academy info is needed" });
        }
        const school=req.body.school;
        const updatedSchool = await School(academy).findByIdAndUpdate(school._id, school,{ returnDocument: 'after' });
        return res.status(200).send({ school: updatedSchool })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    const academy = req.query.academy;
    if (!academy) {
        return res.status(409).send({ message: "academy info is needed" });
    }
    try {
        const doc = await School(academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


