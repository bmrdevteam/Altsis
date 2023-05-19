import { logger } from "../log/logger.js";
import express from "express";
const router = express.Router();
import * as test from "../controllers/test.js";
import { Academy } from "../models/Academy.js";
import { Season } from "../models/Season.js";
import { Registration } from "../models/Registration.js";
import { Enrollment } from "../models/Enrollment.js";
import { Syllabus } from "../models/Syllabus.js";

router.get("/clean", async (req, res) => {
  try {
    await Enrollment("garisan").deleteMany({});
    await Syllabus("garisan").updateMany({}, { count: 0 });

    return res.status(200).send({ message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

/* update registrations by seasons */
router.get("/formEvaluation", async (req, res) => {
  try {
    const academies = await Academy.find({ academyId: { $ne: "root" } });
    for (let academy of academies) {
      const academyId = academy.academyId;

      const seasons = await Season(academyId).find({});
      for (let season of seasons) {
        season.formEvaluation = [...(season?.formEvaluation ?? [])];
        await season.save();

        await Registration(academyId).updateMany(
          {
            season: season._id,
          },
          {
            formEvaluation: season.formEvaluation,
          }
        );
      }
    }
    return res.status(200).send({ academies, message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

/* update registrations by seasons */
router.get("/registrations", async (req, res) => {
  try {
    const academies = await Academy.find({ academyId: { $ne: "root" } });
    for (let academy of academies) {
      const academyId = academy.academyId;

      const seasons = await Season(academyId).find({});
      for (let season of seasons) {
        const registrations = await Registration(academyId).find({
          season: season._id,
        });

        for (let registration of registrations) {
          if (registration.role === "teacher") {
            registration.permissionSyllabusV2 =
              season.permissionSyllabusV2.teacher;
            registration.permissionEnrollmentV2 =
              season.permissionEnrollmentV2.teacher;
            registration.permissionEvaluationV2 =
              season.permissionEvaluationV2.teacher;
          } else if (registration.role === "student") {
            registration.permissionSyllabusV2 =
              season.permissionSyllabusV2.student;
            registration.permissionEnrollmentV2 =
              season.permissionEnrollmentV2.student;
            registration.permissionEvaluationV2 =
              season.permissionEvaluationV2.student;
          }
        }

        await Promise.all(registrations.map((reg) => reg.save()));
      }
    }
    return res.status(200).send({ academies, message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

export { router };
