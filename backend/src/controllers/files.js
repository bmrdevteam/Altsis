/**
 * FileAPI namespace
 * @namespace APIs.FileAPI
 */
import _ from "lodash";
import { School, Registration, Archive } from "../models/index.js";
import { archiveMulter } from "../_s3/archiveMulter.js";
import { signUrl } from "../_s3/fileBucket.js";
import {
  FIELD_INVALID,
  FIELD_REQUIRED,
  INVALID_FILE_TYPE,
  LIMIT_FILE_SIZE,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { logger } from "../log/logger.js";

/**
 * @memberof APIs.FileAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | FILE_NOT_FOUND | if file is not found  |
 */

/**
 * @memberof APIs.FileAPI
 * @function CUploadFileArchive API
 * @description 아카이브 파일 업로드 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/files/archive"} req.url
 *
 * @param {Object} req.user
 *
 * @param {FormData} req.body
 *
 * @param {Object} res
 * @param {string} res.originalName - file original name
 * @param {string} res.key - file key
 * @param {string} res.url - file url
 * @param {string} res.preSignedUrl - file preSignedUrl
 * @param {Date} res.expiryDate - expiryDate of file preSignedUrl
 *
 */
export const uploadArchive = async (req, res) => {
  archiveMulter.single("file")(req, {}, async (err) => {
    if (err) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        case "INVALID_FILE_TYPE":
          return res.status(409).send({ message: INVALID_FILE_TYPE });
        default:
          return res.status(500).send({ message: err.code });
      }
    }

    try {
      const { preSignedUrl, expiryDate } = signUrl(
        req.tmp.key,
        req.file.originalname
      );

      return res.status(200).send({
        originalName: req.file.originalname,
        type: req.file.mimetype,
        key: req.tmp.key,
        url: req.file.location,
        preSignedUrl,
        expiryDate,
      });
    } catch (err) {
      logger.error(err.message);
      return res.status(500).send({ message: err.message });
    }
  });
};

/**
 * @memberof APIs.FileAPI
 * @function RSignedUrlArchive API
 * @description 서명된 아카이브 파일 주소 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/files/archive/signed"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.key - file key
 * @param {string} req.query.archive - ObjectId of archive
 * @param {string} req.query.label - archive[i].label
 * @param {string} req.query.fieldLabel - archive[i].fields[j].label
 * @param {string} req.query.fileName- fileName
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {string} res.preSignedUrl - file preSignedUrl
 * @param {Date} res.expiryDate - expiryDate of file preSignedUrl
 *
 */
export const signArchive = async (req, res) => {
  try {
    for (let field of ["key", "archive", "label", "fieldLabel", "fileName"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const keys = req.query.key.split("/");
    if (keys[1] !== "archive") {
      return res.status(400).send({ message: FIELD_INVALID("key") });
    }

    /* find archive */
    const archive = await Archive(req.user.academyId).findById(
      req.query.archive
    );
    if (!archive) {
      return res.status(404).send({ message: __NOT_FOUND("archive") });
    }

    if (
      !(req.query.label in archive.data) ||
      !(req.query.fieldLabel in archive.data[req.query.label]) ||
      !("key" in archive.data[req.query.label][req.query.fieldLabel]) ||
      archive.data[req.query.label][req.query.fieldLabel].key !== req.query.key
    ) {
      return res.status(404).send({ message: __NOT_FOUND("archive") });
    }

    /* find school & check permission */
    const school = await School(req.user.academyId)
      .findById(archive.school)
      .lean();
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const formItem = _.find(
      school.formArchive,
      (form) => form.label === req.query.label
    );

    if (!formItem) {
      return res.status(404).send({ message: __NOT_FOUND("formItem") });
    }

    const formItemField = _.find(
      formItem.fields,
      (field) => field.label === req.query.fieldLabel
    );
    if (!formItemField) {
      return res.status(404).send({ message: __NOT_FOUND("formItemField") });
    }

    const authStudent = formItem.authStudent ?? "undefined";
    const authTeacher = formItem.authTeacher ?? "undefined";

    if (archive.user.equals(req.user._id)) {
      if (authStudent !== "view") {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else {
      if (authTeacher === "viewAndEditStudents") {
        const registrationTeacher = await Registration(
          req.user.academyId
        ).findOne({
          school: archive.school,
          user: req.user._id,
          role: "teacher",
        });
        if (!registrationTeacher) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }
      } else if (authTeacher === "viewAndEditMyStudents") {
        const registrationStudent = await Registration(req.user.academyId)
          .findOne({
            $or: [
              {
                school: archive.school,
                user: archive.user,
                teacher: req.user._id,
              },
              {
                school: archive.school,
                user: archive.user,
                subTeacher: req.user._id,
              },
            ],
          })
          .lean();
        if (!registrationStudent) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }
      } else {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    const { preSignedUrl, expiryDate } = signUrl(
      req.query.key,
      req.query.fileName,
      60
    );

    return res.status(200).send({
      preSignedUrl,
      expiryDate,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FileAPI
 * @function RSignedUrlDocument API
 * @description 서명된 문서 파일 주소 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/files/document/signed"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.key - file key
 * @param {string} req.query.fileName- fileName
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {string} res.preSignedUrl - file preSignedUrl
 * @param {Date} res.expiryDate - expiryDate of file preSignedUrl
 *
 */
export const signDocument = async (req, res) => {
  try {
    for (let field of ["key", "fileName"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    if (
      !(await Registration(req.user.academyId).findOne({
        user: req.user._id,
        role: "teacher",
      }))
    ) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { preSignedUrl, expiryDate } = signUrl(
      req.query.key,
      req.query.fileName,
      60
    );

    return res.status(200).send({
      preSignedUrl,
      expiryDate,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.FileAPI
 * @function RSignedUrlBackup API
 * @description 서명된 백업 파일 주소 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/files/backup/signed"} req.url
 *
 * @param {Object} req.query
 * @param {string} req.query.key - file key
 * @param {string} req.query.fileName- fileName
 *
 * @param {Object} req.user - owner || admin
 *
 * @param {Object} res
 * @param {string} res.preSignedUrl - file preSignedUrl
 * @param {Date} res.expiryDate - expiryDate of file preSignedUrl
 *
 */
export const signBackup = async (req, res) => {
  try {
    for (let field of ["key", "fileName"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const keys = req.query.key.split("/");
    if (keys[1] !== "backup") {
      return res.status(400).send({ message: FIELD_INVALID("key") });
    }

    const { preSignedUrl, expiryDate } = signUrl(
      req.query.key,
      req.query.fileName,
      60
    );

    return res.status(200).send({
      preSignedUrl,
      expiryDate,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};
