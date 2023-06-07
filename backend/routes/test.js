import { logger } from "../log/logger.js";
import express from "express";
const router = express.Router();
import * as test from "../controllers/test.js";
import { Academy } from "../models/Academy.js";
import { Season } from "../models/Season.js";
import { Registration } from "../models/Registration.js";
import { Enrollment } from "../models/Enrollment.js";
import { Syllabus } from "../models/Syllabus.js";
import { Notification } from "../models/Notification.js";
import { UTC1 } from "../utils/date.js";

/* After v1.8.3 */

/**
 * update seasons and registrations
 *
 * seasons - remove fields permission*, update field formEvaluation
 * registrations - update field formEvaluation
 */
router.put("/seasons", async (req, res) => {
  try {
    const academies = await Academy.find({ academyId: { $ne: "root" } });
    for (let academy of academies) {
      const academyId = academy.academyId;
      const seasons = await Season(academyId).find({});
      await Promise.all(
        seasons.map((season) => {
          season.permissionSyllabus = undefined;
          season.permissionEnrollment = undefined;
          season.permissionEvaluation = undefined;
          season.isModified("permissionSyllabus");
          season.isModified("permissionEnrollment");
          season.isModified("permissionEvaluation");

          for (let i = 0; i < season.formEvaluation.length; i++) {
            season.formEvaluation[i] = {
              label: season.formEvaluation[i].label,
              type: season.formEvaluation[i].type,
              options: season.formEvaluation[i].options,
              combineBy: season.formEvaluation[i].combineBy,
              authOption: season.formEvaluation[i].authOption,
              auth: season.formEvaluation[i].auth,
            };
          }
          season.isModified("formEvaluation");
          return season.save();
        })
      );

      await Promise.all(
        seasons.map((season) =>
          Registration(academyId).updateMany(
            { season: season._id },
            {
              formEvaluation: season.formEvaluation,
            }
          )
        )
      );
    }
    return res.status(200).send({ academies, message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

router.get("/seasons", async (req, res) => {
  try {
    if (!("academyId" in req.query)) {
      return res.status(400).send({});
    }
    const academy = await Academy.findOne({ academyId: req.query.academyId });
    const academyId = academy.academyId;

    const seasons = await Season(academyId).find({});

    const registrations = await Registration(academyId).find({
      season: seasons[0]._id,
    });

    return res
      .status(200)
      .send({ seasons, registrations, message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

export { router };
