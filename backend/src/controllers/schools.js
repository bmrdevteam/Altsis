/**
 * SchoolAPI namespace
 * @namespace APIs.SchoolAPI
 * @see TSchool in {@link Models.School}
 */

/**
 * @typedef {import('../models/School.js').TSchool} TSchool
 * @typedef {import('../models/School.js').TFormArchiveItem} TFormArchiveItem
 * @typedef {import('../models/School.js').TLink} TLink
 */

import { logger } from "../log/logger.js";
import _ from "lodash";
import {
  Archive,
  Enrollment,
  Registration,
  School,
  Season,
  Syllabus,
  User,
} from "../models/index.js";
import {
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  FORM_LABEL_DUPLICATED,
  FORM_LABEL_IN_TRASH,
  __NOT_FOUND,
} from "../messages/index.js";
import { validate } from "../utils/validate.js";

/**
 * @memberof APIs.SchoolAPI
 * @function *common
 *
 * @param {Object} req
 * @param {Object} res
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 404    | SCHOOL_NOT_FOUND | if school is not found  |
 */

/**
 * @memberof APIs.SchoolAPI
 * @function CSchool API
 * @description 학교 생성 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"POST"} req.method
 * @param {"/schools"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} req.body
 * @param {string} req.body.schoolId
 * @param {string} req.body.schoolName
 *
 * @param {Object} res
 * @param {TSchool} res.school - created school
 *
 * @throws {}
 * | status | message          | description                       |
 * | :----- | :--------------- | :-------------------------------- |
 * | 409    | SCHOOLID_IN_USE | if parameter schoolId is in use  |
 *
 * @see {@link Models.School} for validation
 */
export const create = async (req, res) => {
  try {
    /* validate */
    for (let field of ["schoolId", "schoolName"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
      if (!validate(field, req.body[field])) {
        return res.status(400).send({ message: FIELD_INVALID(field) });
      }
    }

    const admin = req.user;

    /* check duplication */
    if (
      await School(admin.academyId).findOne({ schoolId: req.body.schoolId })
    ) {
      return res.status(409).send({ message: FIELD_IN_USE("schoolId") });
    }

    /* create and save document */
    const school = await School(admin.academyId).create({
      schoolId: req.body.schoolId,
      schoolName: req.body.schoolName,
    });

    return res.status(200).send({ school });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RSchools API
 * @description 학교 목록 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/schools"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {TSchool[]} res.schools
 *
 */

/**
 * @memberof APIs.SchoolAPI
 * @function RSchool API
 * @description 학교 조회 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"GET"} req.method
 * @param {"/schools/:_id"} req.url
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {TSchool} res.school
 *
 */
export const find = async (req, res) => {
  try {
    /* if owner requested, use academyId from query */
    let academyId = req.user.academyId;
    if (req.user.auth === "owner" && req.query.academyId) {
      academyId = req.query.academyId;
    }

    if (req.params._id) {
      const school = await School(academyId).findById(req.params._id);
      if (!school) {
        return res.status(404).send({ message: __NOT_FOUND("school") });
      }

      return res.status(200).send({
        school,
      });
    }

    const schools = await School(academyId).find({}).lean();
    return res.status(200).send({ schools });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolFormArchive API
 * @description 학교 기록 양식 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/schools/:_id/formArchive"} req.url
 *
 * @param {Object} req.user - "admin|"manager"
 *
 * @param {Object} req.body
 * @param {TFormArchiveItem[]} req.body.formArchive
 *
 * @param {Object} res
 * @param {TFormArchiveItem[]} res.formArchive - updated formArchive
 *
 * @see models>School for validation
 */
export const updateFormArchive = async (req, res) => {
  try {
    /* validation */
    if (!("formArchive" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("formArchive") });
    }

    // 라벨 중복 검사
    for (let i = 0; i < req.body.formArchive.length; i++) {
      // 필드 중복 검사
      for (let ii = 0; ii < req.body.formArchive[i].fields?.length; ii++) {
        for (
          let jj = ii + 1;
          jj < req.body.formArchive[i].fields?.length;
          jj++
        ) {
          if (
            req.body.formArchive[i].fields[ii].label ===
            req.body.formArchive[i].fields[jj].label
          ) {
            return res.status(400).send({ message: FORM_LABEL_DUPLICATED });
          }
        }
      }
      for (let j = i + 1; j < req.body.formArchive.length; j++) {
        if (req.body.formArchive[i].label === req.body.formArchive[j].label) {
          return res.status(400).send({ message: FORM_LABEL_DUPLICATED });
        }
      }
    }

    // 기존 학교 정보 조회
    const existingSchool = await School(req.user.academyId).findById(
      req.params._id
    );
    if (!existingSchool) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const oldLabels = existingSchool.formArchive.map((item) => item.label);
    const newLabels = req.body.formArchive.map((item) => item.label);
    const deletedFormArchive = existingSchool.deletedFormArchive || [];

    // 휴지통에 있는 라벨로 생성하려는지 확인
    const trashedLabels = deletedFormArchive.map((item) => item.label);
    for (const newLabel of newLabels) {
      if (trashedLabels.includes(newLabel) && !oldLabels.includes(newLabel)) {
        return res.status(400).send({ message: FORM_LABEL_IN_TRASH });
      }
    }

    // 삭제되는 라벨 찾기 (기존에 있었지만 새로운 목록에 없는 것)
    const deletedLabels = oldLabels.filter(
      (label) => !newLabels.includes(label)
    );

    // 삭제되는 항목들을 휴지통으로 이동
    const itemsToTrash = existingSchool.formArchive
      .filter((item) => deletedLabels.includes(item.label))
      .map((item) => ({
        ...item.toObject(),
        deletedAt: new Date(),
      }));

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      {
        formArchive: req.body.formArchive,
        $push: { deletedFormArchive: { $each: itemsToTrash } },
      },
      { new: true }
    );

    return res.status(200).send({ formArchive: school.formArchive });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolLinks API
 * @description 학교 링크 수정 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/schools/:_id/links"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} req.body
 * @param {TLink[]} req.body.links
 *
 * @param {Object} res
 * @param {TLink[]} res.links - updated links
 *
 */
export const updateLinks = async (req, res) => {
  try {
    if (!("links" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("links") });
    }
    for (let link of req.body.links) {
      for (let field of ["url", "title"]) {
        if (!(field in link)) {
          return res.status(400).send({ message: FIELD_REQUIRED(field) });
        }
      }
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { links: req.body.links },
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res.status(200).send({ links: school.links });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RestoreFormArchive API
 * @description 삭제된 기록 양식 복원 API
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"PUT"} req.method
 * @param {"/schools/:_id/deletedFormArchive/:label/restore"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 * @param {TFormArchiveItem[]} res.formArchive - updated formArchive
 * @param {TDeletedFormArchiveItem[]} res.deletedFormArchive - updated deletedFormArchive
 *
 */
export const restoreFormArchive = async (req, res) => {
  try {
    const label = decodeURIComponent(req.params.label);

    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // 휴지통에서 해당 라벨 찾기
    const deletedIdx = school.deletedFormArchive.findIndex(
      (item) => item.label === label
    );
    if (deletedIdx === -1) {
      return res.status(404).send({ message: __NOT_FOUND("deletedFormArchive") });
    }

    // 현재 formArchive에 같은 라벨이 있는지 확인
    const existingIdx = school.formArchive.findIndex(
      (item) => item.label === label
    );
    if (existingIdx !== -1) {
      return res.status(400).send({ message: FORM_LABEL_DUPLICATED });
    }

    // 휴지통에서 꺼내서 formArchive로 이동
    const itemToRestore = school.deletedFormArchive[deletedIdx].toObject();
    delete itemToRestore.deletedAt;

    school.formArchive.push(itemToRestore);
    school.deletedFormArchive.splice(deletedIdx, 1);
    await school.save();

    return res.status(200).send({
      formArchive: school.formArchive,
      deletedFormArchive: school.deletedFormArchive,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RemoveFormArchive API
 * @description 삭제된 기록 양식 완전 삭제 API (휴지통에서 영구 삭제)
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/schools/:_id/deletedFormArchive/:label"} req.url
 *
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 * @param {TDeletedFormArchiveItem[]} res.deletedFormArchive - updated deletedFormArchive
 *
 */
export const removeFormArchive = async (req, res) => {
  try {
    const label = decodeURIComponent(req.params.label);

    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // 휴지통에서 해당 라벨 찾기
    const deletedIdx = school.deletedFormArchive.findIndex(
      (item) => item.label === label
    );
    if (deletedIdx === -1) {
      return res.status(404).send({ message: __NOT_FOUND("deletedFormArchive") });
    }

    // 휴지통에서 삭제
    school.deletedFormArchive.splice(deletedIdx, 1);
    await school.save();

    // 해당 학교의 모든 Archive에서 해당 라벨의 데이터 삭제
    await Archive(req.user.academyId).updateMany(
      { school: school._id },
      { $unset: { [`data.${label}`]: "" } }
    );

    return res.status(200).send({
      deletedFormArchive: school.deletedFormArchive,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(err.status || 500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function DSchool API
 * @description 학교 삭제 API; 관련 데이터를 모두 삭제한다
 * @version 2.0.0
 *
 * @param {Object} req
 *
 * @param {"DELETE"} req.method
 * @param {"/schools/:_id"} req.url
 *
 * @param {Object} req.user - "admin"
 *
 * @param {Object} res
 *
 */
export const remove = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const admin = req.user;

    const users = await User(admin.academyId).find({
      "schools.school": school._id,
    });

    for (let user of users) {
      const idx = _.findIndex(user.schools, (userSchool) =>
        userSchool.school.equals(school._id)
      );
      if (idx !== -1) {
        user.schools.splice(idx, 1);
        user.isModified("schools");
      }
    }
    await Promise.all(users.map((user) => user.save()));
    await Promise.all([
      Enrollment(admin.academyId).deleteMany({ school: school._id }),
      Syllabus(admin.academyId).deleteMany({ school: school._id }),
      Registration(admin.academyId).deleteMany({ school: school._id }),
      Season(admin.academyId).deleteMany({ school: school._id }),
      Archive(admin.academyId).deleteMany({ school: school._id }),
    ]);
    await school.delete();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
