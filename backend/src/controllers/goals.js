/**
 * Goals API — display settings + own archive counts (session user only)
 */

import { logger } from "../log/logger.js";
import { getGoalsForUser } from "../services/goals.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * GET /goals/me?school=&season=
 */
export const findMe = async (req, res) => {
  try {
    if (!("school" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    const result = await getGoalsForUser(
      req.user.academyId,
      req.user,
      req.query.school,
      req.query.season || null
    );

    return res.status(200).send(result);
  } catch (err) {
    logger.error(err.message);
    if (err.status === 404) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }
    if (err.status === 403) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
