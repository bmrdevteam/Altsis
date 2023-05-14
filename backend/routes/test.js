import { logger } from "../log/logger.js";
import express from "express";
const router = express.Router();
import * as test from "../controllers/test.js";

router.get("/", async (req, res) => {
  try {
    return res.status(200).send({ message: "hello world! /v2" });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
});

export { router };
