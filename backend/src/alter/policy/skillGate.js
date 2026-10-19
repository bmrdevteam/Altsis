/**
 * One skill gate for live chat and eval.
 * Order: student, academy flag, role, chip, then confirmation.
 * Flags apply to every role, including owner.
 */

import { resolveSkillMeta } from "../core/skillMeta.js";

const FLAG_LABEL = {
  webSearchEnabled: "웹 검색",
  imageGenEnabled: "이미지 생성",
  alterEventTriggersEnabled: "이벤트 예약",
};

const OPEN_CHIPS = new Set(["", "chat", "agent"]);

const batchim = (label) => {
  const last = String(label || "").charCodeAt(String(label || "").length - 1);
  if (!last || last < 0xac00 || last > 0xd7a3) return "이";
  return (last - 0xac00) % 28 === 0 ? "가" : "이";
};

const flagLabel = (flags) => {
  const names = (flags || []).map((flag) => FLAG_LABEL[flag] || "이 기능");
  if (names.length <= 1) return names[0] || "이 기능";
  return names.join("·");
};

const deny = (reasonCode, userMessage, nextAction) => ({
  decision: "deny",
  reasonCode,
  userMessage,
  nextAction,
  stage: null,
});

const allow = () => ({
  decision: "allow",
  reasonCode: "ALLOW",
  userMessage: "",
  nextAction: null,
  stage: null,
});

/**
 * @param {object} [ctx]
 */
export const actorFromAlterCtx = (ctx = {}) => {
  const auth = String(ctx.user?.auth || "");
  const registrationRole = String(ctx.registration?.role || "");
  const schoolManager = ctx.isSchoolManager === true || auth === "admin" || auth === "manager";
  let role = "member";
  if (auth === "owner") role = "owner";
  else if (auth === "admin") role = "admin";
  else if (schoolManager) role = "manager";
  else if (registrationRole === "teacher") role = "teacher";
  else if (registrationRole === "student" || auth === "student") role = "student";
  return {
    auth,
    registrationRole,
    role,
    student: role === "student",
    schoolManager,
  };
};

export const flagsFromAcademy = (academy = {}) => ({
  webSearchEnabled: academy?.webSearchEnabled === true,
  imageGenEnabled: academy?.imageGenEnabled === true,
  alterEventTriggersEnabled: academy?.alterEventTriggersEnabled === true,
});

export const buildSkillGate = (ctx = {}, skill = null) => ({
  actor: actorFromAlterCtx(ctx),
  flags: flagsFromAcademy(ctx.academy),
  chip: skill
    ? {
        id: skill.id,
        title: skill.name || skill.meta?.title || skill.id,
        allowedTools: skill.meta?.allowedTools || skill.tools || [],
      }
    : null,
});

const flagMessage = (meta, actor) => {
  const label = flagLabel(meta.requiredFlags);
  const particle = batchim(label);
  const off = `이 학원은 ${label}${particle} 꺼져 있습니다. 학원 소유자가 AI 설정에서 켤 수 있습니다.`;
  if (actor?.role === "owner") return off;
  return `${off} 플랫폼 관리자에게 활성화를 요청할 수 있습니다.`;
};

const chipMessage = (chip) => {
  const title = String(chip?.title || "선택한").trim() || "선택한";
  return `지금은 '${title}' 스킬로 제한된 대화라 이 기능은 실행하지 않았습니다. 칩을 해제하거나 다른 칩을 선택해 주세요.`;
};

/**
 * @param {{ actor?: object, flags?: object, chip?: object|null, capability?: object, phase?: "list"|"execute" }} input
 */
export const evaluateSkillAccess = ({
  actor = {},
  flags = {},
  chip = null,
  capability = {},
  phase = "execute",
} = {}) => {
  const meta = resolveSkillMeta(capability || {});
  if (actor?.student && meta.studentAllowed !== true) {
    return deny("STUDENT_DENIED", "이 기능은 학생 계정에서 사용할 수 없습니다.", "none");
  }
  for (const flag of meta.requiredFlags) {
    if (flags?.[flag] !== true) {
      return deny(
        "FLAG_OFF",
        flagMessage(meta, actor),
        actor?.role === "owner" ? "enable_flag" : "ask_platform_admin"
      );
    }
  }
  if (meta.requiredRoles.length && !meta.requiredRoles.includes(actor?.role)) {
    const title = meta.title || "이 기능";
    return deny("ROLE_DENIED", `${title}은 허용된 역할만 사용할 수 있습니다.`, "none");
  }
  const chipId = String(chip?.id || "");
  if (chipId && !OPEN_CHIPS.has(chipId)) {
    const allowed = new Set([chipId, ...(chip.allowedTools || [])]);
    if (!allowed.has(meta.id)) {
      return deny("CHIP_SCOPE", chipMessage(chip), "clear_chip");
    }
  }
  if (meta.channel === "dispatch" && meta.confirmation !== "none" && phase === "execute") {
    return {
      decision: "needs_confirmation",
      reasonCode: "CONFIRMATION_REQUIRED",
      userMessage: "",
      nextAction: "confirm",
      stage: meta.confirmation === "both" ? "before_execute" : "before_apply",
    };
  }
  return allow();
};

export const allowListedTool = (tool, skillGate) => {
  if (!skillGate) return true;
  return (
    evaluateSkillAccess({
      actor: skillGate.actor,
      flags: skillGate.flags,
      chip: skillGate.chip,
      capability: tool?.meta,
      phase: "list",
    }).decision === "allow"
  );
};

export const guardToolExecute = (tool, skillGate) => {
  if (!skillGate || !tool || typeof tool.execute !== "function") return tool;
  const execute = tool.execute.bind(tool);
  return {
    ...tool,
    async execute(serverCtx, args) {
      const decision = evaluateSkillAccess({
        actor: skillGate.actor,
        flags: skillGate.flags,
        chip: skillGate.chip,
        capability: tool.meta,
        phase: "execute",
      });
      if (decision.decision === "deny") {
        const err = new Error(decision.userMessage);
        err.gateDenial = true;
        err.code = decision.reasonCode;
        throw err;
      }
      return execute(serverCtx, args);
    },
  };
};
