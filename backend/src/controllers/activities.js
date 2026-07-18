/**
 * ActivityAPI namespace
 * @namespace APIs.ActivityAPI
 */
import { logger } from "../log/logger.js";
import { Activity, ActivitySubmission, ActivityTemplate, Syllabus } from "../models/index.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import {
  assertActivityScheduleOrThrow,
  assertActivityAccessPermission,
  canReadActivityTemplate,
  createActivityFromTemplate,
  softDeleteActivity,
  syncActivityCalendar,
  updateActivityWithAltForm,
} from "../services/activities.js";
import {
  addActivityFeedback,
  initializeActivitySubmissionsForActivity,
  syncActivitySubmissions,
  syncMyActivitySubmission,
  updateActivitySubmissionStatus,
} from "../services/activitySubmissions.js";

const sendError = (res, err) => {
  logger.error(err.message);
  return res
    .status(err.status || 500)
    .send({ message: err.message || "서버 오류가 발생했습니다." });
};

export const create = async (req, res) => {
  try {
    for (const field of ["syllabus", "title"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }
    if (typeof req.body.title !== "string" || !req.body.title.trim()) {
      return res.status(400).send({ message: FIELD_REQUIRED("title") });
    }
    req.body.title = req.body.title.trim();

    const syllabus = await Syllabus(req.user.academyId).findById(req.body.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });

    let template = null;
    if (req.body.template) {
      template = await ActivityTemplate(req.user.academyId).findById(req.body.template);
      if (!template || !template.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("activityTemplate") });
      }
      if (!canReadActivityTemplate(template, req.user, syllabus.school)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    const { activity, form, sheet, board } = await createActivityFromTemplate({
      academyId: req.user.academyId,
      user: req.user,
      syllabus,
      template,
      payload: req.body,
    });
    await initializeActivitySubmissionsForActivity(req.user.academyId, activity);

    return res.status(200).send({ activity, form, sheet, board });
  } catch (err) {
    return sendError(res, err);
  }
};

export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const activity = await Activity(req.user.academyId).findById(req.params._id);
      if (!activity || !activity.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("activity") });
      }
      const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
      if (!syllabus) {
        return res.status(404).send({ message: __NOT_FOUND("syllabus") });
      }
      const access = await assertActivityAccessPermission(
        req.user.academyId,
        syllabus,
        req.user
      );
      if (!access.isMentor && activity.status === "draft") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      return res.status(200).send({ activity });
    }

    if (!req.query.syllabus) {
      return res.status(400).send({ message: FIELD_REQUIRED("syllabus") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(req.query.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }
    const access = await assertActivityAccessPermission(
      req.user.academyId,
      syllabus,
      req.user
    );

    const query = {
      syllabus: req.query.syllabus,
      isActive: true,
    };
    if (req.query.status) {
      if (!access.isMentor && req.query.status === "draft") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      query.status = req.query.status;
    } else if (!access.isMentor) {
      query.status = { $ne: "draft" };
    }

    const activities = await Activity(req.user.academyId)
      .find(query)
      .sort({ order: 1, createdAt: 1 });

    return res.status(200).send({ activities });
  } catch (err) {
    return sendError(res, err);
  }
};

export const update = async (req, res) => {
  try {
    const activity = await Activity(req.user.academyId).findById(req.params._id);
    if (!activity || !activity.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });
    if ("title" in req.body) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).send({ message: FIELD_REQUIRED("title") });
      }
      req.body.title = req.body.title.trim();
    }

    const { activity: updatedActivity, becamePublished } =
      await updateActivityWithAltForm({
        academyId: req.user.academyId,
        activity,
        payload: req.body,
      });
    if (becamePublished) {
      await initializeActivitySubmissionsForActivity(
        req.user.academyId,
        updatedActivity
      );
    } else if (req.body.syncSubmissions) {
      await syncActivitySubmissions(req.user.academyId, updatedActivity);
    }

    return res.status(200).send({ activity: updatedActivity });
  } catch (err) {
    return sendError(res, err);
  }
};

export const publish = async (req, res) => {
  try {
    const activity = await Activity(req.user.academyId).findById(req.params._id);
    if (!activity || !activity.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });

    const publishOpenAt = activity.openAt || new Date();
    assertActivityScheduleOrThrow({
      openAt: publishOpenAt,
      dueAt: activity.dueAt,
    });
    activity.status = "published";
    activity.openAt = publishOpenAt;
    await activity.save();
    await syncActivityCalendar(req.user.academyId, activity);
    await initializeActivitySubmissionsForActivity(req.user.academyId, activity);

    return res.status(200).send({ activity });
  } catch (err) {
    return sendError(res, err);
  }
};

export const remove = async (req, res) => {
  try {
    const activity = await Activity(req.user.academyId).findById(req.params._id);
    if (!activity || !activity.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });

    await softDeleteActivity({ academyId: req.user.academyId, activity });
    await ActivitySubmission(req.user.academyId).updateMany(
      { activity: activity._id },
      { isActive: false }
    );

    return res.status(200).send();
  } catch (err) {
    return sendError(res, err);
  }
};

export const findSubmissions = async (req, res) => {
  try {
    const activity = await Activity(req.user.academyId).findById(req.params._id);
    if (!activity || !activity.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    if (req.query.mine === "true") {
      const access = await assertActivityAccessPermission(
        req.user.academyId,
        syllabus,
        req.user
      );
      if (!access.isMentor && activity.status === "draft") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      const submission = await syncMyActivitySubmission(
        req.user.academyId,
        activity,
        req.user
      );
      return res.status(200).send({ submission });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });
    const submissions = await syncActivitySubmissions(req.user.academyId, activity);
    return res.status(200).send({ submissions });
  } catch (err) {
    return sendError(res, err);
  }
};

export const addFeedback = async (req, res) => {
  try {
    if (!("message" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("message") });
    }

    const activity = await Activity(req.user.academyId).findById(req.params._id);
    if (!activity || !activity.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });

    const submission = await addActivityFeedback({
      academyId: req.user.academyId,
      activity,
      submissionId: req.params.submissionId,
      user: req.user,
      message: req.body.message,
      status: req.body.status,
    });

    return res.status(200).send({ submission });
  } catch (err) {
    return sendError(res, err);
  }
};

export const updateSubmissionStatus = async (req, res) => {
  try {
    const activity = await Activity(req.user.academyId).findById(req.params._id);
    if (!activity || !activity.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(req.user.academyId).findById(activity.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });

    const submission = await updateActivitySubmissionStatus({
      academyId: req.user.academyId,
      activity,
      submissionId: req.params.submissionId,
      status: req.body.status,
    });

    return res.status(200).send({ submission });
  } catch (err) {
    return sendError(res, err);
  }
};
