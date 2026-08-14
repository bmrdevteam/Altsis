import { Academy, Board, School } from "../models/index.js";
import { assertShiftEnabled, sendPlanError } from "../services/entitlement.js";

/**
 * Middleware to check if board feature is enabled for the user's academy and school
 * Must be used after isLoggedIn middleware
 *
 * For routes with board ID (GET/PUT/DELETE /:_id), checks via board's school
 * For list route (GET / with query.school), checks via query school
 * For create route (POST / with body.school), checks via body school
 */
export const isBoardEnabled = async (req, res, next) => {
  try {
    if (!req.user || !req.user.academyId) {
      return res.status(403).send({ message: "PERMISSION_DENIED" });
    }

    // Check academy-level
    const academy = await Academy.findOne({ academyId: req.user.academyId });
    if (!academy) {
      return res.status(404).send({ message: "ACADEMY_NOT_FOUND" });
    }

    if (!academy.boardEnabled) {
      return res.status(403).send({ message: "BOARD_NOT_ENABLED" });
    }

    try {
      assertShiftEnabled(academy);
    } catch (err) {
      if (sendPlanError(res, err)) return;
      throw err;
    }

    // Determine which school to check
    let schoolId = null;

    if (req.params._id) {
      // Route with board ID — look up board to get school
      const board = await Board(req.user.academyId).findById(req.params._id);
      if (board) {
        schoolId = board.school;
      }
    } else if (req.query?.school) {
      schoolId = req.query.school;
    } else if (req.body?.school) {
      schoolId = req.body.school;
    }

    // Check school-level if we have a school reference
    if (schoolId) {
      const school = await School(req.user.academyId).findById(schoolId);
      if (school && school.boardEnabled === false) {
        return res.status(403).send({ message: "BOARD_NOT_ENABLED" });
      }
    }

    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
