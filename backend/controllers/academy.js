const Academy = require("../models/Academy");

exports.create = async (req, res) => {

    try {
        const academy  = new Academy(req.body);
        await academy.save()
        return res.status(200).send({ academy});
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
    
}


exports.read = async (req, res) => {
    try {
        let dbQuery = req.query;
        const academy = await Academy.find(dbQuery);
        if (academy.length == 0) return res.status(404).send({ message: "no academy!" })
        return res.status(200).send({academy})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const academy=req.body.academy[0];
        const updatedAcademy = await Academy.findByIdAndUpdate(academy._id, academy,{ returnDocument: 'after' });
        return res.status(200).send({ academy: updatedAcademy })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.delete = async (req, res) => {
    try {
        const doc = await Academy.findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


