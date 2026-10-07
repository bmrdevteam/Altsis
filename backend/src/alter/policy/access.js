/**
 * Single Alter access check. Chat and agent keep the previous
 * assertSeasonAiAccess rules. Schedule create/update adds academy AI off → 403.
 */

import { Academy } from "../../models/Academy.js";
import { Registration, School, Season } from "../../models/index.js";
import { assertCtrlEnabled } from "../../services/entitlement.js";
import { assertAiUserQuota } from "../../services/aiUsageQuota.js";
import { AI_ERRORS } from "../../services/aiPromptPolicy.js";
import { isSchoolManager } from "../../utils/schoolManager.js";
import { FIELD_REQUIRED, __NOT_FOUND } from "../../messages/index.js";
import { AlterError } from "../core/errors.js";

const hasSchoolSkillConfig = (school) =>
  !!(
    school?.aiConfig?.skills &&
    typeof school.aiConfig.skills === "object" &&
    Object.keys(school.aiConfig.skills).length > 0
  );

const findAiPermissionException = (exceptions, user) => {
  const id = String(user?._id || "").trim();
  const login = String(user?.userId || "").trim();
  return (exceptions || []).find(
    (item) =>
      (id && String(item.user) === id) ||
      (login && String(item.userId) === login)
  );
};

const hasSchoolAiPermissionAuthority = (school) => {
  const perm = school?.aiConfig?.permission;
  return (
    hasSchoolSkillConfig(school) ||
    perm?.teacher === true ||
    perm?.student === true ||
    (perm?.exceptions || []).length > 0
  );
};

export const isScheduleTeacher = (_user, registration) =>
  registration?.role === "teacher";

const DM_OPT_IN_MESSAGE =
  "1:1 메시지 내용은 AI 제공자에게 전달됩니다. 예약마다 동의가 필요합니다.";

export const assertDmOptIn = (types, dmOptIn) => {
  const list = Array.isArray(types) ? types : [];
  if (list.includes("dm_received") && dmOptIn !== true) {
    throw new AlterError("DM_OPT_IN_REQUIRED", 400, DM_OPT_IN_MESSAGE);
  }
};

export const assertScheduleOwnership = (user, doc) => {
  if (!doc || String(doc.user) !== String(user?._id)) {
    throw new AlterError("NOT_FOUND", 404, "예약을 찾을 수 없습니다.");
  }
};

const loadAcademy = async (academyId, deps, fields) => {
  if (deps.findAcademy) return deps.findAcademy(academyId);
  const select = fields || "aiEnabled alterEventTriggersEnabled";
  return Academy.findOne({ academyId }).select(select).lean();
};

export const assertEventTriggersEnabled = async (academyId, deps = {}) => {
  const academy = await loadAcademy(academyId, deps, "alterEventTriggersEnabled aiEnabled");
  if (!academy?.alterEventTriggersEnabled) {
    throw new AlterError(
      "EVENT_TRIGGERS_DISABLED",
      403,
      "이벤트 예약은 아카데미 설정에서 켜야 합니다."
    );
  }
  return academy;
};

const assertAcademyAiOn = async (academyId, deps = {}) => {
  const academy = await loadAcademy(academyId, deps, "aiEnabled alterEventTriggersEnabled");
  if (!academy?.aiEnabled) {
    throw new AlterError("AI_NOT_ENABLED", 403, "AI 기능이 활성화되지 않았습니다.");
  }
  return academy;
};

const chatRole = (user, school, registration) =>
  isSchoolManager(user, school?._id) ||
  user?.auth === "owner" ||
  registration?.role === "teacher"
    ? "teacher"
    : "student";

const resolveChatContext = async (academyId, user, seasonId, deps = {}) => {
  if (!seasonId) {
    throw new AlterError("INVALID_INPUT", 400, "학기가 필요합니다.");
  }

  const academy = deps.findAcademy
    ? await deps.findAcademy(academyId)
    : await Academy.findOne({ academyId }, "+aiApiKey");
  if (!academy) {
    throw new AlterError("NOT_FOUND", 404, "아카데미를 찾을 수 없습니다.");
  }
  if (!academy.aiEnabled) {
    throw new AlterError("AI_NOT_ENABLED", 403, "AI 기능이 활성화되지 않았습니다.");
  }
  assertCtrlEnabled(academy);
  if (!academy.aiApiKey) {
    throw new AlterError("AI_API_KEY_NOT_SET", 400, "AI API 키가 설정되지 않았습니다.");
  }

  const season = deps.findSeason
    ? await deps.findSeason(seasonId)
    : await Season(academyId).findById(seasonId);
  if (!season) {
    throw new AlterError("SEASON_NOT_FOUND", 404, "학기를 찾을 수 없습니다.");
  }
  if (!season.aiSettings?.enabled) {
    throw new AlterError(
      "AI_NOT_ENABLED_FOR_SEASON",
      403,
      "이 학기에서 AI 기능이 활성화되지 않았습니다."
    );
  }

  let school = null;
  if (season.school) {
    school = deps.findSchool
      ? await deps.findSchool(season.school)
      : await School(academyId).findById(season.school);
    if (school && school.aiEnabled === false) {
      throw new AlterError("AI_NOT_ENABLED", 403, "AI 기능이 활성화되지 않았습니다.");
    }
  }

  const registration = deps.findRegistration
    ? await deps.findRegistration(seasonId, user._id)
    : await Registration(academyId).findOne({
        season: seasonId,
        user: user._id,
      });
  if (!registration) {
    throw new AlterError("NOT_FOUND", 404, "학기 등록을 찾을 수 없습니다.");
  }

  const useSchoolPerm = hasSchoolAiPermissionAuthority(school);
  const schoolPerm = school?.aiConfig?.permission;
  const seasonPerm = season.aiSettings?.permission;
  const role = chatRole(user, school, registration);
  if (role === "student") {
    throw new AlterError("PERMISSION_DENIED", 403, "권한이 없습니다.");
  }
  const exception = findAiPermissionException(schoolPerm?.exceptions, user);
  const hasPermission = exception
    ? !!exception.isAllowed
    : useSchoolPerm
      ? !!schoolPerm?.teacher
      : !!seasonPerm?.teacher;

  if (!hasPermission) {
    throw new AlterError("PERMISSION_DENIED", 403, "권한이 없습니다.");
  }

  if (!deps.skipQuota) {
    await assertAiUserQuota(academyId, user, academy);
  }

  return {
    academy,
    season,
    school,
    registration,
    role,
    flags: {
      aiEnabled: true,
      seasonAi: true,
      schoolAi: !school || school.aiEnabled !== false,
      eventTriggers: !!academy.alterEventTriggersEnabled,
    },
    config: {
      permission: useSchoolPerm ? schoolPerm || {} : seasonPerm || {},
    },
  };
};

const resolveScheduleContext = async (academyId, user, seasonId, options) => {
  const deps = options.deps || {};
  let season = null;
  let registration = null;
  if (options.requireRole !== false) {
    if (!seasonId) {
      throw new AlterError("INVALID_INPUT", 400, "학기가 필요합니다.");
    }
    season = deps.findSeason
      ? await deps.findSeason(seasonId)
      : await Season(academyId).findById(seasonId).select("school");
    if (!season) {
      throw new AlterError("SEASON_NOT_FOUND", 404, "학기를 찾을 수 없습니다.");
    }
    registration = deps.findRegistration
      ? await deps.findRegistration(seasonId, user._id)
      : await Registration(academyId).findOne({
          season: seasonId,
          user: user._id,
        });
    if (!isScheduleTeacher(user, registration)) {
      throw new AlterError(
        "PERMISSION_DENIED",
        403,
        "예약 실행은 선생님만 사용할 수 있습니다."
      );
    }
  }
  if (options.owned) assertScheduleOwnership(user, options.owned);
  if (options.requireEventTriggers) {
    await assertEventTriggersEnabled(academyId, deps);
  }
  let academy = null;
  if (options.requireAi) {
    academy = await assertAcademyAiOn(academyId, deps);
  }
  if (options.dm) assertDmOptIn(options.dm.types, options.dm.dmOptIn);
  const role = registration
    ? isScheduleTeacher(user, registration)
      ? "teacher"
      : "student"
    : "";
  return {
    academy,
    season,
    school: season?.school ? { _id: season.school } : null,
    registration,
    role,
    flags: {
      aiEnabled: academy ? !!academy.aiEnabled : undefined,
      eventTriggers: academy ? !!academy.alterEventTriggersEnabled : undefined,
    },
    config: {},
  };
};

const resolveLoadedEventContext = (user, seasonId, options) => {
  const loaded = options.loaded || {};
  const actor = user || loaded.user;
  const registration = loaded.registration;
  const academy = loaded.academy;
  if (registration?.role && registration.role !== "teacher") {
    const elevated =
      actor?.auth === "owner" ||
      isSchoolManager(actor, loaded.school?._id || loaded.school);
    if (!elevated) {
      throw new AlterError("PERMISSION_DENIED", 403, "권한이 없습니다.");
    }
  }
  if (academy && academy.aiEnabled === false) {
    throw new AlterError("AI_NOT_ENABLED", 403, "AI 기능이 활성화되지 않았습니다.");
  }
  if (options.dm) assertDmOptIn(options.dm.types, options.dm.dmOptIn);
  return {
    academy: academy || null,
    school: loaded.school || null,
    season: loaded.season || (seasonId ? { _id: seasonId } : null),
    registration: registration || null,
    role:
      registration?.role === "teacher" || actor?.auth === "owner" ? "teacher" : registration?.role || "",
    flags: {
      aiEnabled: academy ? academy.aiEnabled !== false : true,
      eventTriggers: academy ? !!academy.alterEventTriggersEnabled : undefined,
      dmOptIn: loaded.dmOptIn === true,
    },
    config: {},
  };
};

/**
 * Real eval reads the academy provider settings here so the eval runner
 * does not import models. The key stays out of logs in the caller.
 */
export const loadAcademyProviderSettings = async (academyId) => {
  const row = await Academy.findOne({ academyId })
    .select("+aiApiKey aiProvider aiModel")
    .lean();
  if (!row) return null;
  return {
    aiApiKey: String(row.aiApiKey || ""),
    aiProvider: row.aiProvider || "",
    aiModel: row.aiModel || "",
  };
};

/**
 * @param {string} academyId
 * @param {object} user
 * @param {string} [seasonId]
 * @param {{ runner?: "chat"|"agent"|"schedule"|"event", deps?: object, loaded?: object, requireRole?: boolean, requireAi?: boolean, requireEventTriggers?: boolean, owned?: object, dm?: { types?: string[], dmOptIn?: boolean }, skipQuota?: boolean }} [options]
 */
export const resolveAlterContext = async (academyId, user, seasonId, options = {}) => {
  const runner = options.runner || "chat";
  if (runner === "event" && options.loaded) {
    return resolveLoadedEventContext(user, seasonId, options);
  }
  if (runner === "schedule") {
    return resolveScheduleContext(academyId, user, seasonId, options);
  }
  return resolveChatContext(academyId, user, seasonId, {
    ...(options.deps || {}),
    skipQuota: options.skipQuota,
  });
};

/**
 * Admin guidelines template. Same gates as the previous controller block.
 * Returns an error object so the controller can respond before the fallback catch.
 */
export const loadGuidelinesTemplateContext = async (academyId, user, seasonId) => {
  if (!seasonId) {
    return { error: { status: 400, message: FIELD_REQUIRED("season") } };
  }
  const academy = await Academy.findOne({ academyId }, "+aiApiKey");
  if (!academy) {
    return { error: { status: 404, message: __NOT_FOUND("academy") } };
  }
  if (!academy.aiEnabled) {
    return { error: { status: 403, message: AI_ERRORS.NOT_ENABLED } };
  }
  try {
    assertCtrlEnabled(academy);
  } catch (planErr) {
    return {
      error: { status: planErr.status || 403, message: planErr.code || planErr.message },
    };
  }
  if (!academy.aiApiKey) {
    return { error: { status: 400, message: AI_ERRORS.API_KEY_NOT_SET } };
  }
  const season = await Season(academyId).findById(seasonId);
  if (!season) {
    return { error: { status: 404, message: __NOT_FOUND("season") } };
  }
  let school = null;
  let schoolName = "";
  if (season.school) {
    school = await School(academyId).findById(season.school);
    if (school && school.aiEnabled === false) {
      return { error: { status: 403, message: AI_ERRORS.NOT_ENABLED } };
    }
    schoolName = school?.schoolName || "";
  }
  try {
    await assertAiUserQuota(academyId, user, academy);
  } catch (quotaErr) {
    return {
      error: { status: quotaErr.status || 403, message: quotaErr.code || quotaErr.message },
    };
  }
  return { academy, season, school, schoolName };
};
