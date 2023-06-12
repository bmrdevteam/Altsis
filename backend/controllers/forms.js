/**
 * FormAPI namespace
 * @namespace APIs.FormAPI
 */
import { logger } from "../log/logger.js";
import {
  FIELD_IN_USE,
  FIELD_REQUIRED,
  __NOT_FOUND,
} from "../messages/index.js";
import { Form } from "../models/index.js";

/**
 * @memberof APIs.FormAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | FORM_NOT_FOUND | if form is not found  |
 */

/**
 * @memberof APIs.FormAPI
 * @function CForm API
 * @description 양식 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/forms"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.title
 * @param {string} req.body.type
 * @param {Object[]} req.body.data
 *
 * @param {Object} res
 * @param {Object} res.form - created form
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | TITLE_IN_USE | if title is duplicate
 *
 *
 */
export const create = async (req, res) => {
  try {
    for (let field of ["title", "type", "data"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (
      await Form(req.user.academyId).findOne({
        title: req.body.title,
        type: req.body.type,
      })
    ) {
      return res.status(409).send({
        message: FIELD_IN_USE("title"),
      });
    }

    const form = await Form(req.user.academyId).create({
      type: req.body.type,
      title: req.body.title,
      data: req.body.data,
      userId: req.user.userId,
      userName: req.user.userName,
    });
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function CCopyForm API
 * @description 양식 복사 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/forms/:_id/copy"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.form - copied form
 *
 *
 */
export const copy = async (req, res) => {
  try {
    const formToCopy = await Form(req.user.academyId).findById(req.params._id);
    if (!formToCopy) {
      return res.status(404).send({
        message: __NOT_FOUND("form"),
      });
    }

    /* create and save document */
    const form = await Form(req.user.academyId).create({
      type: formToCopy.type,
      title: `${formToCopy.title}의 사본`,
      data: formToCopy.data,
      userId: req.user.userId,
      userName: req.user.userName,
    });
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function RForms API
 * @description 양식 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/forms"} req.url
 *
 * @param {Object} req.query
 * @param {string?} req.query.type
 * @param {boolean?} req.query.archived
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 * @param {Object[]} res.forms
 *
 *
 */

/**
 * @memberof APIs.FormAPI
 * @function RForm API
 * @description 양식 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/forms/:_id"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 * @param {Object} res.form
 *
 *
 */
export const find = async (req, res) => {
  try {
    /* RForm */
    if (req.params._id) {
      const form = await Form(req.user.academyId).findById(req.params._id);
      if (!form) {
        return res.status(404).send({ message: __NOT_FOUND("form") });
      }
      return res.status(200).send({ form });
    }

    /* RForms */
    const query = {};
    if ("type" in req.query) {
      query["type"] = req.query.type;
    }
    if ("archived" in req.query) {
      query["archived"] = req.query.archived === "true";
    }

    const forms = await Form(req.user.academyId).find(query).select("-data");
    return res.status(200).send({ forms });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function UForm API
 * @description 양식 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/forms/:_id"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {string} req.body.title
 * @param {Object[]} req.body.data
 *
 * @param {Object} res
 * @param {Object} res.form - updated form
 *
 *
 */
export const update = async (req, res) => {
  try {
    for (let field of ["title", "data"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("field") });
    }

    form["title"] = req.body.title;
    form["data"] = req.body.data;
    await form.save();
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function UArchiveForm API
 * @description 양식 보관 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/forms/:_id/archive"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.form - updated form
 *
 *
 */
export const archive = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("field") });
    }

    form["archived"] = true;
    await form.save();
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function URestoreArchive API
 * @description 양식 복원 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/forms/:_id/restore"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.form - updated form
 *
 *
 */
export const restore = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("field") });
    }

    form["archived"] = false;
    await form.save();
    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FormAPI
 * @function DForm API
 * @description 양식 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/forms/:_id"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 *
 *
 */
export const remove = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }
    await form.remove();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
