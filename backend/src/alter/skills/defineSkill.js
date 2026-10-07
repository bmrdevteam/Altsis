/**
 * One skill definition. The zod input is the only schema.
 * Allowed tools are registry names. This module does not call a provider.
 */

import { jsonSchemaFromZod } from "../tools/schema.js";

const ID_RE = /^[a-z][a-z0-9-]{0,63}$/;
const TOOL_RE = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * @param {{
 *   id: string,
 *   name: string,
 *   description: string,
 *   when: string,
 *   tools: string[],
 *   input: import("zod").ZodType,
 *   prompt: string,
 *   readOnly: boolean,
 *   permission: { roles: string[] },
 * }} spec
 */
export const defineSkill = (spec) => {
  const id = String(spec?.id || "").trim();
  if (!ID_RE.test(id)) throw new Error(`스킬 id가 올바르지 않습니다: ${spec?.id}`);
  const name = String(spec?.name || "").trim();
  const description = String(spec?.description || "").trim();
  const when = String(spec?.when || "").trim();
  const prompt = String(spec?.prompt || "").trim();
  if (!name || !description || !when || !prompt) {
    throw new Error(`${id} 에 name, description, when, prompt 가 필요합니다.`);
  }
  if (!spec.input || typeof spec.input.safeParse !== "function") {
    throw new Error(`${id} 입력은 zod 스키마여야 합니다.`);
  }
  const tools = (Array.isArray(spec.tools) ? spec.tools : []).map((name) => String(name || "").trim());
  if (!tools.length || tools.some((name) => !TOOL_RE.test(name)) || new Set(tools).size !== tools.length) {
    throw new Error(`${id} 허용 도구가 비어 있거나 이름이 중복입니다.`);
  }
  const roles = spec.permission?.roles;
  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => !String(role || "").trim())) {
    throw new Error(`${id} 에 역할이 없습니다.`);
  }
  if (typeof spec.readOnly !== "boolean") {
    throw new Error(`${id} readOnly 는 boolean 이어야 합니다.`);
  }
  return {
    id,
    name,
    description,
    when,
    tools,
    input: spec.input,
    parameters: jsonSchemaFromZod(spec.input),
    prompt,
    readOnly: spec.readOnly,
    permission: { roles: roles.map((role) => String(role)) },
  };
};
