/**
 * Pure path helpers for academy public sites (no S3 / env dependency).
 */

export const SITE_PREFIX = "site";
export const FOLDER_MARKER = ".keep";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ZIP_BYTES = 20 * 1024 * 1024;
export const MAX_FILE_COUNT = 200;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "json",
  "txt",
  "md",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "map",
  "pdf",
]);

export const TEXT_EXTENSIONS = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "json",
  "txt",
  "md",
  "svg",
  "map",
]);

const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  map: "application/json",
  pdf: "application/pdf",
};

/**
 * Normalize a relative site path. Returns null if invalid.
 */
export function normalizeSitePath(input, opts = {}) {
  const { allowEmpty = false } = opts;
  if (input == null) return allowEmpty ? "" : null;
  if (typeof input !== "string") return null;

  let path = input.replace(/\\/g, "/").trim();
  if (path.startsWith("/")) path = path.slice(1);
  if (path.includes("\0")) return null;

  path = path.replace(/\/+/g, "/");

  if (path === "" || path === ".") {
    return allowEmpty ? "" : null;
  }

  const segments = path.split("/").filter((s) => s !== "");
  if (segments.length === 0) {
    return allowEmpty ? "" : null;
  }

  for (const seg of segments) {
    if (seg === "." || seg === "..") return null;
    if (!/^[\w.\- \uac00-\ud7a3]+$/u.test(seg)) return null;
    if (seg.length > 200) return null;
  }

  return segments.join("/");
}

export function getExtension(relativePath) {
  const base = relativePath.split("/").pop() || "";
  const idx = base.lastIndexOf(".");
  if (idx <= 0) return "";
  return base.slice(idx + 1).toLowerCase();
}

export function isAllowedFilePath(relativePath) {
  const ext = getExtension(relativePath);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) return false;
  const base = relativePath.split("/").pop() || "";
  if (base === FOLDER_MARKER) return false;
  return true;
}

export function isTextEditablePath(relativePath) {
  return TEXT_EXTENSIONS.has(getExtension(relativePath));
}

export function contentTypeForPath(relativePath) {
  const ext = getExtension(relativePath);
  return CONTENT_TYPES[ext] || "application/octet-stream";
}

export function siteRootPrefix(academyId) {
  return `${academyId}/${SITE_PREFIX}/`;
}

export function toS3Key(academyId, relativePath) {
  const root = siteRootPrefix(academyId);
  if (!relativePath) return root;
  return `${root}${relativePath}`;
}

export function assertKeyInSite(academyId, key) {
  const root = siteRootPrefix(academyId);
  return typeof key === "string" && key.startsWith(root) && !key.includes("..");
}

export function relativeFromKey(academyId, key) {
  const root = siteRootPrefix(academyId);
  if (!key.startsWith(root)) return null;
  return key.slice(root.length);
}

/**
 * Resolve public/preview request path to S3 relative path.
 * Empty or trailing slash → index.html
 */
export function resolvePublicRelativePath(rawPath) {
  let path = (rawPath || "").replace(/\\/g, "/");
  if (path.startsWith("/")) path = path.slice(1);
  if (!path || path.endsWith("/")) {
    path = `${path}index.html`.replace(/\/+/g, "/");
  }
  return normalizeSitePath(path, { allowEmpty: false });
}
