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
  Notification,
  Enrollment,
  Syllabus,
  Archive,
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
import { fileS3, fileBucket } from "../_s3/fileBucket.js";
import { format } from "date-fns";

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

const Model = (title, academyId) => {
  switch (title) {
    case "schools":
      return School(academyId);
    case "users":
      return User(academyId);
    case "archives":
      return Archive(academyId);
    case "seasons":
      return Season(academyId);
    case "registrations":
      return Registration(academyId);
    case "syllabuses":
      return Syllabus(academyId);
    case "enrollments":
      return Enrollment(academyId);
    case "forms":
      return Form(academyId);
    case "notifications":
      return Notification(academyId);
    default:
      return undefined;
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function CAcademyBackup API
 * @description 아카데미 백업 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/academies/:academyId/backup"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} req.body
 * @param {Object[]} req.body.models
 * @param {string} req.body.models[i].title
 *
 * @param {Object} res
 * @param {string[]} res.logs
 *
 */
export const createBackup = async (req, res) => {
  try {
    if (!("models" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("models") });
    }
    for (let model of req.body.models) {
      if (!("title" in model)) {
        return res.status(400).send({ message: FIELD_REQUIRED("title") });
      }
    }

    const logs = [];
    const title = format(Date.now(), "yyyy-MM-dd_HH:mm:ss.SSS");
    logs.push(`┌ [Backup] ${req.params.academyId}/backup/${title}`);
    logs.push(`├ requested by ${req.user.userId}(${req.params.academyId})`);

    const startTime = new Date().getTime();
    for (let model of req.body.models) {
      try {
        logs.push(`│┌ backup ${model.title}...`);
        const subStartTime = new Date().getTime();

        const cursor = Model(model.title, req.params.academyId)
          ?.find()
          .batchSize(1000)
          .cursor();
        if (!cursor) continue;

        const docs = [];
        let idx = 1;
        let subIdx = 1;
        for await (const doc of cursor) {
          docs.push(JSON.stringify(doc, null, "\t"));
          if (subIdx === 1000) {
            logs.push(`│├ reading ${model.title}... ${idx}`);
            subIdx = 0;
          }
          idx += 1;
          subIdx += 1;
        }
        if (subIdx > 0) {
          logs.push(`│├ reading ${model.title}... ${idx - 1}`);
        }

        logs.push(`│├ writing ${model.title}...`);
        const data = "[" + _.join(docs, ",\n") + "]";
        await fileS3
          .upload({
            Bucket: fileBucket,
            Key: `${req.params.academyId}/backup/${title}/${model.title}.json`,
            Body: data,
            ContentType: "application/json",
          })
          .promise();

        const subEndTime = new Date().getTime();
        logs.push(
          `│└ backup ${model.title} is done(${subEndTime - subStartTime}ms)`
        );
      } catch (err) {
        logs.push(`│└ backup ${model.title} is failed: ${err.message}`);
      }
    }
    const endTime = new Date().getTime();
    logs.push(
      `└ [Backup] ${req.params.academyId}/backup/${title} is done(${
        endTime - startTime
      }ms)`
    );

    await fileS3
      .upload({
        Bucket: fileBucket,
        Key: `${req.params.academyId}/backup/${title}/log.txt`,
        Body: _.join(logs, `\n`),
        ContentType: "application/json",
      })
      .promise();

    return res.status(200).send({ logs });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function URestoreAcademy API
 * @description 아카데미 복구 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/academies/:academyId/restore"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} req.body
 * @param {string} req.body.model
 * @param {Object[]} req.body.documents
 *
 * @param {Object} res
 *
 */
export const restoreBackup = async (req, res) => {
  try {
    for (let field of ["model", "documents"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }
    if (!Array.isArray(req.body.documents)) {
      return res.status(400).send({ message: FIELD_INVALID("documents") });
    }

    await Model(req.body.model, req.params.academyId).deleteMany({});
    if (req.body.model === "archives" || req.body.model === "enrollments") {
      await Promise.all(
        documents.map((_doc) => {
          const doc = new (Model(req.body.model, req.params.academyId))(_doc);
          return doc.save();
        })
      );
    } else {
      await Model(req.body.model, req.params.academyId).insertMany(documents);
    }

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function RAcademyBackupList API
 * @description 아카데미 백업 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/academies/:academyId/backup"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} res
 * @param {Object[]} res.backupList
 * @param {string} res.backupList[i].title
 * @param {string} res.backupList[i].key
 */

/**
 * @memberof APIs.AcademyAPI
 * @function RAcademyBackup API
 * @description 아카데미 백업 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/academies/:academyId/backup?title={backup.title}"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} res
 * @param {Object[]} res.backup
 * @param {string} res.backup[i].title
 * @param {string} res.backup[i].key
 * @param {number} res.backup[i].size
 * @param {Date} res.backup[i].lastModified
 *
 */
export const findBackup = async (req, res) => {
  try {
    /* RAcademyBackupList */
    if (!("title" in req.query)) {
      const backupList = [];

      const data = [];
      let token = undefined;
      do {
        const _data = await fileS3
          .listObjectsV2({
            Bucket: fileBucket,
            Prefix: `${req.params.academyId}/backup/`,
            ContinuationToken: token,
            Delimiter: "/",
          })
          .promise();
        data.push(..._data.CommonPrefixes);
        token = data.NextContinuationToken;
      } while (token);

      for (let content of data) {
        backupList.push({
          title: content.Prefix.split("/")[2],
          key: content.Prefix,
        });
      }
      return res.status(200).send({ backupList });
    }

    /* RAcademyBackup */
    const backup = [];

    const data = await fileS3
      .listObjectsV2({
        Bucket: fileBucket,
        Prefix: `${req.params.academyId}/backup/${req.query.title}/`,
      })
      .promise();

    for (let content of data?.Contents) {
      const keys = content.Key.split("/");
      if (keys.length === 4 && keys[3] !== "") {
        backup.push({
          title: keys[3],
          size: content.Size,
          key: content.Key,
          lastModified: content.LastModified,
        });
      }
    }
    return res.status(200).send({ backup });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/**
 * @memberof APIs.AcademyAPI
 * @function DAcademyBackup API
 * @description 아카데미 백업 삭제 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/academies/:academyId/backup?title={backup.title}"} req.url
 *
 * @param {Object} req.user - "owner"
 *
 * @param {Object} res
 *
 */
export const removeBackup = async (req, res) => {
  try {
    if (!("title" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("title") });
    }

    const data = await fileS3
      .listObjectsV2({
        Bucket: fileBucket,
        Prefix: `${req.params.academyId}/backup/${req.query.title}/`,
      })
      .promise();

    const keys = data.Contents.map((content) => {
      return { Key: content.Key };
    });
    await fileS3
      .deleteObjects({
        Bucket: fileBucket,
        Delete: { Objects: keys },
      })
      .promise();

    return res.status(200).send({});
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
