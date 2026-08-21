/**
 * Alter chat: 공식 안내 문서 인메모리 검색
 */
import { GUIDE_DOCS } from "../data/guideDocs.generated.js";
import { chunkText, buildSearchQuery } from "./aiLibraryChunks.js";
import { PROMPT_LIMITS, truncateText } from "./aiPromptPolicy.js";

/** @type {Record<string, string>} */
const DOCS = GUIDE_DOCS || {};

const TITLE_RE = /^#\s+(.+)$/m;

/**
 * @param {string} markdown
 * @param {string} [fallback]
 * @returns {string}
 */
export const titleFromGuideMarkdown = (markdown, fallback = "Altsis 안내") => {
  const m = TITLE_RE.exec(String(markdown || ""));
  if (!m) return fallback;
  const title = m[1].replace(/⚪/g, "").replace(/\s+/g, " ").trim();
  return title || fallback;
};

/**
 * @param {string} [auth]
 * @returns {string[]}
 */
export const guideKeysForAuth = (auth) => {
  const keys = Object.keys(DOCS);
  const allow = (prefixes) =>
    keys.filter((k) => prefixes.some((p) => k === p || k.startsWith(p)));
  if (auth === "owner") {
    return allow(["INDEX.md", "user-guide/", "admin-guide/", "getting-started/"]);
  }
  if (auth === "admin" || auth === "manager") {
    return allow(["INDEX.md", "user-guide/", "admin-guide/"]);
  }
  return allow(["INDEX.md", "user-guide/"]);
};

/** 한국어 메뉴·기능어 → 문서 키 가산 */
const KEY_HINTS = [
  { re: /문서\s*(메뉴|함|페이지|화면)|출력\s*양식|미리보기|인쇄/, keys: ["user-guide/docs.md"] },
  { re: /보드|할\s*일/, keys: ["user-guide/boards.md"] },
  { re: /기록|행동특성|생기부/, keys: ["user-guide/archive.md"] },
  { re: /평가|멘토/, keys: ["user-guide/evaluation.md"] },
  { re: /일정|캘린더/, keys: ["user-guide/calendar.md"] },
  { re: /목표/, keys: ["user-guide/goals.md"] },
  { re: /수업|강의계획|수강|개설/, keys: ["user-guide/courses.md"] },
  { re: /채팅|Alter|알터|DM/, keys: ["user-guide/chat.md"] },
  { re: /알림|푸시/, keys: ["user-guide/notifications.md"] },
  { re: /설정|테마/, keys: ["user-guide/settings.md"] },
  { re: /학기|시즌|쿼터/, keys: ["admin-guide/season-management.md"] },
  { re: /양식\s*관리|출력\s*양식/, keys: ["admin-guide/form-management.md"] },
  { re: /아카데미/, keys: ["admin-guide/academy-management.md"] },
  { re: /사용자\s*관리|계정/, keys: ["admin-guide/user-management.md"] },
  { re: /권한/, keys: ["admin-guide/permission-settings.md"] },
  { re: /학교\s*관리/, keys: ["admin-guide/school-management.md"] },
  { re: /설치|요구사항|빠른\s*시작/, keys: ["getting-started/README.md"] },
  { re: /Altsis|알트시스|안내/, keys: ["INDEX.md", "user-guide/README.md"] },
];

const hintedKeys = (query) => {
  const text = String(query || "");
  const keys = [];
  for (const hint of KEY_HINTS) {
    if (hint.re.test(text)) keys.push(...hint.keys);
  }
  return [...new Set(keys)];
};

/** @type {Map<string, Array<{ key: string, title: string, index: number, text: string }>>} */
const corpusCache = new Map();

const corpusForKeys = (keys) => {
  const cacheKey = keys.slice().sort().join("|");
  const cached = corpusCache.get(cacheKey);
  if (cached) return cached;
  const chunks = [];
  for (const key of keys) {
    const raw = DOCS[key];
    if (!raw) continue;
    const title = titleFromGuideMarkdown(raw, key);
    const pieces = chunkText(raw);
    pieces.forEach((text, index) => {
      chunks.push({ key, title, index, text });
    });
  }
  corpusCache.set(cacheKey, chunks);
  return chunks;
};

const tokenScore = (haystack, tokens) => {
  if (!tokens.length) return 0;
  const lower = String(haystack || "").toLowerCase();
  let n = 0;
  for (const t of tokens) {
    if (lower.includes(t.toLowerCase())) n += 1;
  }
  return n;
};

/**
 * @param {{ query?: string, auth?: string, limit?: number, perDoc?: number }} [opts]
 * @returns {Array<{ key: string, title: string, content: string, index: number }>}
 */
export const retrieveAlterGuide = ({
  query = "",
  auth,
  limit,
  perDoc,
} = {}) => {
  const topK = limit ?? PROMPT_LIMITS.CHAT_RETRIEVE_CHUNK_LIMIT ?? 6;
  const maxPerDoc = perDoc ?? PROMPT_LIMITS.CHAT_RETRIEVE_PER_DOC ?? 3;
  const keys = guideKeysForAuth(auth);
  if (keys.length === 0) return [];

  const search = buildSearchQuery(query);
  const tokens = search ? search.split(/\s+/).filter(Boolean) : [];
  const boostKeys = new Set(hintedKeys(query).filter((k) => keys.includes(k)));
  const chunks = corpusForKeys(keys);

  const scored = [];
  for (const chunk of chunks) {
    let score = tokenScore(chunk.text, tokens);
    score += tokenScore(`${chunk.title} ${chunk.key}`, tokens) * 2;
    if (boostKeys.has(chunk.key)) score += 8;
    if (score <= 0) continue;
    scored.push({ ...chunk, score });
  }

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const perDocCount = new Map();
  const picked = [];
  for (const row of scored) {
    const n = perDocCount.get(row.key) || 0;
    if (n >= maxPerDoc) continue;
    perDocCount.set(row.key, n + 1);
    picked.push({
      key: row.key,
      title: `${row.title} · 조각 ${row.index + 1}`,
      content: truncateText(
        row.text || "",
        PROMPT_LIMITS.CHAT_REFERENCE_CHARS || 4000
      ),
      index: row.index,
    });
    if (picked.length >= topK) break;
  }
  return picked;
};
