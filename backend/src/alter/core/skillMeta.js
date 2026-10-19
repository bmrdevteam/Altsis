/**
 * Skill metadata and confirmation defaults. No domain imports.
 * Empty metadata is treated as the strictest case: write, both, student denied.
 */

export const SKILL_KINDS = Object.freeze(["read", "draft", "write"]);
export const SKILL_CHANNELS = Object.freeze(["tool", "dispatch"]);
export const CONFIRMATIONS = Object.freeze(["none", "before_apply", "both"]);
export const COST_TIERS = Object.freeze(["low", "high"]);
export const ACTOR_ROLES = Object.freeze([
  "owner",
  "admin",
  "manager",
  "teacher",
  "member",
  "student",
]);

const asList = (value) =>
  (Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean);

/**
 * Registry tools say "teacher" for the staff who already use Alter.
 * That expands to owner, admin, manager, and a season teacher.
 * @param {string[]} roles
 */
export const expandActorRoles = (roles = []) => {
  const out = [];
  const add = (role) => {
    if (role && !out.includes(role)) out.push(role);
  };
  for (const role of asList(roles)) {
    if (role === "teacher") {
      ["owner", "admin", "manager", "teacher"].forEach(add);
    } else add(role);
  }
  return out;
};

/** @param {{ kind?: string, costTier?: string }} input */
export const defaultConfirmation = ({ kind, costTier } = {}) => {
  if (kind === "read") return "none";
  if (kind === "write") return "both";
  if (kind === "draft" && costTier === "high") return "both";
  if (kind === "draft") return "before_apply";
  return "both";
};

/**
 * @param {object} [raw]
 * @returns {object}
 */
export const resolveSkillMeta = (raw = {}) => {
  const kind = SKILL_KINDS.includes(raw.kind) ? raw.kind : "write";
  const costTier = raw.costTier === "high" || raw.costTier === "low"
    ? raw.costTier
    : kind === "read"
      ? "low"
      : "high";
  const fallback = defaultConfirmation({ kind, costTier });
  const requested = CONFIRMATIONS.includes(raw.confirmation) ? raw.confirmation : null;
  if (kind === "write" && requested && requested !== "both") {
    throw new Error(`${raw.id || "skill"} write 확인은 both 보다 약할 수 없습니다.`);
  }
  const confirmation = requested || fallback;
  const channel = raw.channel === "dispatch" || raw.channel === "tool"
    ? raw.channel
    : kind === "read"
      ? "tool"
      : "dispatch";
  const intended = raw.intendedChannel === "dispatch" || raw.intendedChannel === "tool"
    ? raw.intendedChannel
    : channel;
  return {
    id: String(raw.id || "").trim(),
    title: String(raw.title || raw.name || raw.id || "").trim(),
    description: String(raw.description || "").trim(),
    kind,
    channel,
    intendedChannel: intended,
    requiredRoles: asList(raw.requiredRoles),
    requiredFlags: asList(raw.requiredFlags),
    costTier,
    confirmation,
    allowedTools: asList(raw.allowedTools),
    studentAllowed: raw.studentAllowed === true,
    screens: asList(raw.screens),
    reversible: raw.reversible === true,
    piiSensitive: raw.piiSensitive === true,
  };
};
