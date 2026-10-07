/**
 * One tool definition. The zod input is the only schema.
 * Native parameters and the Gemini argument line are generated from it.
 */

import { fenceArguments, jsonSchemaFromZod } from "./schema.js";

const NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * @param {{
 *   name: string,
 *   label?: string,
 *   description: string,
 *   input: import("zod").ZodType,
 *   permission: { roles: string[], access: string },
 *   readOnly: boolean,
 *   untrustedOutput?: boolean,
 *   promptHints: string[],
 *   include?: (deps: object) => boolean,
 *   handler: (ctx: object, input: object) => Promise<object>,
 * }} spec
 */
export const defineTool = (spec) => {
  if (!NAME_RE.test(String(spec?.name || ""))) {
    throw new Error(`도구 이름이 올바르지 않습니다: ${spec?.name}`);
  }
  if (!spec.input || typeof spec.input.safeParse !== "function") {
    throw new Error(`${spec.name} 입력은 zod 스키마여야 합니다.`);
  }
  const roles = spec.permission?.roles;
  if (!Array.isArray(roles) || roles.length === 0 || roles.some((role) => !role)) {
    throw new Error(`${spec.name} 에 역할이 없습니다.`);
  }
  if (!spec.permission?.access) {
    throw new Error(`${spec.name} 에 access 가 없습니다.`);
  }
  const promptHints = (Array.isArray(spec.promptHints) ? spec.promptHints : [])
    .map((hint) => String(hint || "").trim())
    .filter(Boolean);
  if (promptHints.length === 0) {
    throw new Error(`${spec.name} promptHints 가 비어 있습니다.`);
  }
  const parameters = jsonSchemaFromZod(spec.input);
  return {
    name: spec.name,
    label: spec.label || "",
    description: String(spec.description || ""),
    input: spec.input,
    permission: { roles: [...roles], access: String(spec.permission.access) },
    readOnly: spec.readOnly === true,
    effect: spec.effect === "write" ? "write" : "read",
    untrustedOutput: spec.untrustedOutput === true,
    chatOnly: spec.chatOnly === true,
    promptHints,
    include: typeof spec.include === "function" ? spec.include : () => true,
    handler: spec.handler,
    parameters,
    arguments: fenceArguments(parameters),
  };
};
