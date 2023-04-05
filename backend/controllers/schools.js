const _ = require("lodash");
const { School, Season } = require("../models");

/* create */
module.exports.create = async (req, res) => {
  try {
    const _School = School(req.user.academyId);

    /* validate */
    if (!_School.isValid(req.body))
      return res.status(400).send({ message: "validation failed" });

    /* check duplication */
    const exSchool = await _School.findOne({ schoolId: req.body.schoolId });
    if (exSchool)
      return res
        .status(409)
        .send({ message: `schoolId ${req.body.schoolId} is already in use` });

    /* create and save document */
    const school = new _School(req.body);
    await school.save();
    return res.status(200).send(school);
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.find = async (req, res) => {
  try {
    if (req.params._id) {
      const school = await School(req.user.academyId).findById(req.params._id);
      if (!school) return res.status(404).send({ message: "school not found" });

      if (req.query?.includes === "seasons") {
        const seasons = await Season(req.user.academyId)
          .find({ school: school._id })
          .select([
            "year",
            "term",
            "period",
            "isActivated",
            "isActivatedFirst",
          ]);

        return res.status(200).send({
          school,
          seasons,
        });
      }

      return res.status(200).send(school);
    }
    const schools = await School(req.user.academyId)
      .find({})
      .select(["schoolId", "schoolName"]);
    return res.status(200).send({ schools });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

module.exports.updateFormArchive = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) return res.status(404).send({ message: "school not found" });
    school["formArchive"] = req.body.formArchive;
    await school.save();

    return res.status(200).send({ formArchive: school.formArchive });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

module.exports.updateLinks = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) return res.status(404).send({ message: "school not found" });
    school["links"] = req.body.links;
    await school.save();

    return res.status(200).send({ links: school.links });
  } catch (err) {
    return res.status(err.status || 500).send({ message: err.message });
  }
};

/* delete */

exports.delete = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) return res.status(404).send();
    await school.delete();
    return res.status(200).send();
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};
