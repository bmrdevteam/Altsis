/**
 * Teacher routines for Alter agent mode.
 */

import { logger } from "../log/logger.js";
import { toPublicAlterError } from "../alter/core/errors.js";
import {
  beginManualRun,
  confirmProposal,
  createScheduleForUser,
  deleteScheduleForUser,
  findOwnedSchedule,
  listSchedulesForUser,
  setScheduleEnabled,
  updateScheduleForUser,
} from "../services/alterScheduleService.js";
import { executeClaimedSchedule } from "../services/alterScheduleRunner.js";

const sendError = (res, err) => {
  const pub = toPublicAlterError(err);
  if (pub.status >= 500) logger.error(err.message);
  return res.status(pub.status).send({ code: pub.code, message: pub.message });
};

const seasonOf = (req) =>
  req.body?.season || req.body?.seasonId || req.query?.season;

export const list = async (req, res) => {
  try {
    const schedules = await listSchedulesForUser(
      req.user.academyId,
      req.user,
      seasonOf(req)
    );
    return res.status(200).send({ schedules });
  } catch (err) {
    return sendError(res, err);
  }
};

export const create = async (req, res) => {
  try {
    const schedule = await createScheduleForUser(
      req.user.academyId,
      req.user,
      req.body || {},
      "settings"
    );
    return res.status(200).send({ schedule });
  } catch (err) {
    return sendError(res, err);
  }
};

export const update = async (req, res) => {
  try {
    const body = req.body || {};
    const schedule =
      body.title == null &&
      body.prompt == null &&
      body.schedule == null &&
      body.timezone == null &&
      typeof body.enabled === "boolean"
        ? await setScheduleEnabled(
            req.user.academyId,
            req.user,
            req.params.id,
            body.enabled
          )
        : await updateScheduleForUser(
            req.user.academyId,
            req.user,
            req.params.id,
            body
          );
    return res.status(200).send({ schedule });
  } catch (err) {
    return sendError(res, err);
  }
};

export const remove = async (req, res) => {
  try {
    const result = await deleteScheduleForUser(
      req.user.academyId,
      req.user,
      req.params.id
    );
    return res.status(200).send(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const confirm = async (req, res) => {
  try {
    const schedule = await confirmProposal(
      req.user.academyId,
      req.user,
      req.body || {}
    );
    return res.status(200).send({ schedule, saved: true });
  } catch (err) {
    return sendError(res, err);
  }
};

export const runNow = async (req, res) => {
  try {
    const doc = await beginManualRun(
      req.user.academyId,
      req.user,
      req.params.id,
      seasonOf(req)
    );
    const preserveFutureSlot =
      doc.nextRunAt && new Date(doc.nextRunAt).getTime() > Date.now();
    await executeClaimedSchedule({
      academyId: req.user.academyId,
      doc,
      preserveFutureSlot,
    });
    const schedule = await findOwnedSchedule(
      req.user.academyId,
      req.user,
      req.params.id
    );
    return res.status(200).send({
      schedule: schedule.toObject ? schedule.toObject() : schedule,
    });
  } catch (err) {
    return sendError(res, err);
  }
};
