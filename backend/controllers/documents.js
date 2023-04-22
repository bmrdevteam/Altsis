const { logger } = require("../log/logger");
const { School, Season } = require("../models");
const _ = require("lodash");

const findDataOfSchool = async (academyId, school) => {
  // get dataEvaluation
  const seasons = await Season(academyId)
    .find({ school: school._id })
    .select(["year", "term", "subjects", "formEvaluation"]);

  const _subjectLabels = new Set();
  const _subjectLabelsBySeason = {};
  const _evaluationFieldsByYear = new Set();
  const _evaluationFieldsByTerm = {};

  for (let season of seasons) {
    if (season.subjects?.label.length > 0) {
      for (let lb of season.subjects?.label) _subjectLabels.add(lb);
      _subjectLabelsBySeason[season._id] = season.subjects?.label || [];
    }

    if (!(season.term in _evaluationFieldsByTerm))
      _evaluationFieldsByTerm[season.term] = new Set();

    for (let ev of season.formEvaluation) {
      if (ev.combineBy === "year") {
        _evaluationFieldsByYear.add(
          JSON.stringify({ label: ev.label, type: ev.type })
        );
      } else {
        _evaluationFieldsByTerm[season.term].add(
          JSON.stringify({ label: ev.label, type: ev.type })
        );
      }
    }
  }
  for (let key in _evaluationFieldsByTerm) {
    _evaluationFieldsByTerm[key] = Array.from(
      _evaluationFieldsByTerm[key],
      JSON.parse
    );
  }

  return {
    _id: school._id,
    schoolId: school.schoolId,
    schoolName: school.schoolName,
    dataArchive: school.formArchive,
    dataEvaluation: {
      subjectLabels: Array.from(_subjectLabels),
      subjectlabelsBySeason: _subjectLabelsBySeason,
      evaluationFieldsByYear: Array.from(_evaluationFieldsByYear, JSON.parse),
      evaluationFieldsByTerm: _evaluationFieldsByTerm,
      terms: _.sortBy(Object.keys(_evaluationFieldsByTerm)),
    },
  };
};

module.exports.findData = async (req, res) => {
  try {
    if (!("school" in req.query))
      return res
        .status(401)
        .send({ message: "school(sid) is required in query" });

    const school = await School(req.user.academyId).findById(req.query.school);
    if (!school) return res.status(404).send({ message: "school not found" });

    const documentData = await findDataOfSchool(req.user.academyId, school);
    return res.status(200).send(documentData);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
