/**
 * AI 라이브러리 CRUD·스킬 동기화
 */
import { logger } from "../log/logger.js";
import { AiLibraryItem, School } from "../models/index.js";
import {
  deleteChunksForItem,
  rebuildChunksForItem,
} from "./aiLibraryChunks.js";
import { fileS3, fileBucket, signUrl } from "../_s3/fileBucket.js";
import { PROMPT_LIMITS, truncateText } from "./aiPromptPolicy.js";
import { FIELD_INVALID, PERMISSION_DENIED, __NOT_FOUND } from "../messages/index.js";
import {
  LIBRARY_KINDS,
  LIBRARY_SKILL_IDS,
  TEACHER_LIBRARY_ITEM_CAP,
  canCreateLibraryItem,
  canPromoteLibraryItem,
  canReadLibraryItem,
  canWriteLibraryItem,
  isSchoolOfficialVisibility,
  ownerEquals,
  parseSkillTags,
  resolveCreateKind,
  resolveCreateVisibility,
  schoolOfficialMatch,
  visibleListFilter,
} from "./aiLibraryAcl.js";

const MAX_LIBRARY_ITEMS_PER_SKILL = 20;

const throwHttp = (status, message, code) => {
  const err = new Error(message);
  err.status = status;
  err.code = code || message;
  throw err;
};

const defaultAiConfig = () => ({
  permission: { teacher: false, student: false },
  skills: {},
});

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
 * 학교 공식 항목만 스킬 libraryItemIds에 동기화
 * @param {"create"|"update"} [mode]
 * @returns {boolean}
 */
export const syncLibraryItemToSkills = (
  school,
  item,
  mode = "create",
  previousTags = []
) => {
  if (!isSchoolOfficialVisibility(item?.visibility)) {
    return false;
  }
  const aiConfig = ensureAiConfig(school);
  const itemId = String(item._id);
  const tags = parseSkillTags(item.skillTags);
  if (tags.length === 0) {
    return false;
  }

  const targetSkills = new Set(tags);
  const prevSkills = new Set(parseSkillTags(previousTags));
  let changed = false;

  for (const skillId of LIBRARY_SKILL_IDS) {
    const slot = ensureSkillSlot(aiConfig, skillId);
    const ids = slot.libraryItemIds.map(String);
    const shouldHave = targetSkills.has(skillId);
    const newlyTagged = shouldHave && !prevSkills.has(skillId);
    const shouldAdd = mode === "create" ? shouldHave : newlyTagged;

    if (shouldAdd && !ids.includes(itemId)) {
      slot.libraryItemIds = [...ids, itemId].slice(
        0,
        MAX_LIBRARY_ITEMS_PER_SKILL
      );
      changed = true;
    } else if (
      !shouldHave &&
      ids.includes(itemId) &&
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

export const unlinkLibraryItemFromSkills = (school, itemId) => {
  if (!school?.aiConfig?.skills) return false;
  const id = String(itemId);
  let changed = false;
  for (const skillId of Object.keys(school.aiConfig.skills)) {
    const cfg = school.aiConfig.skills[skillId];
    if (!cfg?.libraryItemIds?.length) continue;
    const next = cfg.libraryItemIds.filter((x) => String(x) !== id);
    if (next.length !== cfg.libraryItemIds.length) {
      cfg.libraryItemIds = next;
      changed = true;
    }
  }
  if (changed) {
    school.markModified("aiConfig");
  }
  return changed;
};

export const assertSchoolOfficialLibraryIds = async (
  academyId,
  schoolId,
  libraryItemIds
) => {
  if (!libraryItemIds.length) return;
  const count = await AiLibraryItem(academyId).countDocuments({
    _id: { $in: libraryItemIds },
    school: schoolId,
    ...schoolOfficialMatch,
  });
  if (count !== libraryItemIds.length) {
    const err = new Error(FIELD_INVALID("libraryItemIds"));
    err.status = 400;
    throw err;
  }
};

const ownerFields = (user) => ({
  owner: user?._id,
  ownerId: user?.userId || "",
  ownerName: user?.userName || "",
});

const assertTeacherCap = async (academyId, schoolId, userId) => {
  const count = await AiLibraryItem(academyId).countDocuments({
    school: schoolId,
    owner: userId,
    visibility: { $in: ["personal", "shared"] },
  });
  if (count >= TEACHER_LIBRARY_ITEM_CAP) {
    throwHttp(
      400,
      `개인·공유 학습정보는 최대 ${TEACHER_LIBRARY_ITEM_CAP}개까지 등록할 수 있습니다.`
    );
  }
};

export const listLibraryItems = async ({
  academyId,
  schoolId,
  userId,
  kind,
  visibility,
}) => {
  let filter;
  if (visibility === "school") {
    filter = { school: schoolId, ...schoolOfficialMatch };
  } else if (visibility === "shared") {
    filter = { school: schoolId, visibility: "shared" };
  } else if (visibility === "personal") {
    filter = { school: schoolId, visibility: "personal", owner: userId };
  } else {
    filter = visibleListFilter(schoolId, userId);
  }
  if (LIBRARY_KINDS.includes(kind)) {
    filter.kind = kind;
  }

  return AiLibraryItem(academyId).find(filter).sort({ updatedAt: -1 }).lean();
};

export const getLibraryItem = async ({ academyId, schoolId, userId, itemId }) => {
  const item = await AiLibraryItem(academyId)
    .findOne({ _id: itemId, school: schoolId })
    .lean();
  if (!item || !canReadLibraryItem(item, userId)) {
    throwHttp(404, __NOT_FOUND("library item"));
  }
  return item;
};

export const createLibraryItemDoc = async ({
  academyId,
  school,
  user,
  isStaff,
  body = {},
  fileMeta = null,
}) => {
  const kind = resolveCreateKind(body.kind);
  const visibility = resolveCreateVisibility({
    isStaff,
    visibility: body.visibility,
  });
  if (!canCreateLibraryItem({ isStaff, kind, visibility })) {
    throwHttp(403, PERMISSION_DENIED);
  }
  if (!isStaff) {
    await assertTeacherCap(academyId, school._id, user._id);
  }

  const title = truncateText(
    body.title || fileMeta?.fileName || "제목 없음",
    PROMPT_LIMITS.REFERENCE_TITLE_CHARS
  );
  const content = truncateText(
    body.content || "",
    PROMPT_LIMITS.LIBRARY_CONTENT_CHARS || 200000
  );
  const skillTags = parseSkillTags(body.skillTags);

  const item = await AiLibraryItem(academyId).create({
    school: school._id,
    kind,
    visibility,
    ...ownerFields(user),
    title,
    content,
    skillTags,
    ...(fileMeta || {}),
  });

  if (syncLibraryItemToSkills(school, item, "create")) {
    await school.save();
  }
  try {
    await rebuildChunksForItem(academyId, item);
  } catch (chunkErr) {
    logger.error(chunkErr.message);
  }
  return item;
};

export const updateLibraryItemDoc = async ({
  academyId,
  school,
  user,
  isStaff,
  itemId,
  body = {},
}) => {
  const item = await AiLibraryItem(academyId).findOne({
    _id: itemId,
    school: school._id,
  });
  if (!item) {
    throwHttp(404, __NOT_FOUND("library item"));
  }
  if (!canWriteLibraryItem(item, { userId: user._id, isStaff })) {
    throwHttp(403, PERMISSION_DENIED);
  }

  const previousTags = Array.isArray(item.skillTags)
    ? item.skillTags.map(String)
    : [];
  const promote =
    body.visibility === "school" &&
    canPromoteLibraryItem(item, { isStaff });

  if (LIBRARY_KINDS.includes(body.kind)) {
    if (body.kind === "instruction" && !isStaff) {
      throwHttp(403, PERMISSION_DENIED);
    }
    item.kind = body.kind;
  }
  if ("title" in body) {
    item.title = truncateText(
      body.title || "",
      PROMPT_LIMITS.REFERENCE_TITLE_CHARS
    );
  }
  if ("content" in body) {
    item.content = truncateText(
      body.content || "",
      PROMPT_LIMITS.LIBRARY_CONTENT_CHARS || 200000
    );
  }
  if (Array.isArray(body.skillTags) || typeof body.skillTags === "string") {
    item.skillTags = parseSkillTags(body.skillTags);
  }
  if (promote) {
    item.visibility = "school";
  } else if (
    body.visibility === "personal" ||
    body.visibility === "shared"
  ) {
    if (isSchoolOfficialVisibility(item.visibility) && !isStaff) {
      throwHttp(403, PERMISSION_DENIED);
    }
    if (!isStaff && !ownerEquals(item, user._id)) {
      throwHttp(403, PERMISSION_DENIED);
    }
    item.visibility = body.visibility;
  } else if (body.visibility === "school" && !promote) {
    if (!isStaff) throwHttp(403, PERMISSION_DENIED);
    item.visibility = "school";
  }

  await item.save();
  const syncMode = promote ? "create" : "update";
  if (syncLibraryItemToSkills(school, item, syncMode, previousTags)) {
    await school.save();
  }
  if ("content" in body || "title" in body || "kind" in body) {
    try {
      await rebuildChunksForItem(academyId, item);
    } catch (chunkErr) {
      logger.error(chunkErr.message);
    }
  }
  return item;
};

export const deleteLibraryItemDoc = async ({
  academyId,
  school,
  user,
  isStaff,
  itemId,
}) => {
  const item = await AiLibraryItem(academyId).findOne({
    _id: itemId,
    school: school._id,
  });
  if (!item) {
    throwHttp(404, __NOT_FOUND("library item"));
  }
  if (!canWriteLibraryItem(item, { userId: user._id, isStaff })) {
    throwHttp(403, PERMISSION_DENIED);
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

  if (unlinkLibraryItemFromSkills(school, item._id)) {
    await school.save();
  }
  try {
    await deleteChunksForItem(academyId, item._id);
  } catch (chunkErr) {
    logger.error(chunkErr.message);
  }
  await item.deleteOne();
  return { success: true };
};

export const downloadLibraryItemUrl = async ({
  academyId,
  schoolId,
  userId,
  itemId,
}) => {
  const item = await getLibraryItem({
    academyId,
    schoolId,
    userId,
    itemId,
  });
  if (!item.fileKey) {
    throwHttp(404, __NOT_FOUND("library file"));
  }
  const { preSignedUrl } = signUrl(item.fileKey, item.fileName, 300);
  return preSignedUrl;
};

export const loadSchoolForLibrary = async (academyId, schoolId) => {
  const school = await School(academyId).findById(schoolId);
  if (!school) {
    throwHttp(404, __NOT_FOUND("school"));
  }
  return school;
};
