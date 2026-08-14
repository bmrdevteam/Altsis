import { Academy } from "../models/index.js";
import { assertShiftEnabled, sendPlanError } from "../services/entitlement.js";

/**
 * Middleware to check if chat is enabled for the user's academy
 * Must be used after isLoggedIn middleware
 */
export const isChatEnabled = async (req, res, next) => {
  try {
    if (!req.user || !req.user.academyId) {
      return res.status(403).send({ message: "PERMISSION_DENIED" });
    }

    const academy = await Academy.findOne({ academyId: req.user.academyId });
    if (!academy) {
      return res.status(404).send({ message: "ACADEMY_NOT_FOUND" });
    }

    if (!academy.chatEnabled) {
      return res.status(403).send({ message: "CHAT_NOT_ENABLED" });
    }

    try {
      assertShiftEnabled(academy);
    } catch (err) {
      if (sendPlanError(res, err)) return;
      throw err;
    }

    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
