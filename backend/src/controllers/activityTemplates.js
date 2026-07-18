/**
 * ActivityTemplateAPI namespace
 * @namespace APIs.ActivityTemplateAPI
 */
import { logger } from "../log/logger.js";
import { ActivityTemplate, Syllabus } from "../models/index.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import {
  assertActivityAccessPermission,
  buildDefaultTemplatePreset,
  canEditActivityTemplate,
  canReadActivityTemplate,
  cloneTemplatePreset,
  createActivityFromTemplate,
  listVisibleActivityTemplates,
} from "../services/activities.js";
import { initializeActivitySubmissionsForActivity } from "../services/activitySubmissions.js";

const sendError = (res, err) => {
  logger.error(err.message);
  return res
    .status(err.status || 500)
    .send({ message: err.message || "서버 오류가 발생했습니다." });
};

const resolveSyllabus = async (academyId, syllabusId) => {
  if (!syllabusId) return null;
  const syllabus = await Syllabus(academyId).findById(syllabusId);
  if (!syllabus) {
    throw Object.assign(new Error(__NOT_FOUND("syllabus")), { status: 404 });
  }
  return syllabus;
};

export const create = async (req, res) => {
  try {
    for (const field of ["name", "type"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }
    if (typeof req.body.name !== "string" || !req.body.name.trim()) {
      return res.status(400).send({ message: FIELD_REQUIRED("name") });
    }
    req.body.name = req.body.name.trim();

    if (!["assignment", "quiz", "discussion"].includes(req.body.type)) {
      return res.status(400).send({ message: FIELD_INVALID("type") });
    }

    const scope = req.body.scope || "personal";
    if (!["personal", "school"].includes(scope)) {
      return res.status(400).send({ message: FIELD_INVALID("scope") });
    }

    let syllabus = null;
    if (req.body.syllabus) {
      syllabus = await resolveSyllabus(req.user.academyId, req.body.syllabus);
      await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
        manageOnly: true,
      });
    } else if (req.user.auth !== "admin" && req.user.auth !== "manager") {
      return res.status(400).send({ message: FIELD_REQUIRED("syllabus") });
    }

    const preset = cloneTemplatePreset(
      req.body.preset || buildDefaultTemplatePreset(req.body.type),
      false
    );

    const template = await ActivityTemplate(req.user.academyId).create({
      scope,
      school: syllabus?.school || req.body.school,
      schoolId: syllabus?.schoolId,
      schoolName: syllabus?.schoolName,
      creator: req.user._id,
      creatorId: req.user.userId,
      creatorName: req.user.userName,
      type: req.body.type,
      name: req.body.name,
      preset,
      isEditable: true,
    });

    return res.status(200).send({ template });
  } catch (err) {
    return sendError(res, err);
  }
};

export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const template = await ActivityTemplate(req.user.academyId).findById(req.params._id);
      if (!template || !template.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("activityTemplate") });
      }

      const syllabus = await resolveSyllabus(req.user.academyId, req.query.syllabus);
      const school = syllabus?.school || req.query.school;
      if (!canReadActivityTemplate(template, req.user, school)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }

      return res.status(200).send({ template });
    }

    const syllabus = await resolveSyllabus(req.user.academyId, req.query.syllabus);
    const school = syllabus?.school || req.query.school;
    const templates = await listVisibleActivityTemplates({
      academyId: req.user.academyId,
      user: req.user,
      school,
      type: req.query.type,
      scope: req.query.scope,
    });

    return res.status(200).send({ templates });
  } catch (err) {
    return sendError(res, err);
  }
};

export const update = async (req, res) => {
  try {
    const template = await ActivityTemplate(req.user.academyId).findById(req.params._id);
    if (!template || !template.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activityTemplate") });
    }

    if (!canEditActivityTemplate(template, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if ("type" in req.body) {
      if (!["assignment", "quiz", "discussion"].includes(req.body.type)) {
        return res.status(400).send({ message: FIELD_INVALID("type") });
      }
      template.type = req.body.type;
    }
    if ("name" in req.body) {
      if (typeof req.body.name !== "string" || !req.body.name.trim()) {
        return res.status(400).send({ message: FIELD_REQUIRED("name") });
      }
      template.name = req.body.name.trim();
    }
    if ("preset" in req.body) {
      template.preset = cloneTemplatePreset(req.body.preset, false);
      template.markModified("preset");
    }

    await template.save();
    return res.status(200).send({ template });
  } catch (err) {
    return sendError(res, err);
  }
};

export const remove = async (req, res) => {
  try {
    const template = await ActivityTemplate(req.user.academyId).findById(req.params._id);
    if (!template || !template.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activityTemplate") });
    }

    if (!canEditActivityTemplate(template, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    template.isActive = false;
    await template.save();
    return res.status(200).send();
  } catch (err) {
    return sendError(res, err);
  }
};

export const duplicate = async (req, res) => {
  try {
    const template = await ActivityTemplate(req.user.academyId).findById(req.params._id);
    if (!template || !template.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activityTemplate") });
    }

    const syllabus = await resolveSyllabus(req.user.academyId, req.body.syllabus);
    const isStaff = req.user.auth === "admin" || req.user.auth === "manager";
    if (!syllabus && template.scope === "school" && !isStaff) {
      return res.status(400).send({ message: FIELD_REQUIRED("syllabus") });
    }
    const school = syllabus?.school || (isStaff ? template.school : undefined);
    if (!canReadActivityTemplate(template, req.user, school)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const duplicatedTemplate = await ActivityTemplate(req.user.academyId).create({
      scope: "personal",
      school:
        syllabus?.school || (template.scope === "school" ? template.school : undefined),
      schoolId:
        syllabus?.schoolId ||
        (template.scope === "school" ? template.schoolId : undefined),
      schoolName:
        syllabus?.schoolName ||
        (template.scope === "school" ? template.schoolName : undefined),
      creator: req.user._id,
      creatorId: req.user.userId,
      creatorName: req.user.userName,
      type: template.type,
      name: `${template.name} (복사)`,
      preset: cloneTemplatePreset(template.preset, false),
      isEditable: true,
    });

    return res.status(200).send({ template: duplicatedTemplate });
  } catch (err) {
    return sendError(res, err);
  }
};

export const instantiate = async (req, res) => {
  try {
    for (const field of ["syllabus"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const template = await ActivityTemplate(req.user.academyId).findById(req.params._id);
    if (!template || !template.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("activityTemplate") });
    }

    const syllabus = await resolveSyllabus(req.user.academyId, req.body.syllabus);
    if (!canReadActivityTemplate(template, req.user, syllabus.school)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await assertActivityAccessPermission(req.user.academyId, syllabus, req.user, {
      manageOnly: true,
    });

    const { activity, form, sheet, board } = await createActivityFromTemplate({
      academyId: req.user.academyId,
      user: req.user,
      syllabus,
      template,
      payload: {
        ...req.body,
        title: req.body.title || template.name,
        type: req.body.type || template.type,
      },
    });
    await initializeActivitySubmissionsForActivity(req.user.academyId, activity);

    return res.status(200).send({ activity, form, sheet, board });
  } catch (err) {
    return sendError(res, err);
  }
};
