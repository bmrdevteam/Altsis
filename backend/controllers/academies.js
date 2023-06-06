/**
 * AcademyAPI namespace
 * @namespace APIs.AcademyAPI
 */
import { logger } from "../log/logger.js";
import { addConnection, deleteConnection } from "../_database/mongodb/index.js";
import {
  User,
  Academy,
  School,
  Season,
  Form,
  Registration,
} from "../models/index.js";

import _ from "lodash";
import { validate } from "../utils/validate.js";
import {
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { generatePassword } from "../utils/password.js";

/**
 * @memberof APIs.AcademyAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | ACADEMY_NOT_FOUND | if academy is not found  |
 */

/**
 * @memberof APIs.AcademyAPI
 * @function CAcademy API
 * @description 아카데미 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/academies"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {string} req.body.academyId - "^[a-z|A-Z|0-9]{2,20}$"
 * @param {string} req.body.academyName - "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣| ]{2,20}$"
 * @param {string} req.body.adminId - "^[a-z|A-Z|0-9]{4,20}$"
 * @param {string} req.body.adminName - "^[a-z|A-Z|0-9|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]{2,20}$"
 * @param {string?} req.body.email - "@"
 * @param {string?} req.body.tel - "^[0-9]{3}-[0-9]{4}-[0-9]{4}$"
 *
 * @param {Object} res
 * @param {Object} res.academy - created academy
 * @param {Object} res.admin - created admin user (with password)
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | ACADEMYID_IN_USE | if parameter academyID is in use  |
 *
 */
export const create = async (req, res) => {
  try {
    /* validate */
    for (let field of ["academyId", "academyName", "adminId", "adminName"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
      if (!validate(field, req.body[field])) {
        return res.status(400).send({ message: FIELD_INVALID(field) });
      }
    }
    for (let field of ["email", "tel"]) {
      if (field in req.body && !validate(field, req.body[field])) {
        return res.status(400).send({ message: FIELD_INVALID(field) });
      }
    }

    /* check duplication */
    const exAcademy = await Academy.findOne({ academyId: req.body.academyId });
    if (exAcademy) {
      return res.status(409).send({
        message: FIELD_IN_USE("academyId"),
      });
    }

    /* create & save academy document & check validation */
    const academy = await Academy.create(req.body);

    /* create db */
    addConnection(academy);

    /* create & save admin document  */
    const password = generatePassword();
    const admin = await User(academy.academyId).create({
      userId: academy.adminId,
      userName: academy.adminName,
      academyId: academy.academyId,
      academyName: academy.academyName,
      password,
      auth: "admin",
    });

    return res.status(200).send({
      academy,
      admin: { ...admin, password },
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function RAcademies API
 * @description 아카데미 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/academies"} req.url
 *
 * @param {Object} req.user -"owner"|"guest"
 *
 * @param {Object} res
 * @param {Object[]} res.academies - academy list excluding root
 */
/**
 * @memberof APIs.AcademyAPI
 * @function RAcademy API
 * @description 아카데미 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/academies?academyId={academyId}"} req.url
 *
 * @param {Object} req.user - "owner"|"guest"
 *
 * @param {Object} res
 * @param {Object} res.academy
 *
 */
export const find = async (req, res) => {
  try {
    /* if guest requested */
    if (!req.isAuthenticated()) {
      if (!("academyId" in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED("academyID") });
      }
      const academy = await Academy.findOne({ academyId: req.query.academyId });
      if (!academy) {
        return res.status(404).send({ message: __NOT_FOUND("academy") });
      }
      return res.status(200).send({ academy });
    }

    /* if owner requested */
    if (req.user.auth === "owner") {
      if ("academyId" in req.query) {
        const academy = await Academy.findOne({
          academyId: req.query.academyId,
        });
        if (!academy) {
          return res.status(404).send({ message: __NOT_FOUND("academy") });
        }
        return res.status(200).send({ academy });
      }

      const academies = await Academy.find({ academyId: { $ne: "root" } });
      return res.status(200).send({ academies });
    }

    return res.status(403).send({ message: PERMISSION_DENIED });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function UActivateAcademy API
 * @description 아카데미 활성화  API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/academies/:academyId/activate"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.academy - activated academy
 *
 */
export const activate = async (req, res) => {
  try {
    /* find academy */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy)
      return res.status(404).send({ message: __NOT_FOUND("academy") });

    /* activate academy */
    academy.isActivated = true;
    await academy.save();
    return res.status(200).send({ academy });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function UInactivateAcademy API
 * @description 아카데미 비활성화  API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/academies/:academyId/inactivate"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} req.body
 *
 * @param {Object} res
 * @param {Object} res.academy - inactivated academy
 *
 */
export const inactivate = async (req, res) => {
  try {
    /* find academy */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy)
      return res.status(404).send({ message: __NOT_FOUND("academy") });

    /* inactivate academy */
    academy.isActivated = false;
    await academy.save();
    return res.status(200).send({ academy });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function UAcademyEmail API
 * @description 아카데미 이메일 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/academies/:academyId/email"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} req.body
 * @param {string?} req.body.email
 *
 * @param {Object} res
 * @param {Object} res.academy - updated academy
 *
 */
export const updateEmail = async (req, res) => {
  try {
    /* validate */
    if (req.body.email && !validate("email", req.body.email))
      return res.status(400).send({ message: FIELD_INVALID(email) });

    /* find document */
    const academy = await Academy.findOne({
      academyId: req.params.academyId,
    });
    if (!academy)
      return res.status(404).send({ message: __NOT_FOUND("academy") });

    academy["email"] = req.body.email;
    await academy.save();

    return res.status(200).send({ academy });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function UAcademyTel API
 * @description 아카데미 전화번호 변경 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/academies/:academyId/tel"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} req.body
 * @param {string?} req.body.tel
 *
 * @param {Object} res
 * @param {Object} res.academy - updated academy
 */
export const updateTel = async (req, res) => {
  try {
    /* validate */
    if (req.body.tel && !validate("tel", req.body.tel))
      return res.status(400).send({ message: FIELD_INVALID(tel) });

    /* find document */
    const academy = await Academy.findOne({
      academyId: req.params.academyId,
    });
    if (!academy)
      return res.status(404).send({ message: __NOT_FOUND("academy") });

    academy["tel"] = req.body.tel;
    await academy.save();

    return res.status(200).send({ academy });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

const typeToModel = (docType, academyId) => {
  if (docType === "schools") return School(academyId);
  if (docType === "seasons") return Season(academyId);
  if (docType === "users") return User(academyId);
  if (docType === "registrations") return Registration(academyId);
  if (docType === "forms") return Form(academyId);
};

/**
 * @memberof APIs.AcademyAPI
 * @function findDocuments API
 * @version 1.0.0
 *
 * @deprecated owner 페이지 수정과 함께 업데이트될 예정
 * @todo owner 페이지 수정과 함께 업데이트
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const findDocuments = async (req, res) => {
  try {
    if (!_.find(["schools", "seasons", "users", "registrations", "forms"]))
      return res.status(400).send();

    if (req.params.docId) {
      const document = await typeToModel(
        req.params.docType,
        req.user.academyId
      ).findById(req.params.docId);
      return res.status(200).send(document);
    }

    const documents = await typeToModel(
      req.params.docType,
      req.user.academyId
    ).find(req.query);

    return res.status(200).send({ documents });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function DAcademy API
 * @description 아카데미 삭제 API; 아카데미 DB의 모든 데이터를 삭제한다
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/academies/:academyId"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} res
 *
 */
export const remove = async (req, res) => {
  try {
    /* find academy */
    const academy = await Academy.findOne({ academyId: req.params.academyId });
    if (!academy)
      return res.status(404).send({ message: __NOT_FOUND("academy") });

    /* remove */
    await academy.remove();

    /* delete db */
    await deleteConnection(req.params.academyId);
    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
