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
  Academy,
  AIUsageLog,
  Archive,
  Enrollment,
  Registration,
  RequestStat,
  School,
  Season,
  Syllabus,
  User,
} from "../models/index.js";
import { profileS3, profileBucket } from "../_s3/profileBucket.js";
import { fileS3, fileBucket } from "../_s3/fileBucket.js";
import { schoolAiLibraryMulter } from "../_s3/aiRefMulter.js";
import { tryCommitUpload } from "../services/academyStorage.js";
import { normalizePlans } from "../services/entitlement.js";
import { extractText } from "../utils/textExtractor.js";
import {
  normalizeGuidelines,
  PROMPT_LIMITS,
  truncateText,
} from "../services/aiPromptPolicy.js";
import {
  assertSchoolOfficialLibraryIds,
  createLibraryItemDoc,
  deleteLibraryItemDoc,
  downloadLibraryItemUrl,
  listLibraryItems,
  updateLibraryItemDoc,
} from "../services/aiLibrary.js";
import {
  aggregateAiDaily,
  aggregateAiPeriodDetails,
  aggregateTraffic,
  buildFieldDeltas,
  getDateKeys,
  getPreviousDateKeys,
  parseDashboardQuery,
  toDateKey,
} from "../services/schoolDashboard.js";
import { TOKENS_PER_ALT } from "../services/aiUsageQuota.js";
import {
  FIELD_INVALID,
  FIELD_IN_USE,
  FIELD_REQUIRED,
  FORM_LABEL_DUPLICATED,
  FORM_LABEL_IN_TRASH,
  __NOT_FOUND,
} from "../messages/index.js";
import { validate } from "../utils/validate.js";
import { sanitizeGoalDisplay } from "../constants/defaultGoalDisplay.js";

const VALID_SKILL_IDS = [
  "chat",
  "syllabus-draft",
  "evaluation-draft",
  "archive-draft",
  "document-draft",
  "document-review",
  "form-response-draft",
  "activity-draft",
  "form-draft",
  "assessment-grade",
  "search",
];
const LEGACY_SKILL_IDS = { "syllabus-review": "syllabus-draft" };
const MAX_LIBRARY_ITEMS_PER_SKILL = 20;

const defaultAiConfig = () => ({
  permission: { teacher: false, student: false },
  skills: {},
});

const migrateLegacySkillIds = (aiConfig) => {
  if (!aiConfig?.skills || typeof aiConfig.skills !== "object") return false;
  let changed = false;
  for (const [legacy, next] of Object.entries(LEGACY_SKILL_IDS)) {
    if (!aiConfig.skills[legacy]) continue;
    if (!aiConfig.skills[next]) {
      aiConfig.skills[next] = aiConfig.skills[legacy];
    } else {
      const legacyIds = Array.isArray(aiConfig.skills[legacy].libraryItemIds)
        ? aiConfig.skills[legacy].libraryItemIds.map(String)
        : [];
      const nextIds = Array.isArray(aiConfig.skills[next].libraryItemIds)
        ? aiConfig.skills[next].libraryItemIds.map(String)
        : [];
      aiConfig.skills[next].libraryItemIds = [
        ...new Set([...nextIds, ...legacyIds]),
      ].slice(0, MAX_LIBRARY_ITEMS_PER_SKILL);
    }
    delete aiConfig.skills[legacy];
    changed = true;
  }
  return changed;
};

const ensureAiConfig = (school) => {
  if (!school.aiConfig) {
    school.aiConfig = defaultAiConfig();
  }
  if (!school.aiConfig.permission) {
    school.aiConfig.permission = { teacher: false, student: false };
  }
  if (!school.aiConfig.skills || typeof school.aiConfig.skills !== "object") {
    school.aiConfig.skills = {};
  }
  if (migrateLegacySkillIds(school.aiConfig)) {
    school.markModified("aiConfig");
  }
  return school.aiConfig;
};

const ensureSkillSlot = (aiConfig, skillId) => {
  if (!aiConfig.skills[skillId]) {
    aiConfig.skills[skillId] = {
      instructions: "",
      libraryItemIds: [],
    };
  }
  if (!Array.isArray(aiConfig.skills[skillId].libraryItemIds)) {
    aiConfig.skills[skillId].libraryItemIds = [];
  }
  return aiConfig.skills[skillId];
};

const normalizeSkillConfig = async (academyId, schoolId, skillId, raw = {}) => {
  const instructions = normalizeGuidelines(raw.instructions || "");
  const libraryItemIds = Array.isArray(raw.libraryItemIds)
    ? [
        ...new Set(
          raw.libraryItemIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        ),
      ].slice(0, MAX_LIBRARY_ITEMS_PER_SKILL)
    : [];

  if (libraryItemIds.length > 0) {
    await assertSchoolOfficialLibraryIds(academyId, schoolId, libraryItemIds);
  }

  return { instructions, libraryItemIds };
};

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

      // Include academy-level feature flags for frontend visibility
      let academyFeatures;
      try {
        const academy = await Academy.findOne({ academyId });
        if (academy) {
          const plans = normalizePlans(academy);
          academyFeatures = {
            chatEnabled: (academy.chatEnabled ?? false) && plans.shift.enabled,
            boardEnabled: (academy.boardEnabled ?? true) && plans.shift.enabled,
            aiEnabled: (academy.aiEnabled ?? false) && plans.ctrl.enabled,
            sitePublishEnabled:
              (academy.sitePublishEnabled ?? false) && plans.shift.enabled,
            emailNotifyEnabled: academy.emailNotifyEnabled === true,
          };
        }
      } catch (err) {
        logger.warn(`academyFeatures lookup failed: ${err.message}`);
      }

      return res.status(200).send({
        school,
        academyFeatures,
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
/**
 * @memberof APIs.SchoolAPI
 * @function USchoolFeatureFlags API
 * @description 학교 기능 활성화 설정 API
 * @version 1.0.0
 */
export const updateFeatureFlags = async (req, res) => {
  try {
    const updateData = {};
    if (typeof req.body.chatEnabled === "boolean") {
      updateData.chatEnabled = req.body.chatEnabled;
    }
    if (typeof req.body.boardEnabled === "boolean") {
      updateData.boardEnabled = req.body.boardEnabled;
    }
    if (typeof req.body.aiEnabled === "boolean") {
      updateData.aiEnabled = req.body.aiEnabled;
    }
    if (typeof req.body.goalsEnabled === "boolean") {
      updateData.goalsEnabled = req.body.goalsEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({
        message: FIELD_REQUIRED(
          "chatEnabled|boardEnabled|aiEnabled|goalsEnabled"
        ),
      });
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      updateData,
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res.status(200).send({
      features: {
        chatEnabled: school.chatEnabled,
        boardEnabled: school.boardEnabled,
        aiEnabled: school.aiEnabled,
        goalsEnabled: school.goalsEnabled !== false,
      },
    });
  } catch (err) {
    logger.error(err.message);
    return res
      .status(500)
      .send({ message: "서버 오류가 발생했습니다." });
  }
};

export const updateBoardNotificationEvents = async (req, res) => {
  try {
    if (!("boardNotificationEvents" in req.body)) {
      return res
        .status(400)
        .send({ message: FIELD_REQUIRED("boardNotificationEvents") });
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { boardNotificationEvents: req.body.boardNotificationEvents },
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res
      .status(200)
      .send({ boardNotificationEvents: school.boardNotificationEvents });
  } catch (err) {
    logger.error(err.message);
    return res
      .status(500)
      .send({ message: "서버 오류가 발생했습니다." });
  }
};

export const updateBoardCreationPermission = async (req, res) => {
  try {
    if (!("boardCreationPermission" in req.body)) {
      return res
        .status(400)
        .send({ message: FIELD_REQUIRED("boardCreationPermission") });
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { boardCreationPermission: req.body.boardCreationPermission },
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res
      .status(200)
      .send({ boardCreationPermission: school.boardCreationPermission });
  } catch (err) {
    logger.error(err.message);
    return res
      .status(500)
      .send({ message: "서버 오류가 발생했습니다." });
  }
};

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
 * PUT /schools/:_id/goalDisplay
 * body: { goalDisplay: { student: {...}, teacher: {...} } }
 */
export const updateGoalDisplay = async (req, res) => {
  try {
    if (!("goalDisplay" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("goalDisplay") });
    }
    const goalDisplay = sanitizeGoalDisplay(req.body.goalDisplay);
    if (!goalDisplay) {
      return res.status(400).send({ message: FIELD_INVALID("goalDisplay") });
    }

    const school = await School(req.user.academyId).findByIdAndUpdate(
      req.params._id,
      { goalDisplay },
      { new: true }
    );
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    return res.status(200).send({ goalDisplay: school.goalDisplay });
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

/**
 * @memberof APIs.SchoolAPI
 * @function RSchoolDashboard API
 * @description 학교 대시보드 통계 조회 API
 * @version 2.1.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/schools/:_id/dashboard"} req.url
 * @param {Object} req.user - "admin"|"manager"
 * @param {7|14|30} [req.query.period=7] - traffic/AI 일별 기간
 * @param {"school"|"academy"} [req.query.scope=school] - KPI·학기 집계 범위
 *
 * @param {Object} res
 * @param {Object} res.dashboard
 */
export const dashboard = async (req, res) => {
  try {
    const academyId = req.user.academyId;
    const schoolId = req.params._id;
    const { period, scope } = parseDashboardQuery(
      req.query.period,
      req.query.scope
    );

    const school = await School(academyId).findById(schoolId);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // ── 1. Season / registration / course stats ──
    const seasonFilter =
      scope === "academy" ? {} : { school: schoolId };
    const seasons = await Season(academyId)
      .find(seasonFilter)
      .sort({ year: -1, term: 1 })
      .lean();

    const activeSeasons = seasons.filter((s) => s.isActivated);
    const activeSeasonIds = activeSeasons.map((s) => s._id);
    const allSeasonIds = seasons.map((s) => s._id);

    const registrations = await Registration(academyId)
      .find({ season: { $in: allSeasonIds } })
      .select("season role")
      .lean();

    const seasonStats = seasons.map((season) => {
      const regs = registrations.filter(
        (r) => r.season.toString() === season._id.toString()
      );
      return {
        _id: season._id,
        year: season.year,
        term: season.term,
        isActivated: season.isActivated,
        studentCount: regs.filter((r) => r.role === "student").length,
        teacherCount: regs.filter((r) => r.role === "teacher").length,
      };
    });

    const activeRegs = registrations.filter((r) =>
      activeSeasonIds.some((id) => id.toString() === r.season.toString())
    );
    const summary = {
      totalStudents: activeRegs.filter((r) => r.role === "student").length,
      totalTeachers: activeRegs.filter((r) => r.role === "teacher").length,
      totalCourses: 0,
      totalEnrollments: 0,
    };

    const syllabuses = await Syllabus(academyId)
      .find({ season: { $in: activeSeasonIds } })
      .select("count")
      .lean();

    summary.totalCourses = syllabuses.length;
    summary.totalEnrollments = syllabuses.reduce(
      (s, syl) => s + (syl.count || 0),
      0
    );

    // Previous season comparison (seasons sorted year desc — next entry is older)
    let previousSummary = null;
    const comparisonBase = activeSeasons[0] || seasons[0] || null;
    if (comparisonBase) {
      const baseIdx = seasons.findIndex(
        (s) => s._id.toString() === comparisonBase._id.toString()
      );
      const prevSeason =
        baseIdx >= 0 && baseIdx < seasons.length - 1
          ? seasons[baseIdx + 1]
          : null;

      if (prevSeason) {
        const prevRegs = registrations.filter(
          (r) => r.season.toString() === prevSeason._id.toString()
        );
        const prevSyllabuses = await Syllabus(academyId)
          .find({ season: prevSeason._id })
          .select("count")
          .lean();
        previousSummary = {
          totalStudents: prevRegs.filter((r) => r.role === "student").length,
          totalTeachers: prevRegs.filter((r) => r.role === "teacher").length,
          totalCourses: prevSyllabuses.length,
          totalEnrollments: prevSyllabuses.reduce(
            (s, syl) => s + (syl.count || 0),
            0
          ),
        };
      }
    }

    // ── 2. Traffic Stats (academy-wide; RequestStat has no school field) ──
    const currentDates = getDateKeys(period);
    const previousDates = getPreviousDateKeys(period);
    let trafficStats = [];
    let previousTrafficAgg = null;
    try {
      const allDates = [...new Set([...currentDates, ...previousDates])];
      const stats = await RequestStat(academyId)
        .find({ date: { $in: allDates } })
        .lean();

      const toTrafficRow = (date) => {
        const stat = stats.find((s) => s.date === date);
        return {
          date,
          requests: stat?.requests || 0,
          avgResponseTime:
            stat?.requests > 0
              ? Math.round(stat.totalResponseTime / stat.requests)
              : 0,
          dataIn: stat?.dataIn || 0,
          dataOut: stat?.dataOut || 0,
          uniqueUsers: stat?.uniqueUsers?.length || 0,
        };
      };

      trafficStats = currentDates.map(toTrafficRow);
      previousTrafficAgg = aggregateTraffic(previousDates.map(toTrafficRow));
    } catch (err) {
      logger.warn(`dashboard traffic stats unavailable: ${err.message}`);
    }

    // ── 3. S3 Storage Stats (academy-wide) ──
    let storageStats = [];
    try {
      const categories = [
        {
          name: "프로필 이미지",
          s3: profileS3,
          bucket: profileBucket,
          prefix: `original/${academyId}/`,
        },
        {
          name: "채팅 파일",
          s3: fileS3,
          bucket: fileBucket,
          prefix: `${academyId}/chat/`,
        },
        {
          name: "게시판 첨부파일",
          s3: fileS3,
          bucket: fileBucket,
          prefix: `${academyId}/posts/`,
        },
        {
          name: "설문 파일",
          s3: fileS3,
          bucket: fileBucket,
          prefix: `${academyId}/survey/`,
        },
        {
          name: "기록 파일",
          s3: fileS3,
          bucket: fileBucket,
          prefix: `${academyId}/archive/`,
        },
        {
          name: "AI 참고자료",
          s3: fileS3,
          bucket: fileBucket,
          prefix: `${academyId}/ai-ref/`,
        },
      ];

      storageStats = await Promise.all(
        categories.map(async (cat) => {
          let totalSize = 0;
          let count = 0;
          let ContinuationToken;

          try {
            do {
              const response = await cat.s3
                .listObjectsV2({
                  Bucket: cat.bucket,
                  Prefix: cat.prefix,
                  ContinuationToken,
                })
                .promise();

              for (const obj of response.Contents || []) {
                totalSize += obj.Size;
                count++;
              }
              ContinuationToken = response.NextContinuationToken;
            } while (ContinuationToken);
          } catch (err) {
            logger.warn(
              `dashboard S3 listing failed (${cat.name}): ${err.message}`
            );
          }

          return { name: cat.name, count, totalSize };
        })
      );
    } catch (err) {
      logger.warn(`dashboard storage stats unavailable: ${err.message}`);
    }

    // ── 4. AI Token Usage (academy-wide; AIUsageLog has no school field) ──
    let aiUsage = {
      daily: [],
      total: {
        requests: 0,
        totalTokens: 0,
        promptTokens: 0,
        candidatesTokens: 0,
        thoughtsTokens: 0,
      },
      totalAlts: 0,
      tokensPerAlt: TOKENS_PER_ALT,
      topUsers: [],
      byFeature: [],
    };
    let previousAiAgg = null;
    try {
      const windowStart = new Date();
      windowStart.setUTCHours(0, 0, 0, 0);
      windowStart.setUTCDate(windowStart.getUTCDate() - (period * 2 - 1));

      const recentLogs = await AIUsageLog(academyId)
        .find({ createdAt: { $gte: windowStart } })
        .select(
          "user userId userName feature model provider totalTokens promptTokens candidatesTokens thoughtsTokens createdAt"
        )
        .lean();

      const currentDailyMap = {};
      for (const key of currentDates) {
        currentDailyMap[key] = { date: key, requests: 0, totalTokens: 0 };
      }
      const previousDailyMap = {};
      for (const key of previousDates) {
        previousDailyMap[key] = { date: key, requests: 0, totalTokens: 0 };
      }

      const periodLogs = [];
      for (const log of recentLogs) {
        const key = toDateKey(new Date(log.createdAt));
        if (currentDailyMap[key]) {
          currentDailyMap[key].requests++;
          currentDailyMap[key].totalTokens += log.totalTokens || 0;
          periodLogs.push(log);
        } else if (previousDailyMap[key]) {
          previousDailyMap[key].requests++;
          previousDailyMap[key].totalTokens += log.totalTokens || 0;
        }
      }

      aiUsage.daily = currentDates.map((d) => currentDailyMap[d]);
      previousAiAgg = aggregateAiDaily(
        previousDates.map((d) => previousDailyMap[d])
      );

      const details = aggregateAiPeriodDetails(periodLogs, 10);
      aiUsage.totalAlts = details.totalAlts;
      aiUsage.tokensPerAlt = details.tokensPerAlt;
      aiUsage.topUsers = details.topUsers;
      aiUsage.byFeature = details.byFeature;

      const totalCount = await AIUsageLog(academyId).countDocuments();
      const totalAgg = await AIUsageLog(academyId).aggregate([
        {
          $group: {
            _id: null,
            totalTokens: { $sum: "$totalTokens" },
            promptTokens: { $sum: "$promptTokens" },
            candidatesTokens: { $sum: "$candidatesTokens" },
            thoughtsTokens: { $sum: "$thoughtsTokens" },
          },
        },
      ]);

      aiUsage.total = {
        requests: totalCount,
        totalTokens: totalAgg[0]?.totalTokens || 0,
        promptTokens: totalAgg[0]?.promptTokens || 0,
        candidatesTokens: totalAgg[0]?.candidatesTokens || 0,
        thoughtsTokens: totalAgg[0]?.thoughtsTokens || 0,
      };
    } catch (err) {
      logger.warn(`dashboard AI usage unavailable: ${err.message}`);
    }

    const trafficCurrent = aggregateTraffic(trafficStats);
    const aiPeriodCurrent = aggregateAiDaily(aiUsage.daily);

    const deltas = {
      summary: buildFieldDeltas(summary, previousSummary),
      traffic: buildFieldDeltas(trafficCurrent, previousTrafficAgg),
      ai: buildFieldDeltas(aiPeriodCurrent, previousAiAgg),
    };

    return res.status(200).send({
      dashboard: {
        summary,
        seasonStats,
        trafficStats,
        storageStats,
        aiUsage,
        deltas,
        meta: {
          period,
          scope,
          academyOnlyMetrics: ["traffic", "storage", "ai"],
          comparedTo: previousSummary ? "previousSeason" : null,
          trafficComparedTo: "previousPeriod",
        },
      },
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RSchoolAiConfig API
 * @description 학교 AI 설정 조회
 */
export const findAiConfig = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }
    ensureAiConfig(school);
    // skillTags로 libraryItemIds를 강제 복구하지 않음 — 스킬 설정 체크 해제가 유지되어야 함
    return res.status(200).send({ aiConfig: school.aiConfig });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolAiConfig API
 * @description 학교 AI 권한·스킬 설정 업데이트
 */
export const updateAiConfig = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const aiConfig = ensureAiConfig(school);

    if (req.body.permission && typeof req.body.permission === "object") {
      if ("teacher" in req.body.permission) {
        aiConfig.permission.teacher = !!req.body.permission.teacher;
      }
      if ("student" in req.body.permission) {
        aiConfig.permission.student = !!req.body.permission.student;
      }
      // 권한만 저장해도 학교 설정이 권위가 되도록 빈 스킬 슬롯을 시드
      if (
        !aiConfig.skills ||
        typeof aiConfig.skills !== "object" ||
        Object.keys(aiConfig.skills).length === 0
      ) {
        aiConfig.skills = Object.fromEntries(
          VALID_SKILL_IDS.map((id) => [
            id,
            {
              instructions: "",
              libraryItemIds: [],
            },
          ])
        );
      }
    }

    if (req.body.skills && typeof req.body.skills === "object") {
      const nextSkills = { ...(aiConfig.skills || {}) };
      for (const skillId of Object.keys(req.body.skills)) {
        if (!VALID_SKILL_IDS.includes(skillId)) {
          return res.status(400).send({ message: FIELD_INVALID("skills") });
        }
        nextSkills[skillId] = await normalizeSkillConfig(
          req.user.academyId,
          school._id,
          skillId,
          req.body.skills[skillId] || {}
        );
      }
      aiConfig.skills = nextSkills;
    }

    school.aiConfig = aiConfig;
    school.markModified("aiConfig");
    await school.save();

    return res.status(200).send({ aiConfig: school.aiConfig });
  } catch (err) {
    logger.error(err.message);
    return res
      .status(err.status || 500)
      .send({ message: err.message || "서버 오류가 발생했습니다." });
  }
};

const sendLibraryError = (res, err) => {
  logger.error(err.message);
  return res
    .status(err.status || 500)
    .send({ message: err.message || "서버 오류가 발생했습니다." });
};

/**
 * @memberof APIs.SchoolAPI
 * @function RSchoolAiLibrary API
 * @description 학교 AI 라이브러리 목록 (공식·공유·본인 개인)
 */
export const listAiLibrary = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }
    const items = await listLibraryItems({
      academyId: req.user.academyId,
      schoolId: school._id,
      userId: req.user._id,
      kind: req.query.kind,
      visibility: req.query.visibility,
    });
    return res.status(200).send({ items });
  } catch (err) {
    return sendLibraryError(res, err);
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function CSchoolAiLibraryItem API
 * @description 학교 공식 AI 라이브러리 텍스트 항목 추가
 */
export const createAiLibraryItem = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }
    const item = await createLibraryItemDoc({
      academyId: req.user.academyId,
      school,
      user: req.user,
      isStaff: true,
      body: { ...(req.body || {}), visibility: "school" },
    });
    return res.status(200).send({ item, aiConfig: school.aiConfig });
  } catch (err) {
    return sendLibraryError(res, err);
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function USchoolAiLibraryItem API
 * @description 학교 AI 라이브러리 항목 수정
 */
export const updateAiLibraryItem = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }
    const item = await updateLibraryItemDoc({
      academyId: req.user.academyId,
      school,
      user: req.user,
      isStaff: true,
      itemId: req.params.itemId,
      body: req.body || {},
    });
    return res.status(200).send({ item, aiConfig: school.aiConfig });
  } catch (err) {
    return sendLibraryError(res, err);
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function DSchoolAiLibraryItem API
 * @description 학교 AI 라이브러리 항목 삭제
 */
export const deleteAiLibraryItem = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }
    await deleteLibraryItemDoc({
      academyId: req.user.academyId,
      school,
      user: req.user,
      isStaff: true,
      itemId: req.params.itemId,
    });
    return res.status(200).send({ success: true });
  } catch (err) {
    return sendLibraryError(res, err);
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function CSchoolAiLibraryUpload API
 * @description 학교 공식 AI 라이브러리 파일 업로드
 */
export const uploadAiLibraryItem = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    schoolAiLibraryMulter(req.params._id).single("file")(req, res, async (err) => {
      try {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res
              .status(400)
              .send({ message: "파일 크기는 10MB를 초과할 수 없습니다." });
          }
          if (err.code === "INVALID_FILE_TYPE") {
            return res.status(400).send({
              message:
                "지원하지 않는 파일 형식입니다. PDF, DOCX, TXT, HWP 파일만 업로드할 수 있습니다.",
            });
          }
          return res.status(500).send({ message: "서버 오류가 발생했습니다." });
        }

        if (!req.file) {
          return res.status(400).send({ message: FIELD_REQUIRED("file") });
        }

        if (!(await tryCommitUpload(res, req.user.academyId, req.file))) {
          return;
        }

        const s3Object = await fileS3
          .getObject({ Bucket: fileBucket, Key: req.tmp.key })
          .promise();
        const extracted = await extractText(s3Object.Body, req.file.mimetype);
        const contentLimit = PROMPT_LIMITS.LIBRARY_CONTENT_CHARS || 200000;
        const content = truncateText(extracted || "", contentLimit);
        const contentLength = content.length;
        let extractWarning;
        if (!contentLength) {
          extractWarning =
            "텍스트를 추출하지 못했습니다. 스캔 PDF이거나 지원되지 않는 형식일 수 있습니다.";
        } else if (
          req.file.mimetype === "application/pdf" &&
          contentLength < 80
        ) {
          extractWarning =
            "추출된 텍스트가 매우 짧습니다. 스캔본이면 OCR이 필요할 수 있습니다.";
        } else if ((extracted || "").length > contentLimit) {
          extractWarning = `본문이 저장 상한(${contentLimit}자)을 넘어 앞부분만 저장했습니다.`;
        }

        const item = await createLibraryItemDoc({
          academyId: req.user.academyId,
          school,
          user: req.user,
          isStaff: true,
          body: {
            kind: req.body.kind,
            visibility: "school",
            title: req.body.title || req.file.originalname,
            content,
            skillTags: req.body.skillTags,
          },
          fileMeta: {
            fileName: req.file.originalname,
            fileKey: req.tmp.key,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
          },
        });

        return res.status(200).send({
          item,
          aiConfig: school.aiConfig,
          contentLength,
          extractWarning,
        });
      } catch (innerErr) {
        return sendLibraryError(res, innerErr);
      }
    });
  } catch (err) {
    return sendLibraryError(res, err);
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RSchoolAiLibraryDownload API
 * @description 학교 AI 라이브러리 파일 다운로드 URL
 */
export const downloadAiLibraryItem = async (req, res) => {
  try {
    const url = await downloadLibraryItemUrl({
      academyId: req.user.academyId,
      schoolId: req.params._id,
      userId: req.user._id,
      itemId: req.params.itemId,
    });
    return res.status(200).send({ url });
  } catch (err) {
    return sendLibraryError(res, err);
  }
};

