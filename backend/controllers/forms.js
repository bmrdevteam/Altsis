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

export const find = async (req, res) => {
  try {
    if (req.params._id) {
      const form = await Form(req.user.academyId).findById(req.params._id);
      return res.status(200).send(form);
    }
    const forms = await Form(req.user.academyId)
      .find(req.query)
      .select("-data");
    return res.status(200).send({ forms });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const update = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) return res.status(404).send({ message: "form not found" });

    //const fields = ["type", "title", "contents"]; // temp-1.1: form의 data가 object type인 경우
    const fields = ["type", "title", "data", "archived"]; // temp1-2. form의 data가 Array type인 경우

    if (req.params.field) {
      if (fields.includes(req.params.field)) {
        form[req.params.field] = req.body.new;
      } else {
        return res.status(400).send({
          message: `field '${req.params.field}' does not exist or cannot be updated`,
        });
      }
    } else {
      fields.forEach((field) => {
        form[field] = req.body.new[field];
      });
    }

    await form.save();
    return res.status(200).send(form);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const remove = async (req, res) => {
  try {
    const form = await Form(req.user.academyId).findById(req.params._id);
    if (!form) return res.status(404).send();
    await form.remove();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
