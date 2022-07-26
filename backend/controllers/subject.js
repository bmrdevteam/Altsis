const Subject = require("../models/Subject");

exports.create = async(req,res)=>{
    try {
        const subjects = req.body.subjects.map(subject => {
            subject.schoolId=req.body.schoolId;
            return subject;
        });
        const newSubjects=await Subject(req.academy).insertMany(subjects);
        return res.status(200).send({subjects:newSubjects})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const subject = await Subject(req.academy).find(req.query);
        return res.status(200).send({subject})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const subject=req.body.subject;
        const updatedSubject = await Subject(req.academy).findByIdAndUpdate(subject._id, subject,{ returnDocument: 'after' });
        return res.status(200).send({ subject: updatedSubject })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Subject(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


