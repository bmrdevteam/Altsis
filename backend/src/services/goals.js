/**
 * Goals — role display settings + archive/board progress.
 * Course summaries are computed on the frontend to match List UIs.
 */

import {
  Archive,
  Registration,
  School,
} from "../models/index.js";
import {
  isItemEnabled,
  mergeGoalDisplay,
} from "../constants/defaultGoalDisplay.js";
import {
  archiveLabelCount,
  ownArchiveLabels,
} from "../utils/goalArchiveCounts.js";
import { listRequiredFormProgress } from "../utils/requiredFormProgress.js";
import { loadAccessibleAltBoardFormsContext } from "./schoolTodos.js";

export { archiveLabelCount, ownArchiveLabels };

/**
 * GET /goals/me payload
 */
export const getGoalsForUser = async (
  academyId,
  user,
  schoolId,
  seasonId = null
) => {
  const school = await School(academyId).findById(schoolId).lean();
  if (!school) {
    const err = new Error("school not found");
    err.status = 404;
    throw err;
  }
  if (school.goalsEnabled === false) {
    const err = new Error("goals disabled");
    err.status = 403;
    throw err;
  }

  let role = "student";
  if (seasonId) {
    const reg = await Registration(academyId)
      .findOne({
        user: user._id,
        school: school._id,
        season: seasonId,
      })
      .lean();
    if (reg?.role) role = reg.role;
  } else {
    const reg = await Registration(academyId)
      .findOne({ user: user._id, school: school._id })
      .sort({ createdAt: -1 })
      .lean();
    if (reg?.role) role = reg.role;
  }

  const displayAll = mergeGoalDisplay(school.goalDisplay);
  const display =
    role === "teacher" ? displayAll.teacher : displayAll.student;

  let archive = undefined;
  if (display.archive) {
    const itemsMap = display.items || {};
    const labels = ownArchiveLabels(school.formArchive).filter((item) =>
      isItemEnabled(itemsMap, `archive:${item.label}`)
    );
    const doc = await Archive(academyId)
      .findOne({ school: school._id, user: user._id })
      .lean();
    const data = doc?.data || {};
    archive = labels.map((item) => ({
      label: item.label,
      count: archiveLabelCount(data, item.label, item.dataType),
      dataType: item.dataType || "object",
    }));
  }

  let board = undefined;
  if (display.board && school.boardEnabled !== false) {
    const ctx = await loadAccessibleAltBoardFormsContext(
      academyId,
      school,
      user,
      seasonId
    );
    if (ctx) {
      const progress = listRequiredFormProgress({
        boards: ctx.boards,
        forms: ctx.forms,
        myRows: ctx.myRows,
        user,
      });
      board = {
        submitted: progress.submitted,
        total: progress.total,
        forms: progress.forms,
      };
    } else {
      board = { submitted: 0, total: 0, forms: [] };
    }
  }

  return {
    role,
    display,
    ...(archive !== undefined ? { archive } : {}),
    ...(board !== undefined ? { board } : {}),
  };
};
