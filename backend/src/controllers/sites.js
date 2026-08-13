/**
 * SiteAPI — academy public static site management & serving
 */

import { Academy } from "../models/index.js";
import { logger } from "../log/logger.js";
import {
  FIELD_INVALID,
  FIELD_REQUIRED,
  LIMIT_FILE_SIZE,
  INVALID_FILE_TYPE,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { siteMulter, siteZipMulter } from "../_s3/siteMulter.js";
import {
  assertWithinQuota,
  contentTypeForPath,
  deleteSitePath,
  getSiteObject,
  isTextEditablePath,
  listSiteDir,
  mkdirSite,
  moveSiteObject,
  normalizeSitePath,
  putSiteObject,
  resolvePublicRelativePath,
  isAllowedFilePath,
  MAX_FILE_COUNT,
  MAX_TOTAL_BYTES,
  MAX_FILE_BYTES,
} from "../services/siteFiles.js";

function canManageAcademy(req, academyId) {
  if (!req.user) return false;
  if (req.user.auth === "owner") return true;
  return req.user.auth === "admin" && req.user.academyId === academyId;
}

async function loadAcademy(academyId) {
  return Academy.findOne({ academyId });
}

async function requireEnabledAcademy(req, res) {
  const academyId = req.params.academyId;
  if (!canManageAcademy(req, academyId)) {
    res.status(403).send({ message: PERMISSION_DENIED });
    return null;
  }
  const academy = await loadAcademy(academyId);
  if (!academy) {
    res.status(404).send({ message: __NOT_FOUND("academy") });
    return null;
  }
  if (!academy.sitePublishEnabled) {
    res.status(403).send({ message: PERMISSION_DENIED });
    return null;
  }
  return academy;
}

/**
 * GET /api/sites/:academyId/meta
 */
export const getMeta = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    return res.status(200).send({
      academyId: academy.academyId,
      sitePublishEnabled: !!academy.sitePublishEnabled,
      sitePublished: !!academy.sitePublished,
      publicPath: `/api/sites/${academy.academyId}/public/`,
      limits: {
        maxFileBytes: MAX_FILE_BYTES,
        maxFileCount: MAX_FILE_COUNT,
        maxTotalBytes: MAX_TOTAL_BYTES,
      },
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PUT /api/sites/:academyId/published
 */
export const updatePublished = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    if (typeof req.body.sitePublished !== "boolean") {
      return res.status(400).send({ message: FIELD_REQUIRED("sitePublished") });
    }

    academy.sitePublished = req.body.sitePublished;
    await academy.save();

    return res.status(200).send({
      academyId: academy.academyId,
      sitePublished: academy.sitePublished,
      publicPath: `/api/sites/${academy.academyId}/public/`,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * GET /api/sites/:academyId/files?prefix=
 */
export const listFiles = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    const listing = await listSiteDir(
      academy.academyId,
      req.query.prefix || ""
    );
    return res.status(200).send(listing);
  } catch (err) {
    if (err.code === "INVALID_PATH") {
      return res.status(400).send({ message: FIELD_INVALID("prefix") });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /api/sites/:academyId/mkdir
 */
export const mkdir = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    if (!req.body.path) {
      return res.status(400).send({ message: FIELD_REQUIRED("path") });
    }

    const result = await mkdirSite(academy.academyId, req.body.path);
    return res.status(200).send(result);
  } catch (err) {
    if (err.code === "INVALID_PATH") {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /api/sites/:academyId/upload
 */
export const uploadFile = async (req, res) => {
  const academy = await requireEnabledAcademy(req, res);
  if (!academy) return;

  siteMulter.single("file")(req, res, async (err) => {
    if (err) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        case "INVALID_FILE_TYPE":
          return res.status(409).send({ message: INVALID_FILE_TYPE });
        default:
          logger.error(err.message);
          return res.status(500).send({ message: "서버 오류가 발생했습니다." });
      }
    }

    try {
      if (!req.file || !req.tmp?.relativePath) {
        return res.status(400).send({ message: FIELD_REQUIRED("file") });
      }

      const size = req.file.size || 0;
      // Object already in S3; validate resulting usage (do not add deltas again)
      try {
        await assertWithinQuota(academy.academyId, {
          addFiles: 0,
          addBytes: 0,
        });
      } catch (quotaErr) {
        if (
          quotaErr.code === "SITE_FILE_LIMIT" ||
          quotaErr.code === "SITE_SIZE_LIMIT"
        ) {
          // Roll back the written key so 409 matches storage state
          try {
            await deleteSitePath(academy.academyId, req.tmp.relativePath);
          } catch (cleanupErr) {
            logger.error(cleanupErr.message);
          }
          return res.status(409).send({ message: quotaErr.code });
        }
        throw quotaErr;
      }

      return res.status(200).send({
        path: req.tmp.relativePath,
        key: req.tmp.key,
        size,
        contentType: req.tmp.contentType,
      });
    } catch (e) {
      logger.error(e.message);
      return res.status(500).send({ message: "서버 오류가 발생했습니다." });
    }
  });
};

/**
 * GET /api/sites/:academyId/content?path=
 */
export const getContent = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    if (!req.query.path) {
      return res.status(400).send({ message: FIELD_REQUIRED("path") });
    }
    const path = normalizeSitePath(req.query.path);
    if (!path || !isTextEditablePath(path)) {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }

    const { data } = await getSiteObject(academy.academyId, path);
    const content = data.Body?.toString("utf8") ?? "";
    return res.status(200).send({ path, content });
  } catch (err) {
    if (err.code === "NoSuchKey") {
      return res.status(404).send({ message: "파일을 찾을 수 없습니다." });
    }
    if (err.code === "INVALID_PATH") {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PUT /api/sites/:academyId/content
 */
export const putContent = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    const { path: rawPath, content } = req.body || {};
    if (!rawPath) {
      return res.status(400).send({ message: FIELD_REQUIRED("path") });
    }
    if (typeof content !== "string") {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }

    const path = normalizeSitePath(rawPath);
    if (!path || !isTextEditablePath(path)) {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }

    const body = Buffer.from(content, "utf8");
    if (body.length > MAX_FILE_BYTES) {
      return res.status(409).send({ message: LIMIT_FILE_SIZE });
    }

    let previousSize = 0;
    let exists = true;
    try {
      const existing = await getSiteObject(academy.academyId, path);
      previousSize =
        existing.data.ContentLength ??
        (Buffer.isBuffer(existing.data.Body) ? existing.data.Body.length : 0);
    } catch (e) {
      if (e.code === "NoSuchKey") exists = false;
      else throw e;
    }
    await assertWithinQuota(academy.academyId, {
      addFiles: exists ? 0 : 1,
      addBytes: Math.max(0, body.length - previousSize),
    });

    await putSiteObject(
      academy.academyId,
      path,
      body,
      contentTypeForPath(path)
    );
    return res.status(200).send({ path });
  } catch (err) {
    if (err.code === "INVALID_PATH") {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }
    if (err.code === "SITE_FILE_LIMIT" || err.code === "SITE_SIZE_LIMIT") {
      return res.status(409).send({ message: err.code });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * PUT /api/sites/:academyId/move
 */
export const moveFile = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    const { from, to } = req.body || {};
    if (!from || !to) {
      return res.status(400).send({ message: FIELD_REQUIRED("from|to") });
    }

    const result = await moveSiteObject(academy.academyId, from, to);
    return res.status(200).send(result);
  } catch (err) {
    if (err.code === "INVALID_PATH") {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }
    if (err.code === "NoSuchKey") {
      return res.status(404).send({ message: "파일을 찾을 수 없습니다." });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * DELETE /api/sites/:academyId/files?path=&recursive=
 */
export const removeFiles = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    if (!req.query.path) {
      return res.status(400).send({ message: FIELD_REQUIRED("path") });
    }
    const recursive =
      req.query.recursive === "true" || req.query.recursive === "1";

    const result = await deleteSitePath(academy.academyId, req.query.path, {
      recursive,
    });
    return res.status(200).send(result);
  } catch (err) {
    if (err.code === "INVALID_PATH") {
      return res.status(400).send({ message: FIELD_INVALID("path") });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * POST /api/sites/:academyId/import-zip
 */
export const importZip = async (req, res) => {
  const academy = await requireEnabledAcademy(req, res);
  if (!academy) return;

  siteZipMulter.single("file")(req, res, async (err) => {
    if (err) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        case "INVALID_FILE_TYPE":
          return res.status(409).send({ message: INVALID_FILE_TYPE });
        default:
          logger.error(err.message);
          return res.status(500).send({ message: "서버 오류가 발생했습니다." });
      }
    }

    try {
      if (!req.file?.buffer) {
        return res.status(400).send({ message: FIELD_REQUIRED("file") });
      }

      const AdmZipModule = await import("adm-zip");
      const AdmZip = AdmZipModule.default || AdmZipModule;
      const zip = new AdmZip(req.file.buffer);
      const entries = zip.getEntries().filter((e) => !e.isDirectory);

      const toUpload = [];
      let totalBytes = 0;

      for (const entry of entries) {
        let entryPath = entry.entryName.replace(/\\/g, "/");
        // Strip a single top-level folder if zip has one root dir
        entryPath = entryPath.replace(/^\/+/, "");
        if (entryPath.includes("__MACOSX") || entryPath.endsWith(".DS_Store")) {
          continue;
        }

        const normalized = normalizeSitePath(entryPath);
        if (!normalized || !isAllowedFilePath(normalized)) {
          return res.status(400).send({
            message: FIELD_INVALID("path"),
            detail: entry.entryName,
          });
        }

        // 압축 해제 폭탄: 파일 수·용량 한도를 루프 중 즉시 검사
        if (toUpload.length + 1 > MAX_FILE_COUNT) {
          return res.status(409).send({
            message: "파일 개수 한도를 초과합니다.",
          });
        }

        const data = entry.getData();
        if (data.length > MAX_FILE_BYTES) {
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        }
        totalBytes += data.length;
        if (totalBytes > MAX_TOTAL_BYTES) {
          return res.status(409).send({
            message: "용량 한도를 초과합니다.",
          });
        }
        toUpload.push({ path: normalized, data });
      }

      if (toUpload.length === 0) {
        return res.status(400).send({ message: FIELD_INVALID("file") });
      }

      await assertWithinQuota(academy.academyId, {
        addFiles: toUpload.length,
        addBytes: totalBytes,
      });

      for (const item of toUpload) {
        await putSiteObject(
          academy.academyId,
          item.path,
          item.data,
          contentTypeForPath(item.path)
        );
      }

      return res.status(200).send({
        imported: toUpload.length,
        paths: toUpload.map((i) => i.path),
      });
    } catch (e) {
      if (e.code === "SITE_FILE_LIMIT" || e.code === "SITE_SIZE_LIMIT") {
        return res.status(409).send({ message: e.code });
      }
      logger.error(e.message);
      return res.status(500).send({ message: "서버 오류가 발생했습니다." });
    }
  });
};

async function streamSiteFile(res, academyId, relativePath) {
  const { data, path } = await getSiteObject(academyId, relativePath);
  const contentType =
    data.ContentType && data.ContentType !== "application/octet-stream"
      ? data.ContentType
      : contentTypeForPath(path);

  // 고유 origin 샌드박스(allow-same-origin 없음) — API 세션 쿠키 접근 차단
  res.set(
    "Content-Security-Policy",
    "sandbox allow-scripts allow-forms allow-popups allow-modals"
  );
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Content-Type", contentType);
  if (data.ContentLength != null) {
    res.set("Content-Length", String(data.ContentLength));
  }
  res.set("Cache-Control", "public, max-age=300");
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  return res.send(data.Body);
}

/**
 * Public serve: GET /sites/:academyId/* and GET /api/sites/:academyId/public/*
 */
export const servePublic = async (req, res) => {
  try {
    const academyId = req.params.academyId;
    const academy = await loadAcademy(academyId);
    if (
      !academy ||
      !academy.isActivated ||
      !academy.sitePublishEnabled ||
      !academy.sitePublished
    ) {
      return res.status(404).send("사이트를 찾을 수 없습니다.");
    }

    const raw = req.params[0] != null ? req.params[0] : "";

    const relativePath = resolvePublicRelativePath(raw);
    if (!relativePath || !isAllowedFilePath(relativePath)) {
      return res.status(404).send("파일을 찾을 수 없습니다.");
    }

    // Ensure key stays under site prefix
    if (!relativePath || relativePath.includes("..")) {
      return res.status(400).send("잘못된 경로입니다.");
    }

    try {
      return await streamSiteFile(res, academyId, relativePath);
    } catch (err) {
      if (err.code === "NoSuchKey") {
        return res.status(404).send("파일을 찾을 수 없습니다.");
      }
      throw err;
    }
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send("서버 오류가 발생했습니다.");
  }
};

/**
 * Admin preview: GET /api/sites/:academyId/preview/*
 */
export const servePreview = async (req, res) => {
  try {
    const academy = await requireEnabledAcademy(req, res);
    if (!academy) return;

    const raw = req.params[0] || "";
    const relativePath = resolvePublicRelativePath(raw);
    if (!relativePath || !isAllowedFilePath(relativePath)) {
      return res.status(404).send({ message: "파일을 찾을 수 없습니다." });
    }

    try {
      return await streamSiteFile(res, academy.academyId, relativePath);
    } catch (err) {
      if (err.code === "NoSuchKey") {
        return res.status(404).send({ message: "파일을 찾을 수 없습니다." });
      }
      throw err;
    }
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
