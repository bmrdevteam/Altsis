import { logger } from "../log/logger.js";
import express from "express";
const router = express.Router();
import { isAdmin } from "../middleware/auth.js";

router.get("/", isAdmin, async (req, res) => {
  try {
    return res.status(200).send({
      message: "ok",
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send();
  }
});

export { router };
