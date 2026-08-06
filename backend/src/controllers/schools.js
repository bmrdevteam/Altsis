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
  AiLibraryItem,
  AIUsageLog,
  Archive,
  Board,
  Enrollment,
  Registration,
  RequestStat,
  School,
  Season,
  Syllabus,
  User,
} from "../models/index.js";
import {
  deleteChunksForItem,
  rebuildChunksForItem,
} from "../services/aiLibraryChunks.js";
import { profileS3, profileBucket } from "../_s3/profileBucket.js";
import { fileS3, fileBucket, signUrl } from "../_s3/fileBucket.js";
import { schoolAiLibraryMulter } from "../_s3/aiRefMulter.js";
import { extractText } from "../utils/textExtractor.js";
import {
  normalizeGuidelines,
  PROMPT_LIMITS,
  truncateText,
} from "../services/aiPromptPolicy.js";
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
  "assessment-grade",
];
const LEGACY_SKILL_IDS = { "syllabus-review": "syllabus-draft" };
const VALID_LIBRARY_KINDS = ["instruction", "learning"];
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

const normalizeSkillTag = (tag) => LEGACY_SKILL_IDS[tag] || tag;

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

/**
 * 라이브러리 항목의 skillTags → 스킬 libraryItemIds 동기화.
 * - skillTags 비어 있음: 노출만. libraryItemIds는 스킬 설정 체크박스가 담당 (변경 없음)
 * - mode "create": 태그된 스킬에 자동 체크(추가)
 * - mode "update": 태그에서 빠진 스킬만 해제, 새로 추가된 태그만 자동 체크.
 *   기존 태그에 대해 수동 해제한 항목은 다시 넣지 않음.
 *   태그에 없던 스킬에 체크박스로만 연결한 항목은 유지
 * @param {"create"|"update"} [mode]
 * @param {string[]} [previousTags] update 시 이전 skillTags
 * @returns {boolean} 변경 여부
 */
const syncLibraryItemToSkills = (
  school,
  item,
  mode = "create",
  previousTags = []
) => {
  const aiConfig = ensureAiConfig(school);
  const itemId = String(item._id);
  const tags = Array.isArray(item.skillTags)
    ? item.skillTags
        .map(normalizeSkillTag)
        .filter((t) => VALID_SKILL_IDS.includes(t))
    : [];
  if (tags.length === 0) {
    // 태그를 모두 제거한 update → 기존 자동 연결은 유지(수동 체크 상태 존중)
    return false;
  }

  const targetSkills = new Set(tags);
  const prevSkills = new Set(
    (Array.isArray(previousTags) ? previousTags : [])
      .map(normalizeSkillTag)
      .filter((t) => VALID_SKILL_IDS.includes(t))
  );
  let changed = false;

  for (const skillId of VALID_SKILL_IDS) {
    const slot = ensureSkillSlot(aiConfig, skillId);
    const ids = slot.libraryItemIds.map(String);
    const shouldHave = targetSkills.has(skillId);
    const newlyTagged = shouldHave && !prevSkills.has(skillId);
    const shouldAdd =
      mode === "create" ? shouldHave : newlyTagged;

    if (shouldAdd && !ids.includes(itemId)) {
      slot.libraryItemIds = [...ids, itemId].slice(0, MAX_LIBRARY_ITEMS_PER_SKILL);
      changed = true;
    } else if (
      !shouldHave &&
      ids.includes(itemId) &&
      // update: 태그에서 빠진 스킬만 해제 (체크박스로 다른 스킬에 수동 연결한 항목은 유지)
      // create: 태그 밖 스킬에 남지 않도록 정리
      (mode === "create" || prevSkills.has(skillId))
    ) {
      slot.libraryItemIds = ids.filter((id) => id !== itemId);
      changed = true;
    }
  }

  if (changed) {
    school.aiConfig = aiConfig;
    school.markModified("aiConfig");
  }
  return changed;
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
    const count = await AiLibraryItem(academyId).countDocuments({
      _id: { $in: libraryItemIds },
      school: schoolId,
    });
    if (count !== libraryItemIds.length) {
      const err = new Error(FIELD_INVALID("libraryItemIds"));
      err.status = 400;
      throw err;
    }
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
          academyFeatures = {
            chatEnabled: academy.chatEnabled ?? false,
            boardEnabled: academy.boardEnabled ?? true,
            aiEnabled: academy.aiEnabled ?? false,
          };
        }
      } catch (_) {}

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
 * @version 2.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/schools/:_id/dashboard"} req.url
 * @param {Object} req.user - "admin"|"manager"
 *
 * @param {Object} res
 * @param {Object} res.dashboard
 */
export const dashboard = async (req, res) => {
  try {
    const academyId = req.user.academyId;
    const schoolId = req.params._id;

    const school = await School(academyId).findById(schoolId);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    // ── 1. School Stats ──
    const seasons = await Season(academyId)
      .find({ school: schoolId })
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
    };

    const syllabuses = await Syllabus(academyId)
      .find({ season: { $in: activeSeasonIds } })
      .select("classTitle count limit")
      .lean();

    summary.totalCourses = syllabuses.length;
    summary.totalEnrollments = syllabuses.reduce(
      (s, syl) => s + (syl.count || 0),
      0
    );

    const courseFillRates = syllabuses
      .map((syl) => ({
        classTitle: syl.classTitle,
        count: syl.count || 0,
        limit: syl.limit || 0,
        fillRate:
          syl.limit > 0
            ? Math.round(((syl.count || 0) / syl.limit) * 100)
            : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── 2. Board Activity ──
    let boardActivity = [];
    try {
      const boards = await Board(academyId)
        .find({ school: schoolId })
        .select("name postCount")
        .sort({ postCount: -1 })
        .limit(10)
        .lean();
      boardActivity = boards.map((b) => ({
        name: b.name,
        postCount: b.postCount || 0,
      }));
    } catch (_) {}

    // ── 3. Traffic Stats (academy-wide, last 7 days) ──
    let trafficStats = [];
    try {
      const today = new Date();
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const stats = await RequestStat(academyId)
        .find({ date: { $in: dates } })
        .lean();
      trafficStats = dates.map((date) => {
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
      });
    } catch (_) {}

    // ── 4. S3 Storage Stats (academy-wide) ──
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
          } catch (_) {}

          return { name: cat.name, count, totalSize };
        })
      );
    } catch (_) {}

    // ── 5. AI Token Usage (academy-wide, last 7 days + total) ──
    let aiUsage = { daily: [], total: { requests: 0, totalTokens: 0 } };
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const recentLogs = await AIUsageLog(academyId)
        .find({ createdAt: { $gte: sevenDaysAgo } })
        .select("totalTokens promptTokens candidatesTokens createdAt")
        .lean();

      // Group by date
      const dailyMap = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { date: key, requests: 0, totalTokens: 0 };
      }

      for (const log of recentLogs) {
        const key = log.createdAt.toISOString().slice(0, 10);
        if (dailyMap[key]) {
          dailyMap[key].requests++;
          dailyMap[key].totalTokens += log.totalTokens || 0;
        }
      }

      aiUsage.daily = Object.values(dailyMap);

      // Total counts
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
    } catch (_) {}

    return res.status(200).send({
      dashboard: {
        summary,
        seasonStats,
        courseFillRates,
        boardActivity,
        trafficStats,
        storageStats,
        aiUsage,
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

/**
 * @memberof APIs.SchoolAPI
 * @function RSchoolAiLibrary API
 * @description 학교 AI 라이브러리 목록
 */
export const listAiLibrary = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const filter = { school: school._id };
    if (VALID_LIBRARY_KINDS.includes(req.query.kind)) {
      filter.kind = req.query.kind;
    }

    const items = await AiLibraryItem(req.user.academyId)
      .find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).send({ items });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function CSchoolAiLibraryItem API
 * @description 학교 AI 라이브러리 텍스트 항목 추가
 */
export const createAiLibraryItem = async (req, res) => {
  try {
    const school = await School(req.user.academyId).findById(req.params._id);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const kind = VALID_LIBRARY_KINDS.includes(req.body.kind)
      ? req.body.kind
      : "learning";
    const title = truncateText(
      req.body.title || "제목 없음",
      PROMPT_LIMITS.REFERENCE_TITLE_CHARS
    );
    const content = truncateText(
      req.body.content || "",
      PROMPT_LIMITS.LIBRARY_CONTENT_CHARS || 200000
    );
    const skillTags = Array.isArray(req.body.skillTags)
      ? [
          ...new Set(
            req.body.skillTags
              .map((t) => normalizeSkillTag(String(t || "").trim()))
              .filter((t) => VALID_SKILL_IDS.includes(t))
          ),
        ]
      : [];

    const item = await AiLibraryItem(req.user.academyId).create({
      school: school._id,
      kind,
      title,
      content,
      skillTags,
    });

    if (syncLibraryItemToSkills(school, item, "create")) {
      await school.save();
    }

    try {
      await rebuildChunksForItem(req.user.academyId, item);
    } catch (chunkErr) {
      logger.error(chunkErr.message);
    }

    return res.status(200).send({ item, aiConfig: school.aiConfig });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
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

    const item = await AiLibraryItem(req.user.academyId).findOne({
      _id: req.params.itemId,
      school: req.params._id,
    });
    if (!item) {
      return res.status(404).send({ message: __NOT_FOUND("library item") });
    }

    if (VALID_LIBRARY_KINDS.includes(req.body.kind)) {
      item.kind = req.body.kind;
    }
    if ("title" in req.body) {
      item.title = truncateText(
        req.body.title || "",
        PROMPT_LIMITS.REFERENCE_TITLE_CHARS
      );
    }
    if ("content" in req.body) {
      item.content = truncateText(
        req.body.content || "",
        PROMPT_LIMITS.LIBRARY_CONTENT_CHARS || 200000
      );
    }
    const previousTags = Array.isArray(item.skillTags)
      ? item.skillTags.map(String)
      : [];
    if (Array.isArray(req.body.skillTags)) {
      item.skillTags = [
        ...new Set(
          req.body.skillTags
            .map((t) => normalizeSkillTag(String(t || "").trim()))
            .filter((t) => VALID_SKILL_IDS.includes(t))
        ),
      ];
    }

    await item.save();
    if (syncLibraryItemToSkills(school, item, "update", previousTags)) {
      await school.save();
    }
    if ("content" in req.body || "title" in req.body || "kind" in req.body) {
      try {
        await rebuildChunksForItem(req.user.academyId, item);
      } catch (chunkErr) {
        logger.error(chunkErr.message);
      }
    }
    return res.status(200).send({ item, aiConfig: school.aiConfig });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function DSchoolAiLibraryItem API
 * @description 학교 AI 라이브러리 항목 삭제
 */
export const deleteAiLibraryItem = async (req, res) => {
  try {
    const item = await AiLibraryItem(req.user.academyId).findOne({
      _id: req.params.itemId,
      school: req.params._id,
    });
    if (!item) {
      return res.status(404).send({ message: __NOT_FOUND("library item") });
    }

    if (item.fileKey) {
      try {
        await fileS3
          .deleteObject({ Bucket: fileBucket, Key: item.fileKey })
          .promise();
      } catch (s3Err) {
        logger.error("Failed to delete S3 file: " + s3Err.message);
      }
    }

    // 스킬 선택 목록에서 제거
    const school = await School(req.user.academyId).findById(req.params._id);
    if (school?.aiConfig?.skills) {
      const itemId = String(item._id);
      let changed = false;
      for (const skillId of Object.keys(school.aiConfig.skills)) {
        const cfg = school.aiConfig.skills[skillId];
        if (!cfg?.libraryItemIds?.length) continue;
        const next = cfg.libraryItemIds.filter((id) => String(id) !== itemId);
        if (next.length !== cfg.libraryItemIds.length) {
          cfg.libraryItemIds = next;
          changed = true;
        }
      }
      if (changed) {
        school.markModified("aiConfig");
        await school.save();
      }
    }

    try {
      await deleteChunksForItem(req.user.academyId, item._id);
    } catch (chunkErr) {
      logger.error(chunkErr.message);
    }
    await item.deleteOne();
    return res.status(200).send({ success: true });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function CSchoolAiLibraryUpload API
 * @description 학교 AI 라이브러리 파일 업로드
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

        const kind = VALID_LIBRARY_KINDS.includes(req.body.kind)
          ? req.body.kind
          : "learning";
        const skillTags = req.body.skillTags
          ? [
              ...new Set(
                String(req.body.skillTags)
                  .split(",")
                  .map((t) => normalizeSkillTag(t.trim()))
                  .filter((t) => VALID_SKILL_IDS.includes(t))
              ),
            ]
          : [];

        const item = await AiLibraryItem(req.user.academyId).create({
          school: school._id,
          kind,
          title: truncateText(
            req.body.title || req.file.originalname,
            PROMPT_LIMITS.REFERENCE_TITLE_CHARS
          ),
          content,
          fileName: req.file.originalname,
          fileKey: req.tmp.key,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          skillTags,
        });

        if (syncLibraryItemToSkills(school, item, "create")) {
          await school.save();
        }

        try {
          await rebuildChunksForItem(req.user.academyId, item);
        } catch (chunkErr) {
          logger.error(chunkErr.message);
        }

        return res.status(200).send({
          item,
          aiConfig: school.aiConfig,
          contentLength,
          extractWarning,
        });
      } catch (innerErr) {
        logger.error(innerErr.message);
        return res.status(500).send({ message: innerErr.message });
      }
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SchoolAPI
 * @function RSchoolAiLibraryDownload API
 * @description 학교 AI 라이브러리 파일 다운로드 URL
 */
export const downloadAiLibraryItem = async (req, res) => {
  try {
    const item = await AiLibraryItem(req.user.academyId).findOne({
      _id: req.params.itemId,
      school: req.params._id,
    });
    if (!item || !item.fileKey) {
      return res.status(404).send({ message: __NOT_FOUND("library file") });
    }

    const { preSignedUrl } = signUrl(item.fileKey, item.fileName, 300);
    return res.status(200).send({ url: preSignedUrl });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
