/**
 * Alter agent skill. Provider resolution and usage logs stay here.
 * The loop itself is runAlterAgent.
 */

import { resolveModel, resolveProvider } from "./aiProvider.js";
import { AI_ERRORS, FEATURE_PROFILES, truncateText } from "./aiPromptPolicy.js";
import { maskSensitiveText } from "../alter/core/safety.js";
import { logAIUsage } from "./aiUsage.js";
import { isSchoolManager } from "../utils/schoolManager.js";
import { runAlterAgent } from "../alter/agent/runAlterAgent.js";

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

const resolveMode = ({ mode, allowScheduleTool, triggerEvents }) => {
  if (mode === "chat" || mode === "schedule" || mode === "event") return mode;
  if (Array.isArray(triggerEvents)) return "event";
  if (allowScheduleTool === false) return "schedule";
  return "chat";
};

/**
 * Masks the turn and resolves the provider. Runners pass the result to runAlterAgent.
 * @param {object} params
 */
export const prepareAlterAgentCall = ({
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
  mode,
}) => {
  const profile = FEATURE_PROFILES.agent;
  const resolvedProvider = resolveProvider(academy?.aiProvider);
  const modelName = resolveModel(resolvedProvider, academy?.aiModel);

  const userQuestion = maskSensitiveText(String(message || "").trim()).text;
  if (!userQuestion) {
    const err = new Error("물어볼 내용을 입력해 주세요.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  const recent = [];
  for (const row of (history || []).slice(-6)) {
    if (!row?.content) continue;
    recent.push({
      role: row.role === "assistant" ? "assistant" : "user",
      content: maskSensitiveText(String(row.content)).text.slice(0, 800),
    });
  }

  const resolvedMode = resolveMode({ mode, allowScheduleTool, triggerEvents });
  return {
    ctx: {
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
      allowScheduleTool,
      scriptedDemo:
        String(academy?.aiApiKey || "").trim() === "scripted-local-dev" &&
        String(process.env.NODE_ENV || "").trim() !== "production",
      screen: {
        pageType: context.pageType,
        subject: context.subject,
        classTitle: context.classTitle,
        label: context.label,
        boardName: context.boardName,
        reviewSummary: context.reviewSummary,
      },
    },
    input: {
      message: userQuestion,
      history: recent,
      pageNote: pageNoteFromContext(context),
      guidelines: truncateText(guidelines || "", 4000),
      attachments: context.attachments,
    },
    mode: resolvedMode,
    onEvent,
    provider: {
      id: academy?.aiProvider,
      apiKey: academy?.aiApiKey,
      model: modelName,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
      scriptedPlan,
      generate: typeof generateOverride === "function" ? generateOverride : undefined,
      onError(err, tokenUsage) {
        if (!err.code) err.code = mapProviderError(err);
        logAIUsage(academyId, {
          user,
          provider: resolvedProvider,
          model: modelName,
          feature: profile.feature,
          success: false,
          errorCode: err.code,
          tokenUsage,
        });
      },
      onComplete(tokenUsage) {
        logAIUsage(academyId, {
          user,
          provider: resolvedProvider,
          model: modelName,
          feature: profile.feature,
          success: true,
          tokenUsage,
        });
      },
    },
    limits: { maxTokens: profile.maxTokens },
  };
};

export const guardAlterAgent = async (run) => {
  try {
    return await run();
  } catch (err) {
    if (err?.code && err.status) throw err;
    if (!err.code) err.code = mapProviderError(err);
    throw err;
  }
};

/**
 * @param {object} params
 */
export const executeAgentSkill = (params) =>
  guardAlterAgent(() => runAlterAgent(prepareAlterAgentCall(params)));
