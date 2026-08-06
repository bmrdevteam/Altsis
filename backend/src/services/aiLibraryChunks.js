/**
 * AI 라이브러리 청크 분할·검색
 */
import { AiLibraryChunk, AiLibraryItem } from "../models/index.js";
import { PROMPT_LIMITS, truncateText } from "./aiPromptPolicy.js";
import { logger } from "../log/logger.js";

export const CHUNK_MAX_CHARS = 1200;
export const CHUNK_OVERLAP = 150;

/**
 * @param {string} text
 * @param {{ maxChars?: number, overlap?: number }} [opts]
 * @returns {string[]}
 */
export const chunkText = (text, opts = {}) => {
  const maxChars = opts.maxChars ?? CHUNK_MAX_CHARS;
  const overlap = Math.min(
    opts.overlap ?? CHUNK_OVERLAP,
    Math.max(0, maxChars - 1)
  );
  const raw = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return [];
  if (raw.length <= maxChars) return [raw];

  const chunks = [];
  let start = 0;
  while (start < raw.length) {
    let end = Math.min(start + maxChars, raw.length);
    if (end < raw.length) {
      const window = raw.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf("\n"),
        window.lastIndexOf("。"),
        window.lastIndexOf(". ")
      );
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt + 1;
      }
    }
    const piece = raw.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= raw.length) break;
    start = Math.max(0, end - overlap);
    if (start >= end) start = end;
  }
  return chunks;
};

/**
 * @param {string} academyId
 * @param {object} item - AiLibraryItem lean/doc
 */
export const rebuildChunksForItem = async (academyId, item) => {
  if (!item?._id || !academyId) return { chunkCount: 0 };
  const libraryItemId = item._id;
  const schoolId = item.school;
  await AiLibraryChunk(academyId).deleteMany({ libraryItem: libraryItemId });

  const pieces = chunkText(item.content || "");
  if (pieces.length === 0) return { chunkCount: 0 };

  const title = String(item.title || "").trim() || "학습정보";
  const docs = pieces.map((text, index) => ({
    school: schoolId,
    libraryItem: libraryItemId,
    kind: item.kind === "instruction" ? "instruction" : "learning",
    title,
    index,
    text,
    tokenHint: text.length,
  }));
  await AiLibraryChunk(academyId).insertMany(docs);
  return { chunkCount: docs.length };
};

/**
 * @param {string} academyId
 * @param {string|import("mongoose").Types.ObjectId} libraryItemId
 */
export const deleteChunksForItem = async (academyId, libraryItemId) => {
  if (!libraryItemId) return;
  await AiLibraryChunk(academyId).deleteMany({ libraryItem: libraryItemId });
};

/**
 * 질의에서 검색어 토큰 추출
 * @param {string} query
 * @returns {string}
 */
export const buildSearchQuery = (query = "") => {
  const raw = String(query || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const tokens = raw.split(" ").filter((t) => t.length >= 2).slice(0, 12);
  return tokens.join(" ");
};

/**
 * chat용 라이브러리 청크 검색
 * @returns {Promise<Array<{ title: string, content: string, libraryItemId: string }>>}
 */
export const retrieveLibraryChunks = async ({
  academyId,
  schoolId,
  libraryItemIds = [],
  query = "",
  limit,
  perDoc,
} = {}) => {
  const topK = limit ?? PROMPT_LIMITS.CHAT_RETRIEVE_CHUNK_LIMIT ?? 6;
  const maxPerDoc = perDoc ?? PROMPT_LIMITS.CHAT_RETRIEVE_PER_DOC ?? 3;
  const ids = (libraryItemIds || []).map(String).filter(Boolean);
  if (!academyId || !schoolId || ids.length === 0) return [];

  const search = buildSearchQuery(query);
  const Chunk = AiLibraryChunk(academyId);
  const filter = {
    school: schoolId,
    libraryItem: { $in: ids },
    kind: "learning",
  };

  let rows = [];
  try {
    if (search) {
      rows = await Chunk.find(
        { ...filter, $text: { $search: search } },
        { score: { $meta: "textScore" }, title: 1, text: 1, libraryItem: 1, index: 1 }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(topK * 3)
        .lean();
    }
  } catch (err) {
    logger.error(`retrieveLibraryChunks text search: ${err.message}`);
  }

  if (rows.length === 0 && search) {
    const tokens = search.split(/\s+/).filter(Boolean).slice(0, 5);
    if (tokens.length > 0) {
      const or = tokens.map((t) => ({
        text: { $regex: t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
      }));
      rows = await Chunk.find({ ...filter, $or: or })
        .sort({ index: 1 })
        .limit(topK * 3)
        .lean();
    }
  }

  if (rows.length === 0) return [];

  const perDocCount = new Map();
  const picked = [];
  for (const row of rows) {
    const lid = String(row.libraryItem);
    const n = perDocCount.get(lid) || 0;
    if (n >= maxPerDoc) continue;
    perDocCount.set(lid, n + 1);
    const chunkNo = (row.index ?? 0) + 1;
    picked.push({
      title: `${row.title || "학습정보"} · 조각 ${chunkNo}`,
      content: truncateText(
        row.text || "",
        PROMPT_LIMITS.CHAT_REFERENCE_CHARS || 4000
      ),
      libraryItemId: lid,
    });
    if (picked.length >= topK) break;
  }
  return picked;
};

/**
 * 기존 라이브러리 항목에 청크가 없으면 재생성
 */
export const ensureChunksForItems = async (academyId, libraryItemIds = []) => {
  const ids = (libraryItemIds || []).map(String).filter(Boolean);
  if (!ids.length) return;
  for (const id of ids) {
    const count = await AiLibraryChunk(academyId).countDocuments({
      libraryItem: id,
    });
    if (count > 0) continue;
    const item = await AiLibraryItem(academyId).findById(id).lean();
    if (item?.content) {
      await rebuildChunksForItem(academyId, item);
    }
  }
};
