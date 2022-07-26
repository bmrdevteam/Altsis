const Season = require("../models/Season");

exports.create = async(req,res)=>{
    try {
        const seasons = req.body.seasons.map(season => {
            season.schoolId=req.body.schoolId;
            return season;
        });
        const newSeasons=await Season(req.academy).insertMany(seasons);
        return res.status(200).send({seasons:newSeasons})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.read = async (req, res) => {
    try {
        const season = await Season(req.academy).find(req.query);
        return res.status(200).send({season})
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}

exports.update = async (req, res) => {
    try {
        const season=req.body.season;
        const updatedSeason = await Season(req.academy).findByIdAndUpdate(season._id, season,{ returnDocument: 'after' });
        return res.status(200).send({ season: updatedSeason })
    }
    catch (err) {
        if (err) return res.status(500).send({ err: err.message });
    }
}


exports.delete = async (req, res) => {
    try {
        const doc = await Season(req.academy).findByIdAndDelete(req.query._id);
        return res.status(200).send({success:(!!doc)})
    }
    catch (err) {
        return res.status(500).send({ err: err.message });
    }
}


