const Clasroom = require("../models/Classroom");

exports.create = async(req,res)=>{
    try {
        const classrooms = req.body.classrooms.map(classroom => {
            classroom.schoolId=req.body.schoolId;
            return classroom;
        });
        const newClassrooms=await Clasroom(req.academy).insertMany(classrooms);
        return res.status(200).send({classrooms:newClassrooms})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const classroom = await Clasroom(req.academy).find(req.query);
        return res.status(200).send({classroom})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const classroom=req.body.classroom;
        const updatedClassroom = await Clasroom(req.academy).findByIdAndUpdate(classroom._id, classroom,{ returnDocument: 'after' });
        return res.status(200).send({ classroom: updatedClassroom })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Clasroom(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


