/**
 * Skill registry. Choosing a skill does not call the agent.
 * The runner asks runAlterAgent with this registry's tool list.
 */

import { createAgentTools, listTools } from "../tools/registry.js";
import fixtureBrief from "./defs/fixtureBrief.skill.js";

const SKILLS = [fixtureBrief];

const knownTools = new Set(listTools().map((tool) => tool.name));
for (const skill of SKILLS) {
  for (const name of skill.tools) {
    if (!knownTools.has(name)) {
      throw new Error(`${skill.id} 의 도구가 레지스트리에 없습니다: ${name}`);
    }
  }
}

const byId = new Map(SKILLS.map((skill) => [skill.id, skill]));

export const listSkills = () => SKILLS.slice();

export const getSkill = (id) => byId.get(String(id || "")) || null;

/** Catalog a chooser can read. Execution stays in the skill runner. */
export const describeSkills = (role) =>
  listSkills()
    .filter((skill) => !role || skill.permission.roles.includes(role))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      when: skill.when,
      tools: skill.tools.slice(),
      readOnly: skill.readOnly,
    }));

/**
 * Pick a skill when the message names its id and the role is allowed.
 * Ordinary chat does not name fixture-brief, so it stays on the full tool set.
 */
export const selectSkill = ({ message, role } = {}) => {
  const text = String(message || "");
  const roleName = String(role || "");
  return (
    listSkills().find((skill) => {
      if (roleName && !skill.permission.roles.includes(roleName)) return false;
      return text.includes(skill.id);
    }) || null
  );
};

/** Runtime tools for one skill. Names outside the skill are omitted. */
export const toolsForSkill = (skill, deps = {}) => {
  const allowed = new Set(skill?.tools || []);
  return createAgentTools(deps).filter((tool) => allowed.has(tool.name));
};
