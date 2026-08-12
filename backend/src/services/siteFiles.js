/**
 * Academy public site file helpers (S3 virtual FS under {academyId}/site/)
 */

import { fileS3, fileBucket } from "../_s3/fileBucket.js";
import {
  FOLDER_MARKER,
  MAX_FILE_COUNT,
  MAX_TOTAL_BYTES,
  assertKeyInSite,
  contentTypeForPath,
  isAllowedFilePath,
  normalizeSitePath,
  relativeFromKey,
  siteRootPrefix,
  toS3Key,
} from "./sitePath.js";

export * from "./sitePath.js";

export async function listSiteDir(academyId, prefix = "") {
  const normalizedPrefix = normalizeSitePath(prefix, { allowEmpty: true });
  if (normalizedPrefix === null) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }

  const s3Prefix =
    normalizedPrefix === ""
      ? siteRootPrefix(academyId)
      : `${toS3Key(academyId, normalizedPrefix)}/`;

  const result = await fileS3
    .listObjectsV2({
      Bucket: fileBucket,
      Prefix: s3Prefix,
      Delimiter: "/",
    })
    .promise();

  const folders = (result.CommonPrefixes || [])
    .map((p) => {
      const rel = relativeFromKey(academyId, p.Prefix);
      if (!rel) return null;
      const name = rel.replace(/\/$/, "").split("/").pop();
      return {
        type: "folder",
        name,
        path: rel.replace(/\/$/, ""),
      };
    })
    .filter(Boolean);

  const files = (result.Contents || [])
    .map((obj) => {
      const rel = relativeFromKey(academyId, obj.Key);
      if (!rel) return null;
      const name = rel.split("/").pop();
      if (name === FOLDER_MARKER) return null;
      if (obj.Key === s3Prefix) return null;
      return {
        type: "file",
        name,
        path: rel,
        size: obj.Size || 0,
        lastModified: obj.LastModified,
      };
    })
    .filter(Boolean);

  folders.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  files.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return { prefix: normalizedPrefix, folders, files };
}

export async function getSiteUsage(academyId) {
  const root = siteRootPrefix(academyId);
  let ContinuationToken;
  let fileCount = 0;
  let totalBytes = 0;

  do {
    const result = await fileS3
      .listObjectsV2({
        Bucket: fileBucket,
        Prefix: root,
        ContinuationToken,
      })
      .promise();

    for (const obj of result.Contents || []) {
      const rel = relativeFromKey(academyId, obj.Key);
      if (!rel) continue;
      const name = rel.split("/").pop();
      if (name === FOLDER_MARKER) continue;
      fileCount += 1;
      totalBytes += obj.Size || 0;
    }
    ContinuationToken = result.IsTruncated
      ? result.NextContinuationToken
      : undefined;
  } while (ContinuationToken);

  return { fileCount, totalBytes };
}

export async function assertWithinQuota(
  academyId,
  { addFiles = 0, addBytes = 0 } = {}
) {
  const usage = await getSiteUsage(academyId);
  if (usage.fileCount + addFiles > MAX_FILE_COUNT) {
    throw Object.assign(new Error("SITE_FILE_LIMIT"), {
      code: "SITE_FILE_LIMIT",
    });
  }
  if (usage.totalBytes + addBytes > MAX_TOTAL_BYTES) {
    throw Object.assign(new Error("SITE_SIZE_LIMIT"), {
      code: "SITE_SIZE_LIMIT",
    });
  }
  return usage;
}

export async function mkdirSite(academyId, folderPath) {
  const normalized = normalizeSitePath(folderPath);
  if (!normalized) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }
  const key = toS3Key(academyId, `${normalized}/${FOLDER_MARKER}`);
  await fileS3
    .putObject({
      Bucket: fileBucket,
      Key: key,
      Body: "",
      ContentType: "application/octet-stream",
    })
    .promise();
  return { path: normalized };
}

export async function putSiteObject(academyId, relativePath, body, contentType) {
  const normalized = normalizeSitePath(relativePath);
  if (!normalized || !isAllowedFilePath(normalized)) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }
  const key = toS3Key(academyId, normalized);
  await fileS3
    .putObject({
      Bucket: fileBucket,
      Key: key,
      Body: body,
      ContentType: contentType || contentTypeForPath(normalized),
    })
    .promise();
  return { path: normalized, key };
}

export async function getSiteObject(academyId, relativePath) {
  const normalized = normalizeSitePath(relativePath);
  if (!normalized) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }
  const key = toS3Key(academyId, normalized);
  if (!assertKeyInSite(academyId, key)) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }
  const data = await fileS3
    .getObject({ Bucket: fileBucket, Key: key })
    .promise();
  return { key, data, path: normalized };
}

export async function moveSiteObject(academyId, fromPath, toPath) {
  const from = normalizeSitePath(fromPath);
  const to = normalizeSitePath(toPath);
  if (!from || !to || !isAllowedFilePath(to)) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }
  if (from === to) return { path: to };

  const fromKey = toS3Key(academyId, from);
  const toKey = toS3Key(academyId, to);

  await fileS3
    .copyObject({
      Bucket: fileBucket,
      CopySource: `${fileBucket}/${encodeURIComponent(fromKey).replace(/%2F/g, "/")}`,
      Key: toKey,
      ContentType: contentTypeForPath(to),
      MetadataDirective: "REPLACE",
    })
    .promise();

  await fileS3.deleteObject({ Bucket: fileBucket, Key: fromKey }).promise();

  return { path: to };
}

async function deleteKeys(keys) {
  if (!keys.length) return;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await fileS3
      .deleteObjects({
        Bucket: fileBucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
      .promise();
  }
}

export async function deleteSitePath(
  academyId,
  relativePath,
  { recursive = false } = {}
) {
  const normalized = normalizeSitePath(relativePath, { allowEmpty: false });
  if (!normalized) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }

  if (recursive) {
    const prefix = `${toS3Key(academyId, normalized)}/`;
    const markerKey = toS3Key(academyId, `${normalized}/${FOLDER_MARKER}`);
    const keys = [];
    let ContinuationToken;
    do {
      const result = await fileS3
        .listObjectsV2({
          Bucket: fileBucket,
          Prefix: prefix,
          ContinuationToken,
        })
        .promise();
      for (const obj of result.Contents || []) {
        if (assertKeyInSite(academyId, obj.Key)) keys.push(obj.Key);
      }
      ContinuationToken = result.IsTruncated
        ? result.NextContinuationToken
        : undefined;
    } while (ContinuationToken);

    await deleteKeys(keys);
    try {
      await fileS3
        .deleteObject({ Bucket: fileBucket, Key: markerKey })
        .promise();
    } catch (_) {}
    return { deleted: keys.length };
  }

  const key = toS3Key(academyId, normalized);
  if (!assertKeyInSite(academyId, key)) {
    throw Object.assign(new Error("INVALID_PATH"), { code: "INVALID_PATH" });
  }
  await fileS3.deleteObject({ Bucket: fileBucket, Key: key }).promise();
  return { deleted: 1 };
}
