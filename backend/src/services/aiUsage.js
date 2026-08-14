/**
 * AI 사용 로그 헬퍼
 */

/**
 * @param {string} academyId
 * @param {Object} params
 * @param {Object} params.user
 * @param {string} params.provider
 * @param {string} params.model
 * @param {string} params.feature - syllabus | chat | test
 * @param {boolean} params.success
 * @param {string} [params.errorCode]
 * @param {Object|null} [params.tokenUsage]
 */
export const logAIUsage = async (
  academyId,
  { user, provider, model, feature, success, errorCode, tokenUsage }
) => {
  try {
    const { AIUsageLog } = await import("../models/index.js");
    await AIUsageLog(academyId).create({
      user: user._id,
      userId: user.userId,
      userName: user.userName,
      provider: provider || "unknown",
      model: model || "unknown",
      feature: feature || "unknown",
      success: !!success,
      errorCode: errorCode || undefined,
      promptTokens: tokenUsage?.promptTokens || 0,
      candidatesTokens: tokenUsage?.candidatesTokens || 0,
      thoughtsTokens: tokenUsage?.thoughtsTokens || 0,
      totalTokens: tokenUsage?.totalTokens || 0,
    });
    if (success && tokenUsage?.totalTokens) {
      const { incrementTokenUsage } = await import("./academyStorage.js");
      await incrementTokenUsage(academyId, tokenUsage.totalTokens);
    }
  } catch (_) {
    // fire-and-forget
  }
};
