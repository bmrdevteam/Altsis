import { logger } from "../log/logger.js";
import { Enrollment, Syllabus } from "../models/index.js";
import _ from "lodash";

export const find = async (req, res) => {
  try {
    const { season, user } = req.query;
    if (!season || !user) return res.status(400).send();

    // find enrollments
    const enrolled = await Enrollment(req.user.academyId).find({
      season,
      student: user,
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
      user,
    });

    // find mentoring syllabuses
    const mentoring = await Syllabus(req.user.academyId).find({
      season,
      "teachers._id": user,
    });

    return res.status(200).send({ courses: { enrolled, created, mentoring } });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
