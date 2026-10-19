/**
 * Single Alter agent entry. Chat, schedule, and event runners call this.
 * The loop selects registry tools, drops write tools for unattended modes,
 * and returns normalized usage.
 */

import { maskSensitiveText } from "../core/safety.js";
import { addUsage } from "../core/usage.js";
import { allowListedTool, guardToolExecute } from "../policy/skillGate.js";
import useSkillTool from "../tools/defs/useSkill.tool.js";
import { createAgentTools, disabledCapabilityHints, toRuntimeTool } from "../tools/registry.js";
import { llm } from "../../services/alterLlm.js";
import {
  MAX_AGENT_TOOL_STEPS,
  MAX_FORMAT_RETRIES,
  runAgentLoop,
} from "../../services/alterAgentProtocol.js";

const UNATTENDED = new Set(["schedule", "event"]);

const isWriteTool = (tool) => tool?.readOnly === false || tool?.effect === "write";

const depsForMode = (mode, ctx = {}) => {
  const webSearchEnabled = ctx.academy?.webSearchEnabled === true;
  const imageFlag = ctx.academy?.imageGenEnabled === true;
  const imageGenEnabled = mode === "chat" && imageFlag;
  const shared = { webSearchEnabled, imageGenEnabled, imageGenRequested: imageFlag };
  if (mode === "event") {
    return { includeScheduleTool: false, includeTriggerTool: true, ...shared };
  }
  if (mode === "schedule") {
    return { includeScheduleTool: false, includeTriggerTool: false, ...shared };
  }
  return {
    includeScheduleTool: ctx.allowScheduleTool !== false,
    includeTriggerTool: Array.isArray(ctx.triggerEvents),
    ...shared,
  };
};

/**
 * @param {object} params
 * @param {object} params.ctx
 * @param {{ message?: string, history?: object[], pageNote?: string, guidelines?: string, attachments?: object[] }} params.input
 * @param {"chat"|"schedule"|"event"} [params.mode]
 * @param {object[]} [params.tools] caller-supplied tools. Unattended modes still drop writes.
 * @param {object} [params.provider]
 * @param {{ maxToolSteps?: number, maxFormatRetries?: number, maxTokens?: number, deadlineMs?: number }} [params.limits]
 * @param {(event: string, data: object) => void} [params.onEvent]
 */
export const runAlterAgent = async ({
  ctx = {},
  input = {},
  mode = "chat",
  tools,
  provider = {},
  limits = {},
  onEvent,
  skillGate,
}) => {
  const resolvedMode = UNATTENDED.has(mode) || mode === "chat" ? mode : "chat";
  const ownedTools = !Array.isArray(tools);
  const deps = depsForMode(resolvedMode, ctx);
  const baseTools = ownedTools ? createAgentTools(deps) : tools;
  const withDispatch =
    ownedTools && resolvedMode === "chat" ? [...baseTools, toRuntimeTool(useSkillTool, deps)] : baseTools;
  const selected = withDispatch.filter((tool) => allowListedTool(tool, skillGate));
  const disabledHints = ownedTools ? disabledCapabilityHints(deps) : [];
  const runnable = selected
    .filter((tool) => {
      if (tool?.chatOnly === true && resolvedMode !== "chat") return false;
      if (UNATTENDED.has(resolvedMode) && isWriteTool(tool)) return false;
      return true;
    })
    .map((tool) => guardToolExecute(tool, skillGate));

  let tokenUsage = null;
  const generate = async (turn) => {
    if (typeof provider.generate === "function") {
      const result = await provider.generate({
        systemInstruction: turn.systemInstruction,
        messages: turn.messages,
        tools: turn.tools,
        toolChoice: turn.toolChoice,
        forceFinal: turn.forceFinal,
      });
      tokenUsage = addUsage(tokenUsage, result?.tokenUsage || result?.usage);
      return {
        text: maskSensitiveText(result?.text || "").text,
        toolCalls: Array.isArray(result?.toolCalls) ? result.toolCalls : [],
      };
    }
    try {
      const adapter =
        provider.adapter ||
        llm.resolve({
          provider: provider.id,
          apiKey: provider.apiKey,
        });
      const result = await llm.generate({
        adapter,
        provider: provider.id,
        apiKey: provider.apiKey,
        model: provider.model,
        system: turn.systemInstruction,
        messages: turn.messages,
        tools: turn.tools,
        catalog: turn.catalog,
        toolChoice: turn.toolChoice || (turn.forceFinal ? "none" : undefined),
        forceFinal: turn.forceFinal,
        pageNote: turn.pageNote,
        guidelines: turn.guidelines,
        temperature: provider.temperature,
        maxTokens: limits.maxTokens ?? provider.maxTokens,
        scriptedPlan: provider.scriptedPlan,
      });
      tokenUsage = addUsage(tokenUsage, result.usage);
      return {
        text: maskSensitiveText(result.text || "").text,
        toolCalls: Array.isArray(result.toolCalls) ? result.toolCalls : [],
      };
    } catch (err) {
      if (typeof provider.onError === "function") provider.onError(err, tokenUsage);
      throw err;
    }
  };

  const result = await runAgentLoop({
    tools: runnable,
    disabledHints,
    serverCtx: { ...ctx, mode: resolvedMode, skillGate },
    userMessage: input.message,
    history: input.history || [],
    guidelines: input.guidelines || "",
    pageNote: input.pageNote || "",
    generate,
    onEvent,
    maxToolSteps: limits.maxToolSteps ?? MAX_AGENT_TOOL_STEPS,
    maxFormatRetries: limits.maxFormatRetries ?? MAX_FORMAT_RETRIES,
  });

  if (typeof provider.onComplete === "function") provider.onComplete(tokenUsage);
  const reportedUsage = addUsage(tokenUsage, result.nestedUsage);

  const toolNames = (result.steps || [])
    .filter((step) => step?.status === "done" && step.name && step.name !== "_parse")
    .map((step) => String(step.name));
  const scheduleProposal = result.scheduleProposal || null;
  return {
    text: result.text || "확인한 내용이 없습니다.",
    links: result.links || [],
    images: result.images || [],
    proposals: scheduleProposal ? [scheduleProposal] : [],
    scheduleProposal,
    draft: result.draft || null,
    confirmation: result.confirmation || null,
    toolNames,
    toolSteps: result.toolSteps,
    tokenUsage: reportedUsage,
    usage: reportedUsage,
    trace: result.trace || [],
  };
};
