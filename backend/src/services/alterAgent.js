/**
 * Alter agent skill — fenced JSON tool loop over read-only tools.
 */

import { resolveModel, resolveProvider } from "./aiProvider.js";
import { llm } from "./alterLlm.js";
import { AI_ERRORS, FEATURE_PROFILES, truncateText } from "./aiPromptPolicy.js";
import { maskSensitiveText } from "../alter/core/safety.js";
import { logAIUsage } from "./aiUsage.js";
import { isSchoolManager } from "../utils/schoolManager.js";
import { createAgentTools } from "./alterAgentTools.js";
import {
  MAX_AGENT_TOOL_STEPS,
  runAgentLoop,
} from "./alterAgentProtocol.js";

const mergeTokenUsage = (a, b) => {
  if (!b) return a || null;
  if (!a) return { ...b };
  return {
    promptTokens: (a.promptTokens || 0) + (b.promptTokens || 0),
    candidatesTokens: (a.candidatesTokens || 0) + (b.candidatesTokens || 0),
    thoughtsTokens: (a.thoughtsTokens || 0) + (b.thoughtsTokens || 0),
    totalTokens: (a.totalTokens || 0) + (b.totalTokens || 0),
  };
};

const mapProviderError = (err) => {
  if (err?.code === "AI_TIMEOUT" || err?.status === 504) {
    return AI_ERRORS.GENERATION_FAILED;
  }
  if (err?.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err?.status === 401 || err?.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

const pageNoteFromContext = (context = {}) => {
  const pageType = String(context.pageType || "").trim();
  const label = String(context.label || context.classTitle || "").trim();
  const note = [pageType, label].filter(Boolean).join(" · ");
  return maskSensitiveText(note).text.slice(0, 200);
};

/**
 * @param {object} params
 */
export const executeAgentSkill = async ({
  academyId,
  user,
  academy,
  season,
  school,
  registration,
  context = {},
  message = "",
  history = [],
  guidelines = "",
  onEvent,
  allowScheduleTool = true,
  triggerEvents,
  scriptedPlan,
  generate: generateOverride,
}) => {
  const profile = FEATURE_PROFILES.agent;
  const provider = resolveProvider(academy?.aiProvider);
  const modelName = resolveModel(provider, academy?.aiModel);
  let tokenUsage = null;

  const userQuestion = maskSensitiveText(String(message || "").trim()).text;
  if (!userQuestion) {
    const err = new Error("물어볼 내용을 입력해 주세요.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  const serverCtx = {
    academyId,
    user,
    academy,
    school,
    season,
    seasonId: String(season?._id || context.seasonId || ""),
    registration,
    isSchoolManager: isSchoolManager(user, school?._id),
    message: userQuestion,
    triggerEvents: Array.isArray(triggerEvents) ? triggerEvents : undefined,
  };

  const recent = [];
  for (const row of (history || []).slice(-6)) {
    if (!row?.content) continue;
    recent.push({
      role: row.role === "assistant" ? "assistant" : "user",
      content: maskSensitiveText(String(row.content)).text.slice(0, 800),
    });
  }

  const generate = async ({
    systemInstruction,
    messages,
    tools,
    catalog,
    toolChoice,
    forceFinal,
    pageNote,
    guidelines: guideText,
  }) => {
    if (typeof generateOverride === "function") {
      const result = await generateOverride({
        systemInstruction,
        messages,
        tools,
        toolChoice,
        forceFinal,
      });
      tokenUsage = mergeTokenUsage(tokenUsage, result?.tokenUsage || result?.usage);
      return {
        text: maskSensitiveText(result?.text || "").text,
        toolCalls: Array.isArray(result?.toolCalls) ? result.toolCalls : [],
      };
    }
    try {
      const adapter = llm.resolve({ provider: academy?.aiProvider, apiKey: academy?.aiApiKey });
      const result = await llm.generate({
        adapter,
        provider: academy?.aiProvider,
        apiKey: academy.aiApiKey,
        model: modelName,
        system: systemInstruction,
        messages,
        tools,
        catalog,
        toolChoice: toolChoice || (forceFinal ? "none" : undefined),
        forceFinal,
        pageNote,
        guidelines: guideText,
        temperature: profile.temperature,
        maxTokens: profile.maxTokens,
        scriptedPlan,
      });
      tokenUsage = mergeTokenUsage(tokenUsage, result.usage);
      return {
        text: maskSensitiveText(result.text || "").text,
        toolCalls: Array.isArray(result.toolCalls) ? result.toolCalls : [],
      };
    } catch (err) {
      if (!err.code) err.code = mapProviderError(err);
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode: err.code,
        tokenUsage,
      });
      throw err;
    }
  };

  try {
    const result = await runAgentLoop({
      tools: createAgentTools({
        includeScheduleTool: allowScheduleTool !== false,
        includeTriggerTool: Array.isArray(triggerEvents),
      }),
      serverCtx,
      userMessage: userQuestion,
      history: recent,
      guidelines: truncateText(guidelines || "", 4000),
      pageNote: pageNoteFromContext(context),
      generate,
      onEvent,
      maxToolSteps: MAX_AGENT_TOOL_STEPS,
    });

    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: true,
      tokenUsage,
    });

    const toolNames = (result.steps || [])
      .filter((step) => step?.status === "done" && step.name && step.name !== "_parse")
      .map((step) => String(step.name));
    return {
      text: result.text || "확인한 내용이 없습니다.",
      tokenUsage,
      toolSteps: result.toolSteps,
      toolNames,
      links: result.links || [],
      scheduleProposal: result.scheduleProposal || null,
      trace: result.trace || [],
    };
  } catch (err) {
    if (err?.code && err.status) throw err;
    if (!err.code) err.code = mapProviderError(err);
    throw err;
  }
};
