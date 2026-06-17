/**
 * ActivityAPI namespace
 * @namespace APIs.ActivityAPI
 */
import { logger } from "../log/logger.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import {
  Activity,
  ActivitySubmission,
  AltForm,
  AltSheetRow,
  Board,
  Syllabus,
} from "../models/index.js";
import {
  ActivityService,
  ActivityTemplateService,
  convertTemplateFields,
} from "../services/activities.js";
import { ActivitySubmissionService } from "../services/activitySubmissions.js";

const activityServiceFactory = (academyId) => new ActivityService(academyId);
const submissionServiceFactory = (academyId) =>
  new ActivitySubmissionService(academyId);

export const create = async (req, res) => {
  try {
    for (let field of ["syllabus", "title", "type"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const user = req.user;
    const syllabus = await Syllabus(user.academyId).findById(req.body.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    const activityService = activityServiceFactory(user.academyId);
    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { allowed } = await activityService.checkActivityPermission(
      user,
      syllabus
    );
    if (!allowed) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const template = {
      type: req.body.type,
      preset: {
        content: req.body.content,
        altFormSchema: req.body.altFormSchema || [],
        rubric: req.body.rubric || [],
      },
    };

    const activity = await activityService.createFromTemplate({
      syllabus,
      template,
      title: req.body.title,
      dueAt: req.body.dueAt,
      openAt: req.body.openAt,
      content: req.body.content,
      user,
    });

    return res.status(200).send({ activity });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    const user = req.user;

    if (req.params._id) {
      const activity = await Activity(user.academyId).findById(req.params._id);
      if (!activity) {
        return res.status(404).send({ message: __NOT_FOUND("activity") });
      }
      return res.status(200).send({ activity });
    }

    const query = {};
    if (req.query.syllabus) query.syllabus = req.query.syllabus;
    if (req.query.season) query.season = req.query.season;
    if (req.query.status) query.status = req.query.status;

    const activities = await Activity(user.academyId)
      .find(query)
      .sort({ order: 1, createdAt: -1 });

    return res.status(200).send({ activities });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(user.academyId).findById(activity.syllabus);
    const activityService = activityServiceFactory(user.academyId);

    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const updatable = [
      "title",
      "content",
      "attachments",
      "rubric",
      "dueAt",
      "openAt",
      "allowLateSubmission",
      "allowResubmit",
      "evaluationMode",
      "order",
    ];
    for (let field of updatable) {
      if (field in req.body) activity[field] = req.body[field];
    }
    await activity.save();

    if (activity.altForm) {
      const settings = {};
      if ("dueAt" in req.body) settings.closeAt = req.body.dueAt;
      if ("openAt" in req.body) settings.openAt = req.body.openAt;
      if ("allowResubmit" in req.body)
        settings.allowResubmit = req.body.allowResubmit;
      if ("altFormSchema" in req.body) {
        await AltForm(user.academyId).findByIdAndUpdate(activity.altForm, {
          fields: convertTemplateFields(req.body.altFormSchema),
          ...(Object.keys(settings).length ? { settings } : {}),
        });
      } else if (Object.keys(settings).length) {
        await AltForm(user.academyId).findByIdAndUpdate(activity.altForm, {
          settings,
        });
      }
    }

    const board = activity.altBoard
      ? await Board(user.academyId).findById(activity.altBoard)
      : null;
    if (board) await activityService.syncActivityCalendar(activity, board);

    return res.status(200).send({ activity });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(user.academyId).findById(activity.syllabus);
    const activityService = activityServiceFactory(user.academyId);

    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await activityService.remove(activity);
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const publish = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(user.academyId).findById(activity.syllabus);
    const activityService = activityServiceFactory(user.academyId);

    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const published = await activityService.publish(activity);
    return res.status(200).send({ activity: published });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const close = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(user.academyId).findById(activity.syllabus);
    const activityService = activityServiceFactory(user.academyId);

    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const closed = await activityService.close(activity);
    return res.status(200).send({ activity: closed });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const findSubmissions = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const submissionService = submissionServiceFactory(user.academyId);
    const submissions = await ActivitySubmission(user.academyId)
      .find({ activity: activity._id })
      .sort({ studentName: 1 });

    const altForm = activity.altForm
      ? await AltForm(user.academyId).findById(activity.altForm)
      : null;

    const result = await Promise.all(
      submissions.map(async (s) => {
        let altSheetRowData = null;
        if (s.altSheetRow) {
          const row = await AltSheetRow(user.academyId).findById(s.altSheetRow);
          altSheetRowData = row
            ? {
                ...row.toObject(),
                data: submissionService.serializeRowData(row),
              }
            : null;
        }
        return { ...s.toObject(), altSheetRowData, altForm };
      })
    );

    return res.status(200).send({ submissions: result });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const findMySubmission = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const submissionService = submissionServiceFactory(user.academyId);
    const { allowed, enrollment } = await submissionService.checkStudentAccess(
      user,
      activity
    );

    if (!allowed) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const submission = await submissionService.getOrCreateSubmission(
      activity,
      enrollment
    );

    let altSheetRow = null;
    let altForm = null;
    if (submission.altSheetRow) {
      const row = await AltSheetRow(user.academyId).findById(
        submission.altSheetRow
      );
      altSheetRow = row
        ? { ...row.toObject(), data: submissionService.serializeRowData(row) }
        : null;
    }
    if (activity.altForm) {
      altForm = await AltForm(user.academyId).findById(activity.altForm);
    }

    return res.status(200).send({ submission, altSheetRow, altForm, activity });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const submitActivity = async (req, res) => {
  try {
    if (!("data" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("data") });
    }

    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const submissionService = submissionServiceFactory(user.academyId);
    const { allowed, enrollment } = await submissionService.checkStudentAccess(
      user,
      activity
    );

    if (!allowed) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const result = await submissionService.submit({
      activity,
      enrollment,
      data: req.body.data,
      user,
    });

    return res.status(200).send({
      submission: result.submission,
      altSheetRow: {
        ...result.altSheetRow.toObject(),
        data: submissionService.serializeRowData(result.altSheetRow),
      },
      altForm: result.form,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const saveDraft = async (req, res) => {
  try {
    if (!("data" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("data") });
    }

    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const submissionService = submissionServiceFactory(user.academyId);
    const { allowed, enrollment } = await submissionService.checkStudentAccess(
      user,
      activity
    );

    if (!allowed) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const result = await submissionService.saveDraft({
      activity,
      enrollment,
      data: req.body.data,
      user,
    });

    return res.status(200).send({
      submission: result.submission,
      altSheetRow: {
        ...result.altSheetRow.toObject(),
        data: submissionService.serializeRowData(result.altSheetRow),
      },
      altForm: result.form,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const addFeedback = async (req, res) => {
  try {
    if (!("content" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }

    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(user.academyId).findById(activity.syllabus);
    const activityService = activityServiceFactory(user.academyId);

    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const submission = await ActivitySubmission(user.academyId).findById(
      req.params.submissionId
    );
    if (
      !submission ||
      submission.activity.toString() !== activity._id.toString()
    ) {
      return res.status(404).send({ message: __NOT_FOUND("submission") });
    }

    const submissionService = submissionServiceFactory(user.academyId);
    const updated = await submissionService.addFeedback({
      submission,
      content: req.body.content,
      user,
    });

    return res.status(200).send({ submission: updated });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const completeSubmission = async (req, res) => {
  try {
    const user = req.user;
    const activity = await Activity(user.academyId).findById(req.params._id);
    if (!activity) {
      return res.status(404).send({ message: __NOT_FOUND("activity") });
    }

    const syllabus = await Syllabus(user.academyId).findById(activity.syllabus);
    const activityService = activityServiceFactory(user.academyId);

    if (!activityService.isMentorOfSyllabus(syllabus, user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const submission = await ActivitySubmission(user.academyId).findById(
      req.params.submissionId
    );
    if (!submission) {
      return res.status(404).send({ message: __NOT_FOUND("submission") });
    }

    const submissionService = submissionServiceFactory(user.academyId);
    const updated = await submissionService.complete(submission);

    return res.status(200).send({ submission: updated });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export { ActivityTemplateService, ActivityService };
