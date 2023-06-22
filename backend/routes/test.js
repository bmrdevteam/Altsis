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
import { __NOT_FOUND } from "../messages/index.js";

const academyId = "garisan";

router.get("/enrollments/:_id", async (req, res) => {
  try {
    const enrollment = await Enrollment(academyId).findById(req.params._id);

    return res.status(200).send({
      enrollment,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

router.get("/enrollments", async (req, res) => {
  try {
    const enrollments = await Enrollment(academyId).find({
      "teachers.userName": "조은길",
    });

    const enrollmentsToUpdate = [];
    let cnt = 0;

    for (let enrollment of enrollments) {
      if (
        enrollment.evaluation &&
        "멘토평가" in enrollment.evaluation &&
        enrollment.evaluation["멘토평가"].match("<br />")
      ) {
        enrollmentsToUpdate.push(enrollment);
        cnt += 1;
        if (cnt === 5) {
          break;
        }
      }
    }

    return res.status(200).send({
      enrollmentsToUpdate,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

/* ! MAKE SURE TO PERFORM A BACKUP BEFORE RUNNING THIS OPERATION ! */
router.put("/enrollments", async (req, res) => {
  try {
    const startTime = new Date().getTime();
    console.log("REMOVING <br /> TAGS IN EVALUATIONS IS STARTED");

    /* use cursor to find all enrollments */
    const cursor = Enrollment(academyId).find().batchSize(1000).cursor();
    if (!cursor) {
      return res.status(409).send({ message: __NOT_FOUND("cursor") });
    }

    const enrollmentsToUpdate = [];
    let cntTotal = 0;
    let cntUpdates = 0;
    for await (const enrollment of cursor) {
      /* find enrollments contains <br/> tag in evaluation */
      if (enrollment.evaluation) {
        let isUpdated = false;
        if (
          "멘토평가" in enrollment.evaluation &&
          enrollment.evaluation["멘토평가"].match("<br />")
        ) {
          enrollment.evaluation = {
            ...enrollment.evaluation,
            멘토평가: enrollment.evaluation["멘토평가"].replace(
              /<br\s*\/?>/g,
              ""
            ),
          };
          isUpdated = true;
        }
        if (
          "자기평가" in enrollment.evaluation &&
          enrollment.evaluation["자기평가"].match("<br />")
        ) {
          enrollment.evaluation = {
            ...enrollment.evaluation,
            자기평가: enrollment.evaluation["자기평가"].replace(
              /<br\s*\/?>/g,
              ""
            ),
          };
          isUpdated = true;
        }
        if (isUpdated) {
          enrollment.isModified("evaluation");
          enrollmentsToUpdate.push(enrollment);
          cntUpdates += 1;
        }

        cntTotal += 1;
        console.log(`checking enrollments... ${cntTotal}`);
      }
    }

    console.log(
      `${cntUpdates} out of ${cntTotal} enrollments are ready to be update... `
    );

    /* update all */
    await Promise.all(
      enrollmentsToUpdate.map((enrollment) => enrollment.save())
    );
    console.log(`${cntUpdates} enrollments are updated`);

    const endTime = new Date().getTime();
    console.log("REMOVING <br /> TAGS IN EVALUATIONS IS FINISHED");

    return res.status(200).send({
      total: cntTotal,
      updated: cntUpdates,
      took: `${endTime - startTime}ms`,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

export { router };
