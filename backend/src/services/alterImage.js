/**
 * Live image quota, storage, and usage log. The provider call stays in
 * alter/providers. Scripted results are not stored or logged.
 */

import { fileBucket, fileS3, signUrlForView, viewableFileUrl } from "../_s3/fileBucket.js";
import { IMAGE_BYTES_MAX, IMAGE_DAILY_LIMIT } from "../alter/core/limits.js";
import { runProviderImage, safeProviderCode } from "../alter/providers/imageGen.js";
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

const LOCAL_FILE_BUCKETS = new Set(["test-bucket-2", "local-files"]);
const LOCAL_FILE_KEYS = new Set(["test-access-key-2"]);

/**
 * Jest defaults and the local guide are not a file bucket unless `s3_endpoint2`
 * points at a store. A configured endpoint uploads there, including those names.
 */
export const localFileBucket = (
  name = process.env.s3_bucket2,
  accessKeyId = process.env.s3_accessKeyId2,
  endpoint = process.env.s3_endpoint2
) => {
  if (String(endpoint || "").trim()) return false;
  return (
    LOCAL_FILE_BUCKETS.has(String(name || "").trim()) ||
    LOCAL_FILE_KEYS.has(String(accessKeyId || "").trim())
  );
};

const extFor = (mimeType) => {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
};

/** Store one generated image next to other Alter uploads. The key is re-signed on read. */
export const storeGeneratedImage = async ({ academyId, userId, bytes, mimeType }) => {
  if (localFileBucket()) return { ok: false, error: "STORAGE_ERROR", providerCode: "local_bucket" };
  if (!academyId || !userId) return { ok: false, error: "STORAGE_ERROR", providerCode: "missing_owner" };
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > IMAGE_BYTES_MAX) {
    return { ok: false, error: "SIZE_CAP" };
  }
  const mime = mimeType === "image/jpeg" || mimeType === "image/webp" ? mimeType : "image/png";
  const id = `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
  const key = `${academyId}/alter/generated/${userId}/${id}.${extFor(mime)}`;
  try {
    await fileS3
      .putObject({
        Bucket: fileBucket,
        Key: key,
        Body: bytes,
        ContentType: mime,
      })
      .promise();
    const url = viewableFileUrl(signUrlForView(key, 3600));
    if (!url) return { ok: false, error: "STORAGE_ERROR", providerCode: "unsigned_url" };
    return { ok: true, key, url, mimeType: mime };
  } catch (err) {
    const providerCode = safeProviderCode(err?.code);
    return { ok: false, error: "STORAGE_ERROR", ...(providerCode ? { providerCode } : {}) };
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
  let stored;
  try {
    stored = await store({
      academyId,
      userId: user._id,
      bytes: result.bytes,
      mimeType: result.mimeType,
    });
  } catch (err) {
    stored = { ok: false, error: "STORAGE_ERROR", providerCode: safeProviderCode(err?.code) };
  }
  if (!stored?.ok) {
    const error = stored?.error === "SIZE_CAP" ? "SIZE_CAP" : "STORAGE_ERROR";
    const providerCode = safeProviderCode(stored?.providerCode);
    return {
      ok: false,
      error,
      ...(providerCode ? { providerCode } : {}),
      ...(result.usage ? { usage: result.usage } : {}),
    };
  }
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
