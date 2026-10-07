/**
 * Live image quota, storage, and usage log. The provider call stays in
 * alter/providers. Scripted results are not stored or logged.
 */

import { IMAGE_BYTES_MAX, IMAGE_DAILY_LIMIT } from "../alter/core/limits.js";
import { runProviderImage } from "../alter/providers/imageGen.js";
import { getDayWindowUTC } from "./aiUsageQuota.js";
import { logAIUsage } from "./aiUsage.js";

export const IMAGE_FEATURE = "alter-image-gen";

export const countImageGensToday = async (academyId, userId, now = new Date()) => {
  if (!academyId || !userId) return 0;
  const { AIUsageLog } = await import("../models/index.js");
  const { from, to } = getDayWindowUTC(now);
  return AIUsageLog(academyId).countDocuments({
    user: userId,
    feature: IMAGE_FEATURE,
    success: true,
    createdAt: { $gte: from, $lt: to },
  });
};

const extFor = (mimeType) => {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
};

/** Store one generated image next to other Alter uploads. The key is re-signed on read. */
export const storeGeneratedImage = async ({ academyId, userId, bytes, mimeType }) => {
  if (!academyId || !userId) return { ok: false, error: "PROVIDER_ERROR" };
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > IMAGE_BYTES_MAX) {
    return { ok: false, error: "SIZE_CAP" };
  }
  const mime = mimeType === "image/jpeg" || mimeType === "image/webp" ? mimeType : "image/png";
  const id = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  const key = `${academyId}/alter/generated/${userId}/${id}.${extFor(mime)}`;
  try {
    const { fileBucket, fileS3, signUrlForView } = await import("../_s3/fileBucket.js");
    await fileS3
      .putObject({
        Bucket: fileBucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
      })
      .promise();
    const url = signUrlForView(key, 3600);
    if (!/^https:\/\/\S+$/i.test(String(url || ""))) return { ok: false, error: "PROVIDER_ERROR" };
    return { ok: true, key, url, mimeType: mime };
  } catch (_) {
    return { ok: false, error: "PROVIDER_ERROR" };
  }
};

export const runAlterImage = async ({ ctx = {}, prompt, countToday, storeImage } = {}) => {
  const user = ctx.user || {};
  const academyId = ctx.academyId;
  const count =
    typeof countToday === "function"
      ? countToday
      : () => countImageGensToday(academyId, user._id);
  if (academyId && user._id) {
    const used = Number(await count()) || 0;
    if (used >= IMAGE_DAILY_LIMIT) {
      return { ok: false, error: "LIMIT_REACHED" };
    }
  }
  const result = await runProviderImage({
    provider: ctx.academy?.aiProvider,
    apiKey: ctx.academy?.aiApiKey,
    prompt,
    fetchImpl: ctx.fetchImage,
  });
  if (!result?.ok || result.scripted) return result;
  const store = typeof storeImage === "function" ? storeImage : storeGeneratedImage;
  const stored = await store({
    academyId,
    userId: user._id,
    bytes: result.bytes,
    mimeType: result.mimeType,
  });
  if (!stored?.ok) return { ok: false, error: stored?.error || "PROVIDER_ERROR" };
  if (academyId && user._id && user.userId && user.userName) {
    await logAIUsage(academyId, {
      user,
      provider: ctx.academy?.aiProvider || "unknown",
      model: ctx.academy?.aiModel || "unknown",
      feature: IMAGE_FEATURE,
      success: true,
      tokenUsage: result.usage,
    });
  }
  return {
    ok: true,
    url: stored.url,
    key: stored.key,
    alt: result.alt,
    mimeType: stored.mimeType || result.mimeType,
    usage: result.usage,
  };
};
