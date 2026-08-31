/**
 * AI 라이브러리 공개 범위·권한 (순수 헬퍼)
 */

export const LIBRARY_KINDS = ["instruction", "learning"];
export const LIBRARY_VISIBILITIES = ["school", "shared", "personal"];
export const TEACHER_LIBRARY_ITEM_CAP = 40;
export const TEACHER_CHAT_LEARNING_CAP = 24;

export const LIBRARY_SKILL_IDS = [
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

export const isStaffAuth = (auth) =>
  auth === "admin" || auth === "manager" || auth === "owner";

export const isSchoolOfficialVisibility = (visibility) =>
  visibility == null || visibility === "" || visibility === "school";

/** Mongo 쿼리: 레거시(필드 없음) + school */
export const schoolOfficialMatch = {
  $or: [
    { visibility: "school" },
    { visibility: { $exists: false } },
    { visibility: null },
  ],
};

/**
 * 목록: 학교 공식 + 공유 + 본인 개인 (타인 personal 제외)
 * @param {string|import("mongoose").Types.ObjectId} schoolId
 * @param {string|import("mongoose").Types.ObjectId} userId
 */
export const visibleListFilter = (schoolId, userId) => ({
  school: schoolId,
  $or: [
    { visibility: "school" },
    { visibility: { $exists: false } },
    { visibility: null },
    { visibility: "shared" },
    { visibility: "personal", owner: userId },
  ],
});

/**
 * 교사 chat 검색에 합칠 본인 학습정보
 */
export const teacherExtraLearningQuery = (schoolId, userId) => ({
  school: schoolId,
  kind: "learning",
  $or: [
    { visibility: "shared" },
    { visibility: "personal", owner: userId },
  ],
});

export const normalizeSkillTag = (tag) =>
  LEGACY_SKILL_IDS[String(tag || "").trim()] || String(tag || "").trim();

export const parseSkillTags = (raw) => {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    list = raw.split(",");
  }
  return [
    ...new Set(
      list
        .map((t) => normalizeSkillTag(t))
        .filter((t) => LIBRARY_SKILL_IDS.includes(t))
    ),
  ];
};

export const ownerEquals = (item, userId) =>
  item?.owner != null && String(item.owner) === String(userId);

export const canReadLibraryItem = (item, userId) => {
  if (!item) return false;
  if (isSchoolOfficialVisibility(item.visibility)) return true;
  if (item.visibility === "shared") return true;
  if (item.visibility === "personal") return ownerEquals(item, userId);
  return false;
};

export const canWriteLibraryItem = (item, { userId, isStaff }) => {
  if (!item) return false;
  if (isSchoolOfficialVisibility(item.visibility)) return !!isStaff;
  if (item.visibility === "shared") {
    return !!isStaff || ownerEquals(item, userId);
  }
  if (item.visibility === "personal") return ownerEquals(item, userId);
  return false;
};

/**
 * @param {{ isStaff: boolean, kind?: string, visibility?: string }} opts
 */
export const canCreateLibraryItem = ({ isStaff, kind, visibility }) => {
  if (kind === "instruction" && !isStaff) return false;
  if (visibility === "school" && !isStaff) return false;
  if (!isStaff) {
    if (kind && kind !== "learning") return false;
    if (visibility && visibility !== "personal" && visibility !== "shared") {
      return false;
    }
  }
  return true;
};

export const canPromoteLibraryItem = (item, { isStaff }) =>
  !!isStaff && item?.visibility === "shared";

export const resolveCreateVisibility = ({ isStaff, visibility }) => {
  if (LIBRARY_VISIBILITIES.includes(visibility)) {
    return visibility;
  }
  return isStaff ? "school" : "personal";
};

export const resolveCreateKind = (kind) =>
  LIBRARY_KINDS.includes(kind) ? kind : "learning";
