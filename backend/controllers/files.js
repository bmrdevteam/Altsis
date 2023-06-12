/**
 * FileAPI namespace
 * @namespace APIs.FileAPI
 */
import { logger } from "../log/logger.js";
import _ from "lodash";
import {
  Enrollment,
  Form,
  School,
  Registration,
  Syllabus,
  User,
  Season,
  Archive,
  Notification,
} from "../models/index.js";
import { format } from "date-fns";
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
  const archive = await Archive(req.user.academyId).findById(req.query.archive);
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
};

export const signBackup = async (req, res) => {
  if (!("key" in req.query)) {
    return res.status(400).send({ message: FIELD_REQUIRED("key") });
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
};

/* find backup */
export const findBackup = async (req, res) => {
  try {
    if (!("academyId" in req.query)) {
      return res.status(400).send({ message: "query(academyId) is required" });
    }

    const list = [];

    /*  특정 백업 목록 불러오기 */
    if ("title" in req.query) {
      const data = await s3
        .listObjectsV2({
          Bucket: bucket,
          Prefix: `${req.query.academyId}/backup/${req.query.title}/`,
        })
        .promise();

      for (let content of data.Contents) {
        const keys = content.Key.split("/");
        if (keys.length === 4 && keys[3] !== "") {
          list.push({
            title: keys[3],
            size: content.Size,
            key: content.Key,
            lastModified: content.LastModified,
          });
        }
      }
    } else {
      /* 백업 리스트 불러오기 */
      const data = [];
      let token = undefined;

      /* list all data */
      do {
        const _data = await s3
          .listObjectsV2({
            Bucket: bucket,
            Prefix: `${req.query.academyId}/backup/`,
            ContinuationToken: token,
            Delimiter: "/",
          })
          .promise();
        data.push(..._data.CommonPrefixes);
        token = data.NextContinuationToken;
      } while (token);

      for (let content of data) {
        list.push({
          title: content.Prefix.split("/")[2],
          key: content.Prefix,
        });
      }
    }

    return res.status(200).send({ list });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* upload backup */
const Model = (title, academyId) => {
  if (title === "schools") return School(academyId);
  if (title === "users") return User(academyId);
  if (title === "archives") return Archive(academyId);
  if (title === "seasons") return Season(academyId);
  if (title === "registrations") return Registration(academyId);
  if (title === "syllabuses") return Syllabus(academyId);
  if (title === "enrollments") return Enrollment(academyId);
  if (title === "forms") return Form(academyId);
  if (title === "notifications") return Notification(academyId);
};

export const uploadBackup = async (req, res) => {
  if (!("academyId" in req.query)) {
    return res.status(400).send({ message: "query(academyId) is required" });
  }
  if (!("models" in req.body)) {
    return res.status(400).send({ message: "body(models) is required" });
  }

  const logs = [];
  try {
    const title = format(Date.now(), "yyyy-MM-dd_HH:mm:ss.SSS");
    logs.push(`┌ [Backup] ${req.query.academyId}/backup/${title}`);
    logs.push(`├ requested by ${req.user.userId}(${req.user.academyId})`);

    const startTime = new Date().getTime();
    for (let model of req.body.models) {
      try {
        logs.push(`│┌ backup ${model.title}...`);
        const subStartTime = new Date().getTime();

        const cursor = Model(model.title, req.query.academyId)
          .find()
          .batchSize(1000)
          .cursor();

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
        await s3
          .upload({
            Bucket: bucket,
            Key: `${req.query.academyId}/backup/${title}/${model.title}.json`,
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
      `└ [Backup] ${req.query.academyId}/backup/${title} is done(${
        endTime - startTime
      }ms)`
    );

    await s3
      .upload({
        Bucket: bucket,
        Key: `${req.query.academyId}/backup/${title}/log.txt`,
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

export const removeBackup = async (req, res) => {
  try {
    if (!("academyId" in req.query)) {
      return res.status(400).send({ message: "query(academyId) is required" });
    }
    if (!("title" in req.query)) {
      return res.status(400).send({ message: "query(title) is required" });
    }

    const data = await s3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: `${req.query.academyId}/backup/${req.query.title}/`,
      })
      .promise();

    const keys = data.Contents.map((content) => {
      return { Key: content.Key };
    });
    await s3
      .deleteObjects({
        Bucket: bucket,
        Delete: { Objects: keys },
      })
      .promise();

    return res.status(200).send({});
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const restoreBackup = async (req, res) => {
  try {
    const { academyId, model, documents } = req.body;

    if (!academyId) {
      return res.status(400).send({ message: "body(academyId) is required" });
    }
    if (!model) {
      return res.status(400).send({ message: "body(model) is required" });
    }
    if (!documents) {
      return res.status(400).send({ message: "body(model) is required" });
    }
    if (!Array.isArray(documents)) {
      return res
        .status(400)
        .send({ message: "body(model) must be JSON array" });
    }

    await Model(model, academyId).deleteMany({});
    if (model === "archives" || model === "enrollments") {
      await Promise.all(
        documents.map((_doc) => {
          const doc = new (Model(model, academyId))(_doc);
          return doc.save();
        })
      );
    } else {
      await Model(model, academyId).insertMany(documents);
    }

    return res.status(200).send({});
  } catch (err) {
    console.log(err);
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* create */
export const create = async (req, res) => {
  try {
    const user = await User(req.user.academyId).findOne({
      userId: req.body.userId,
    });
    if (!user) return res.status(404).send();

    const school = await School(req.user.academyId).findById(req.body.school);
    if (!school) return res.status(404).send();

    const _Archive = Archive(req.user.academyId);

    /* check duplication */
    const exArchive = await _Archive.findOne({
      school: req.body.school,
      userId: req.body.userId,
    });

    if (exArchive)
      return res.status(409).send({ message: `archive already exists` });

    /* create and save document */
    const archive = new _Archive({
      userId: user.userId,
      userName: user.userName,
      school: school._id,
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      data: req.body.data,
    });
    await archive.save();
    return res.status(200).send(archive);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const find = async (req, res) => {
  try {
    const { userId, school } = req.query;
    if (!userId || !school) {
      return res.status(400).send();
    }
    const archive = await Archive(req.user.academyId).findOneOrCreate({
      userId,
      school,
    });
    if (!archive) return res.status(404).send({ message: "archive not found" });
    archive.clean(); //DEVELOPMENT MODE

    // check archive.file is expired
    for (let field in archive.files) {
      // if pre-signed url is expired
      if (archive.data[field]?.expiryDate < new Date().toString()) {
        const { preSignedUrl, expiryDate } = signUrl(archive.files[field].key);
        archive.data[field] = { url: preSignedUrl, expiryDate };
        await archive.save();
      }
      // const isExpired = expiryDate < new Date();
    }

    archive.files = undefined;
    return res.status(200).send(archive);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const findById = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });
    archive.clean(); //DEVELOPMENT MODE
    return res.status(200).send(archive);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

export const updateDataField = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });

    const field = req.params.field;
    archive.data[field] = req.body.new;
    await archive.save();
    archive.files = undefined;
    return res.status(200).send(archive);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* delete */

export const remove = async (req, res) => {
  try {
    s3.deleteObject(
      {
        Bucket: bucket,
        Key: req.query.key,
      },
      async (err, data) => {
        if (err) {
          return res.status(500).send({ err: err.message });
        }
        return res.status(200).send();
      }
    );
  } catch (err) {
    return res.status(500).send({ err: err.message });
  }
};

export const removeField = async (req, res) => {
  try {
    const archive = await Archive(req.user.academyId).findById(req.params._id);
    if (!archive) return res.status(404).send({ message: "archive not found" });

    const field = req.params.field;
    archive.data[field] = undefined;
    await archive.save();
    archive.files = undefined;
    return res.status(200).send(archive);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: err.message });
  }
};

/* test */

export const test = async (req, res) => {
  /* upload file */
  const { userIds, school } = req.body;
  let idx = 1;
  for (let userId of userIds) {
    const archive = await Archive("bmr").findOneOrCreate({ userId, school });

    const key = `bmr/archive/tmp_bmrhs_221205/${userId}.jpg`;

    const { preSignedUrl, expiryDate } = signUrl(key);

    archive.files = {
      ...archive.files,
      ["사진"]: {
        url: `https://${bucket}.s3.ap-northeast-2.amazonaws.com/${key}`,
        key,
      },
    };
    archive.data = {
      ...archive.data,
      ["사진"]: { url: preSignedUrl, expiryDate },
    };
    await archive.save();
    idx = idx + 1;
  }
  return res.status(200).send();
  // archiveMulter.single("img")(req, {}, async (err) => {
  //   if (err) {
  //     if (err.code == "LIMIT_FILE_SIZE" || err.code == "INVALID_FILE_TYPE")
  //       return res.status(409).send({ message: err.message });
  //     if (err.code == "ARCHIVE_NOT_FOUND")
  //       return res.status(404).send({ message: err.message });
  //     logger.error(err.message);
  return res.status(500).send({ message: err.message });
  //   }

  //   const { archive, key } = req.mm;

  //   archive.files = undefined;
  //   return res.status(200).send(archive);
  // });
};
