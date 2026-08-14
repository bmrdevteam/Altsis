/**
 * 아카데미 전체 S3 사용량 (SHIFT 한도)
 */
import { fileS3, fileBucket } from "../_s3/fileBucket.js";
import { profileS3, profileBucket } from "../_s3/profileBucket.js";
import { Academy } from "../models/index.js";
import { logger } from "../log/logger.js";
import { STORAGE_LIMIT } from "../messages/index.js";
import {
  assertShiftStorage,
  normalizePlans,
  persistCtrlUsageMonth,
  planError,
} from "./entitlement.js";

export const FILE_STORAGE_CATEGORIES = [
  { name: "채팅 파일", prefix: (id) => `${id}/chat/` },
  { name: "게시판 첨부파일", prefix: (id) => `${id}/posts/` },
  { name: "공개 웹사이트", prefix: (id) => `${id}/site/` },
  { name: "설문 파일", prefix: (id) => `${id}/survey/` },
  { name: "기록 파일", prefix: (id) => `${id}/archive/` },
  { name: "양식 파일", prefix: (id) => `${id}/forms/` },
  { name: "AI 참고자료", prefix: (id) => `${id}/ai-ref/` },
  { name: "AI 라이브러리", prefix: (id) => `${id}/ai-library/` },
  { name: "Alter 첨부", prefix: (id) => `${id}/alter/` },
];

export const PROFILE_STORAGE_CATEGORIES = [
  { name: "이미지 (프로필·커버)", prefix: (id) => `original/${id}/` },
  { name: "썸네일", prefix: (id) => `thumb/${id}/` },
];

async function sumPrefix(s3, bucket, prefix) {
  let ContinuationToken;
  let totalBytes = 0;
  let count = 0;
  do {
    const response = await s3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken,
      })
      .promise();
    for (const obj of response.Contents || []) {
      totalBytes += obj.Size || 0;
      count += 1;
    }
    ContinuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (ContinuationToken);
  return { totalBytes, count };
}

export async function sumAcademyStorageBytes(academyId) {
  const categories = [];
  let totalBytes = 0;

  for (const cat of FILE_STORAGE_CATEGORIES) {
    try {
      const { totalBytes: bytes, count } = await sumPrefix(
        fileS3,
        fileBucket,
        cat.prefix(academyId)
      );
      categories.push({ name: cat.name, totalBytes: bytes, count });
      totalBytes += bytes;
    } catch (err) {
      logger.warn(`storage sum failed (${cat.name}): ${err.message}`);
      categories.push({ name: cat.name, totalBytes: 0, count: 0 });
    }
  }

  for (const cat of PROFILE_STORAGE_CATEGORIES) {
    try {
      const { totalBytes: bytes, count } = await sumPrefix(
        profileS3,
        profileBucket,
        cat.prefix(academyId)
      );
      categories.push({ name: cat.name, totalBytes: bytes, count });
      totalBytes += bytes;
    } catch (err) {
      logger.warn(`storage sum failed (${cat.name}): ${err.message}`);
      categories.push({ name: cat.name, totalBytes: 0, count: 0 });
    }
  }

  return { totalBytes, categories };
}

export async function refreshAcademyStorageUsage(academy) {
  const { totalBytes, categories } = await sumAcademyStorageBytes(
    academy.academyId
  );
  const plans = normalizePlans(academy);
  plans.shift.usedBytes = totalBytes;
  plans.shift.usageSyncedAt = new Date();
  academy.plans = {
    ...((academy.plans && academy.plans.toObject?.()) || academy.plans || {}),
    alt: plans.alt,
    shift: plans.shift,
    ctrl: plans.ctrl,
  };
  if (typeof academy.markModified === "function") {
    academy.markModified("plans");
  }
  await academy.save();
  return { totalBytes, categories, plans: normalizePlans(academy) };
}

export async function incrementStorageUsage(academyId, deltaBytes) {
  const delta = Math.floor(Number(deltaBytes) || 0);
  if (!delta) return;
  await Academy.updateOne(
    { academyId },
    { $inc: { "plans.shift.usedBytes": delta } }
  );
}

export async function incrementTokenUsage(academyId, deltaTokens) {
  const delta = Math.floor(Number(deltaTokens) || 0);
  if (delta <= 0) return;
  const academy = await Academy.findOne({ academyId });
  if (academy) {
    await persistCtrlUsageMonth(academy);
  }
  await Academy.updateOne(
    { academyId },
    { $inc: { "plans.ctrl.usedTokens": delta } }
  );
}

async function deleteUploadedObject(file) {
  if (!file?.key) return;
  const bucket = file.bucket;
  const s3 =
    bucket && bucket === profileBucket ? profileS3 : fileS3;
  const Bucket = bucket || fileBucket;
  try {
    await s3.deleteObject({ Bucket, Key: file.key }).promise();
  } catch (err) {
    logger.warn(`quota rollback delete failed: ${err.message}`);
  }
}

/**
 * 업로드가 S3에 올라간 뒤 한도를 검사하고, 초과면 객체를 지운다.
 * @param {string} academyId
 * @param {{ size?: number, key?: string, bucket?: string }} file
 */
export async function commitAcademyUpload(academyId, file) {
  const size = Math.max(0, Number(file?.size) || 0);
  const academy = await Academy.findOne({ academyId });
  if (!academy) return;

  const plans = normalizePlans(academy);
  if (plans.shift.storageLimitBytes == null) {
    if (size) await incrementStorageUsage(academyId, size);
    return;
  }

  if (!plans.shift.usageSyncedAt) {
    const { totalBytes } = await refreshAcademyStorageUsage(academy);
    const limit = normalizePlans(academy).shift.storageLimitBytes;
    if (limit != null && totalBytes > limit) {
      await deleteUploadedObject(file);
      await refreshAcademyStorageUsage(academy);
      throw planError(STORAGE_LIMIT);
    }
    return;
  }

  try {
    assertShiftStorage(academy, { addBytes: size });
  } catch (err) {
    await deleteUploadedObject(file);
    throw err;
  }

  if (size) await incrementStorageUsage(academyId, size);
}

export async function tryCommitUpload(res, academyId, file) {
  try {
    await commitAcademyUpload(academyId, file);
    return true;
  } catch (err) {
    if (err.code === STORAGE_LIMIT) {
      res.status(err.status || 403).send({ message: err.code });
      return false;
    }
    throw err;
  }
}

export async function assertAndIncrementStorage(academyId, addBytes) {
  const size = Math.max(0, Number(addBytes) || 0);
  const academy = await Academy.findOne({ academyId });
  if (!academy) return;
  const plans = normalizePlans(academy);
  if (plans.shift.storageLimitBytes == null) {
    if (size) await incrementStorageUsage(academyId, size);
    return;
  }
  if (!plans.shift.usageSyncedAt) {
    await refreshAcademyStorageUsage(academy);
  }
  assertShiftStorage(academy, { addBytes: size });
  if (size) await incrementStorageUsage(academyId, size);
}
