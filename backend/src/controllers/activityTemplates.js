/**
 * ActivityTemplateAPI namespace
 * @namespace APIs.ActivityTemplateAPI
 */
import { logger } from "../log/logger.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { ActivityTemplate, Syllabus } from "../models/index.js";
import {
  ActivityService,
  ActivityTemplateService,
} from "../services/activities.js";

export const create = async (req, res) => {
  try {
    for (let field of ["name", "type", "scope"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const user = req.user;
    const template = await ActivityTemplate(user.academyId).create({
      scope: req.body.scope,
      school: req.body.school,
      schoolId: req.body.schoolId,
      schoolName: req.body.schoolName,
      name: req.body.name,
      type: req.body.type,
      description: req.body.description ?? "",
      preset: req.body.preset ?? {},
      isEditable: true,
      user: user._id,
      userId: user.userId,
      userName: user.userName,
    });

    return res.status(200).send({ template });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    const user = req.user;
    const templateService = new ActivityTemplateService(user.academyId);

    if (req.params._id) {
      await templateService.list({ user });
      const template = await ActivityTemplate(user.academyId).findById(
        req.params._id
      );
      if (!template) {
        return res.status(404).send({ message: __NOT_FOUND("template") });
      }
      return res.status(200).send({ template });
    }

    const templates = await templateService.list({
      scope: req.query.scope,
      school: req.query.school,
      user,
    });

    return res.status(200).send({ templates });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const user = req.user;
    const template = await ActivityTemplate(user.academyId).findById(
      req.params._id
    );
    if (!template) {
      return res.status(404).send({ message: __NOT_FOUND("template") });
    }

    if (!template.isEditable && template.scope === "builtin") {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (
      template.scope === "personal" &&
      template.user?.toString() !== user._id.toString()
    ) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    for (let field of ["name", "description", "type", "preset"]) {
      if (field in req.body) template[field] = req.body[field];
    }

    await template.save();
    return res.status(200).send({ template });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const user = req.user;
    const template = await ActivityTemplate(user.academyId).findById(
      req.params._id
    );
    if (!template) {
      return res.status(404).send({ message: __NOT_FOUND("template") });
    }

    if (template.scope === "builtin") {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await template.remove();
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const duplicate = async (req, res) => {
  try {
    const user = req.user;
    const template = await ActivityTemplate(user.academyId).findById(
      req.params._id
    );
    if (!template) {
      return res.status(404).send({ message: __NOT_FOUND("template") });
    }

    const templateService = new ActivityTemplateService(user.academyId);
    const copy = await templateService.duplicate(template, user, {
      name: req.body.name,
      scope: req.body.scope ?? "personal",
      school: req.body.school,
    });

    return res.status(200).send({ template: copy });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: err.message });
  }
};

export const instantiate = async (req, res) => {
  try {
    for (let field of ["syllabus", "title"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const user = req.user;
    const template = await ActivityTemplate(user.academyId).findById(
      req.params._id
    );
    if (!template) {
      return res.status(404).send({ message: __NOT_FOUND("template") });
    }

    const syllabus = await Syllabus(user.academyId).findById(req.body.syllabus);
    if (!syllabus) {
      return res.status(404).send({ message: __NOT_FOUND("syllabus") });
    }

    const activityService = new ActivityService(user.academyId);
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
