export type TFormFileRef = {
  originalName: string;
  key: string;
  mimeType?: string;
  size?: number;
};

export type TFilePreviewKind =
  | "image"
  | "pdf"
  | "html"
  | "text"
  | "download";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const TEXT_EXT = new Set(["txt", "md", "markdown", "json"]);

export const fileExtension = (name: string): string => {
  const parts = String(name || "").split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
};

export const inferMimeType = (file: TFormFileRef): string => {
  const given = String(file.mimeType || "").toLowerCase();
  if (given && given !== "application/octet-stream") return given;
  const ext = fileExtension(file.originalName);
  if (IMAGE_EXT.has(ext)) return ext === "jpg" ? "image/jpeg" : `image/${ext}`;
  if (ext === "pdf") return "application/pdf";
  if (ext === "html" || ext === "htm") return "text/html";
  if (ext === "csv") return "text/csv";
  if (ext === "json") return "application/json";
  if (ext === "md" || ext === "markdown") return "text/markdown";
  if (ext === "txt") return "text/plain";
  return given || "application/octet-stream";
};

export const getFilePreviewKind = (file: TFormFileRef): TFilePreviewKind => {
  const mime = inferMimeType(file);
  const ext = fileExtension(file.originalName);
  if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime === "text/html" || mime === "application/xhtml+xml" || ext === "html" || ext === "htm") {
    return "html";
  }
  if (mime === "text/csv" || mime === "application/csv" || ext === "csv") {
    return "download";
  }
  if (
    mime === "text/plain" ||
    mime === "application/json" ||
    mime === "text/markdown" ||
    TEXT_EXT.has(ext)
  ) {
    return "text";
  }
  return "download";
};

export const formatFileSize = (bytes?: number): string => {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const fileTypeLabel = (file: TFormFileRef): string => {
  const ext = fileExtension(file.originalName);
  return ext ? ext.toUpperCase() : "FILE";
};

export type TFileThumbTone =
  | "csv"
  | "pdf"
  | "html"
  | "image"
  | "json"
  | "text"
  | "office"
  | "archive"
  | "default";

export const fileThumbTone = (file: TFormFileRef): TFileThumbTone => {
  const ext = fileExtension(file.originalName);
  if (ext === "csv" || ext === "xls" || ext === "xlsx") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "html" || ext === "htm") return "html";
  if (IMAGE_EXT.has(ext)) return "image";
  if (ext === "json") return "json";
  if (TEXT_EXT.has(ext)) return "text";
  if (["doc", "docx", "ppt", "pptx"].includes(ext)) return "office";
  if (["zip", "rar", "7z", "gz"].includes(ext)) return "archive";
  return "default";
};

