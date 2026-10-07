/**
 * Single zod tool registry. Provider schemas are generated from each tool's input.
 */

import { finalizeToolResult } from "./finalize.js";
import getMyTodos from "./defs/getMyTodos.tool.js";
import searchProductGuide from "./defs/searchProductGuide.tool.js";
import manageSchedule from "./defs/manageSchedule.tool.js";
import getTriggerEvents from "./defs/getTriggerEvents.tool.js";
import searchSchoolData from "./defs/searchSchoolData.tool.js";
import lookupCreditRules from "./defs/lookupCreditRules.tool.js";
import getCurrentScreen from "./defs/getCurrentScreen.tool.js";
import getPendingApprovals from "./defs/getPendingApprovals.tool.js";
import getFormSubmissionStatus from "./defs/getFormSubmissionStatus.tool.js";
import getCalendar from "./defs/getCalendar.tool.js";
import getMyCourses from "./defs/getMyCourses.tool.js";

const TOOLS = [
  getMyTodos,
  searchProductGuide,
  manageSchedule,
  getTriggerEvents,
  searchSchoolData,
  lookupCreditRules,
  getCurrentScreen,
  getPendingApprovals,
  getFormSubmissionStatus,
  getCalendar,
  getMyCourses,
];

const byName = new Map(TOOLS.map((tool) => [tool.name, tool]));

const asObject = (raw) => (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});

export const listTools = () => TOOLS.slice();

export const getTool = (name) => byName.get(name) || null;

/**
 * Validate with zod when the payload matches. Invalid shapes fall through to
 * the handler, which keeps the previous clamp and default behavior.
 */
export const runTool = async (tool, ctx, rawArgs) => {
  const raw = asObject(rawArgs);
  const parsed = tool.input.safeParse(raw);
  const input = parsed.success ? parsed.data : raw;
  const result = await tool.handler(ctx, input);
  return finalizeToolResult(tool, result);
};

const toRuntimeTool = (tool, deps) => ({
  name: tool.name,
  label: tool.label,
  description: tool.description,
  permission: tool.permission,
  readOnly: tool.readOnly,
  effect: tool.effect,
  untrustedOutput: tool.untrustedOutput,
  promptHints: tool.promptHints,
  parameters: tool.parameters,
  arguments: tool.arguments,
  async execute(serverCtx, rawArgs) {
    return runTool(tool, { ...(serverCtx || {}), deps }, rawArgs);
  },
});

/** Same selection as the previous createAgentTools flags. */
export const createAgentTools = (deps = {}) =>
  TOOLS.filter((tool) => tool.include(deps)).map((tool) => toRuntimeTool(tool, deps));

/** OpenAI function tools, or Anthropic tools with input_schema. */
export const toNativeTools = (provider, tools) => {
  const list = tools || createAgentTools();
  if (provider === "anthropic") {
    return list.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.parameters || { type: "object", properties: {} },
    }));
  }
  return list.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description || "",
      parameters: tool.parameters || { type: "object", properties: {} },
    },
  }));
};

/** Gemini fence fallback. The argument line comes from the same zod schema. */
export const toFenceText = (tools) =>
  (tools || []).map((tool) => {
    const title = `${tool.name}${tool.label ? ` (${tool.label})` : ""}`;
    return `- ${title}: ${tool.description} 인자: ${tool.arguments || "{}"}`;
  }).join("\n");

export { finalizeToolResult };
