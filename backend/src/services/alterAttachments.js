import { extractText } from "../utils/textExtractor.js";
import { truncateText, PROMPT_LIMITS } from "./aiPromptPolicy.js";

const MIN_PDF_CHARS = 40;

const IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const isAlterImageMime = (mimeType) =>
  IMAGE_MIMES.has(String(mimeType || "").toLowerCase());

/** 브라우저가 잘못된 mime을 줄 때 확장자로 보정 */
export const resolveAlterMime = (mimeType, originalName) => {
  const lower = String(originalName || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return String(mimeType || "").toLowerCase();
};

/**
 * 업로드된 Alter 첨부 처리.
 * 문서 → 텍스트 추출 / 이미지 → key 보관
 */
export const processAlterUpload = async ({
  buffer,
  mimeType,
  originalName,
  fileKey,
  fileSize,
}) => {
  const mime = resolveAlterMime(mimeType, originalName);
  const name = String(originalName || "첨부").trim() || "첨부";

  if (isAlterImageMime(mime)) {
    return {
      kind: "image",
      name,
      mimeType: mime,
      key: fileKey,
      fileSize: fileSize || 0,
    };
  }

  let text = "";
  try {
    text = await extractText(buffer, mimeType);
  } catch (err) {
    const e = new Error(
      `"${name}"에서 텍스트를 추출하지 못했습니다. 다른 파일을 시도해 주세요.`
    );
    e.status = 400;
    e.code = "EXTRACT_FAILED";
    throw e;
  }

  text = String(text || "").trim();
  if (!text) {
    const e = new Error(`"${name}"에서 읽을 수 있는 텍스트가 없습니다.`);
    e.status = 400;
    e.code = "EMPTY_TEXT";
    throw e;
  }
  if (mime === "application/pdf" && text.length < MIN_PDF_CHARS) {
    const e = new Error(
      `"${name}"에서 글자를 거의 찾지 못했습니다. 스캔본이면 이미지로 첨부해 주세요.`
    );
    e.status = 400;
    e.code = "SCAN_PDF";
    throw e;
  }

  const maxChars =
    PROMPT_LIMITS.DOCUMENT_DRAFT_SOURCE_CHARS ||
    PROMPT_LIMITS.REFERENCE_CHARS ||
    12000;

  return {
    kind: "text",
    name,
    text: truncateText(text, maxChars),
    mimeType: mime,
    key: fileKey,
    fileSize: fileSize || 0,
  };
};

/** S3에서 Alter 이미지 첨부를 읽어 base64 parts용으로 변환 */
export const loadAlterImageParts = async (attachments = []) => {
  const { fileBucket, fileS3 } = await import("../_s3/fileBucket.js");
  const images = (attachments || []).filter(
    (a) => a?.kind === "image" && a?.key
  );
  const parts = [];
  for (const img of images.slice(0, 3)) {
    try {
      const obj = await fileS3
        .getObject({ Bucket: fileBucket, Key: String(img.key) })
        .promise();
      const buf = obj.Body;
      const data = Buffer.isBuffer(buf)
        ? buf.toString("base64")
        : Buffer.from(buf).toString("base64");
      parts.push({
        type: "image",
        mimeType: String(img.mimeType || "image/jpeg"),
        data,
        name: String(img.name || "image"),
      });
    } catch {
      // skip unreadable
    }
  }
  return parts;
};

export const attachmentsToSourceText = (attachments = []) =>
  (attachments || [])
    .filter((a) => a?.kind === "text" && a?.text)
    .map((a) => `### ${a.name || "첨부"}\n${a.text}`)
    .join("\n\n");

/**
 * 텍스트 프롬프트 + 이미지 parts로 multimodal user content 구성
 */
export const buildMultimodalUserContent = async (textPrompt, attachments = []) => {
  const imageParts = await loadAlterImageParts(attachments);
  const text = String(textPrompt || "").trim();
  if (imageParts.length === 0) return text;
  const parts = [];
  if (text) parts.push({ type: "text", text });
  parts.push(
    ...imageParts.map((p) => ({
      type: "image",
      mimeType: p.mimeType,
      data: p.data,
    }))
  );
  return parts;
};
