/**
 * Extract text content from a file buffer based on mime type
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text
 */
export const extractText = async (buffer, mimeType) => {
  switch (mimeType) {
    case "application/pdf": {
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const data = await pdf(buffer);
      return data.text.trim();
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
    case "text/plain":
    case "text/csv":
    case "text/markdown":
    case "application/json": {
      return buffer.toString("utf-8").trim();
    }
    case "application/vnd.hancom.hwp":
    case "application/octet-stream": {
      // Best-effort: try to extract readable text from binary
      const text = buffer.toString("utf-8").replace(/[^\x20-\x7E\uAC00-\uD7AF\u3131-\u318E\s]/g, "").trim();
      return text || "(텍스트를 추출할 수 없습니다)";
    }
    default:
      return "(지원하지 않는 파일 형식입니다)";
  }
};
