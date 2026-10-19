/**
 * Skill runner. Selects one skill and calls runAlterAgent with only its tools.
 * Step limits stay the agent's limits unless the caller passes a tighter cap.
 */

import { AlterError } from "../../core/errors.js";
import { buildSkillGate } from "../../policy/skillGate.js";
import { guardAlterAgent, prepareAlterAgentCall } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { getCapability } from "../../skills/catalog.js";
import { resolveSkillForTurn, toolsForSkill } from "../../skills/registry.js";

const depsFor = (mode, ctx = {}) => {
  if (mode === "event") return { includeScheduleTool: false, includeTriggerTool: true };
  if (mode === "schedule") return { includeScheduleTool: false, includeTriggerTool: false };
  return {
    includeScheduleTool: ctx.allowScheduleTool !== false,
    includeTriggerTool: Array.isArray(ctx.triggerEvents),
  };
};

/** Shared by the live chat runner and the skill runner. */
export const prepareGatedTurn = (args = {}) => {
  const prepared = prepareAlterAgentCall(args);
  const role = String(prepared.ctx.registration?.role || "");
  const skill = resolveSkillForTurn({
    message: prepared.input.message,
    role,
    skillId: args.skillId,
  });
  const skillGate = buildSkillGate(prepared.ctx, skill);
  const requestedChip = String(args.chipId || "").trim();
  if (requestedChip && requestedChip !== "chat" && requestedChip !== "agent") {
    const meta = getCapability(requestedChip);
    skillGate.chip = {
      id: meta?.id || requestedChip,
      title: meta?.title || requestedChip,
      allowedTools: meta?.allowedTools || [],
    };
  }
  if (skill && !skill.permission.roles.includes(role)) {
    throw new AlterError("FORBIDDEN", 403, "권한이 없습니다.");
  }
  const base = {
    ...prepared,
    limits: { ...(prepared.limits || {}), ...(args.limits || {}) },
  };
  if (!skill) return { prepared: base, skillGate, skill: null };
  const prior = String(prepared.input.guidelines || "").trim();
  return {
    skill,
    skillGate,
    prepared: {
      ...base,
      tools: toolsForSkill(skill, depsFor(prepared.mode, prepared.ctx)),
      input: {
        ...prepared.input,
        guidelines: [skill.prompt, prior].filter(Boolean).join("\n\n"),
      },
    },
  };
};

export const runSkillAgent = (args = {}) =>
  guardAlterAgent(() => {
    const turned = prepareGatedTurn(args);
    if (!turned.skill) throw new AlterError("NOT_FOUND", 404, "스킬을 찾을 수 없습니다.");
    return runAlterAgent({ ...turned.prepared, skillGate: turned.skillGate });
  });
