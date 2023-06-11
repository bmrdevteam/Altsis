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

router.put("/", async (req, res) => {
  try {
    return res.status(200).send({ academies, message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

export { router };
