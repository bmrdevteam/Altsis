const { Enrollment, Syllabus } = require("../models");
const _ = require("lodash");

module.exports.find = async (req, res) => {
  try {
    const { season, userId } = req.query;
    if (!season || !userId) return res.status(400).send();

    // find enrollments
    const enrolled = await Enrollment(req.user.academyId).find({
      season,
      studentId: userId,
    });
    for (let enrollment of enrolled) {
      const cnt = await Enrollment(req.user.academyId).countDocuments({
        syllabus: enrollment.syllabus,
      });
      enrollment.count_limit = `${cnt}/${enrollment.limit}`;
    }

    // find created syllabuses
    const created = await Syllabus(req.user.academyId).find({
      season,
      userId,
    });

    // find mentoring syllabuses
    const mentoring = await Syllabus(req.user.academyId).find({
      season,
      "teachers.userId": userId,
    });

    for (let syl of [...created, ...mentoring]) {
      const cnt = await Enrollment(req.user.academyId).countDocuments({
        syllabus: syl._id,
      });
      syl.count_limit = `${cnt}/${syl.limit}`;
    }

    return res.status(200).send({ courses: { enrolled, created, mentoring } });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};
