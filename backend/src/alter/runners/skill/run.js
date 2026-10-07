/**
 * Skill runner. Selects one skill and calls runAlterAgent with only its tools.
 * Step limits stay the agent's limits unless the caller passes a tighter cap.
 */

import { AlterError } from "../../core/errors.js";
import { guardAlterAgent, prepareAlterAgentCall } from "../../../services/alterAgent.js";
import { runAlterAgent } from "../../agent/runAlterAgent.js";
import { getSkill, selectSkill, toolsForSkill } from "../../skills/registry.js";

const depsFor = (mode, ctx = {}) => {
  if (mode === "event") return { includeScheduleTool: false, includeTriggerTool: true };
  if (mode === "schedule") return { includeScheduleTool: false, includeTriggerTool: false };
  return {
    includeScheduleTool: ctx.allowScheduleTool !== false,
    includeTriggerTool: Array.isArray(ctx.triggerEvents),
  };
};

export const runSkillAgent = (args = {}) =>
  guardAlterAgent(() => {
    const prepared = prepareAlterAgentCall(args);
    const skill = args.skillId
      ? getSkill(args.skillId)
      : selectSkill({
          message: prepared.input.message,
          role: prepared.ctx.registration?.role,
        });
    if (!skill) throw new AlterError("NOT_FOUND", 404, "스킬을 찾을 수 없습니다.");
    const role = String(prepared.ctx.registration?.role || "");
    if (!skill.permission.roles.includes(role)) {
      throw new AlterError("FORBIDDEN", 403, "권한이 없습니다.");
    }
    const prior = String(prepared.input.guidelines || "").trim();
    return runAlterAgent({
      ...prepared,
      tools: toolsForSkill(skill, depsFor(prepared.mode, prepared.ctx)),
      input: {
        ...prepared.input,
        guidelines: [skill.prompt, prior].filter(Boolean).join("\n\n"),
      },
      limits: { ...(prepared.limits || {}), ...(args.limits || {}) },
    });
  });
