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
          .find({ schoolId: school.schoolId })
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

// module.exports.updateField = async (req, res) => {
//   try {
//     if (["subjects", "classrooms", "form"].indexOf(req.params.field) == -1)
//       return res.status(400).send();

//     const school = await School(req.user.academyId).findById(req.params._id);
//     if (!school) return res.status(404).send({ message: "school not found" });

//     let field = req.params.field;
//     if (req.params.fieldType)
//       field +=
//         req.params.fieldType[0].toUpperCase() + req.params.fieldType.slice(1);

//     school[field] = req.body.new;
//     await school.save();
//     return res.status(200).send(school[field]);
//   } catch (err) {
//     return res.status(500).send({ message: err.message });
//   }
// };

module.exports.updateField = async (req, res) => {
  try {
    let field = req.params.field;
    if (req.params.fieldType)
      field +=
        req.params.fieldType[0].toUpperCase() + req.params.fieldType.slice(1);

    if (
      [
        "subjects",
        "classrooms",
        "formTimetable",
        "formSyllabus",
        "formEvaluation",
        "formArchive",
        "permissionSyllabus",
        "permissionEnrollment",
        "permissionEvaluation",
      ].indexOf(field) == -1
    )
      return res.status(400).send();

    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) return res.status(404).send({ message: "school not found" });
    school[field] = req.body.new;
    await school.save();

    return res.status(200).send(school[field]);
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
