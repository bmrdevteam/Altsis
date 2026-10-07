export const GUIDE_HITS = 2;
export const GUIDE_CHARS = 500;
export const GUIDE_CANDIDATES = 8;

const ANCHOR_LINK_RE = /\[[^\]]*\]\(#[^)]*\)/g;
const HANGUL_WORD_RE = /^[\uac00-\ud7a3]+$/;
const QUERY_STOPWORDS = new Set([
  "어디서",
  "어떻게",
  "뭐",
  "뭐고",
  "무엇",
  "어디",
  "왜",
  "언제",
  "누구",
  "무슨",
  "어떤",
]);
// Longest first so "에서" wins over "에" and "으로" over "로".
const TRAILING_ENDINGS = [
  "하나요",
  "에서",
  "으로",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "의",
  "도",
  "해",
  "할",
  "로",
  "고",
];

const stemQueryToken = (token) => {
  let stem = token;
  let guard = 0;
  while (stem.length >= 2 && guard < 4) {
    const ending = TRAILING_ENDINGS.find(
      (suffix) =>
        stem.endsWith(suffix) &&
        (stem.length - suffix.length >= 2 || QUERY_STOPWORDS.has(stem.slice(0, -suffix.length)))
    );
    if (!ending) break;
    stem = stem.slice(0, -ending.length);
    guard += 1;
  }
  if (stem.length >= 3 && HANGUL_WORD_RE.test(stem)) stem = stem.slice(0, 2);
  return stem;
};

const queryTokens = (query) => {
  const raw = String(query || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);
  const out = [];
  for (const token of raw) {
    if (QUERY_STOPWORDS.has(token)) continue;
    const stem = stemQueryToken(token);
    if (!stem || stem.length < 2 || QUERY_STOPWORDS.has(stem)) continue;
    out.push(stem);
  }
  return [...new Set(out)];
};

const tokenHits = (text, tokens) => {
  const lower = String(text || "").toLowerCase();
  return tokens.reduce((n, token) => n + (token && lower.includes(token) ? 1 : 0), 0);
};

/** Presence plus a capped repeat count, so a full section beats a one-line stub. */
const tokenWeight = (text, tokens) => {
  const lower = String(text || "").toLowerCase();
  return tokens.reduce((sum, token) => {
    if (!token) return sum;
    let count = 0;
    let from = 0;
    while (count < 4) {
      const at = lower.indexOf(token, from);
      if (at < 0) break;
      count += 1;
      from = at + token.length;
    }
    return sum + count;
  }, 0);
};

const isHeadingLine = (line) => /^#{1,6}\s+\S/.test(String(line || "").trim());

const isAnchorLinkLine = (line) => {
  const text = String(line || "").trim();
  if (!text.includes("](#")) return false;
  const rest = text.replace(ANCHOR_LINK_RE, "").replace(/^[-*\d.)\s]+/, "").trim();
  return rest.length === 0;
};

/** Drop 목차, heading-only lines, and `[개요](#개요)` so the clip reaches the steps. */
const cleanGuideBody = (raw) => {
  const lines = String(raw || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inToc = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s*목차\s*$/.test(trimmed) || trimmed === "목차") {
      inToc = true;
      continue;
    }
    if (inToc) {
      if (isHeadingLine(trimmed) || trimmed === "---") inToc = false;
      else continue;
    }
    if (!trimmed || trimmed === "---" || isHeadingLine(trimmed) || isAnchorLinkLine(trimmed)) {
      continue;
    }
    const withoutAnchors = trimmed.replace(ANCHOR_LINK_RE, "").replace(/[ \t]{2,}/g, " ").trim();
    if (withoutAnchors) out.push(withoutAnchors);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/**
 * Start at the ## section that matches the query, instead of the intro in the same chunk.
 */
const focusGuideBody = (raw, query) => {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const tokens = queryTokens(query);
  const cuts = [];
  lines.forEach((line, index) => {
    if (/^#{1,2}\s+\S/.test(line.trim())) cuts.push(index);
  });
  if (!cuts.length) return cleanGuideBody(text);
  const sections = [];
  if (cuts[0] > 0) sections.push({ heading: "", body: lines.slice(0, cuts[0]).join("\n") });
  for (let i = 0; i < cuts.length; i += 1) {
    const start = cuts[i];
    const end = i + 1 < cuts.length ? cuts[i + 1] : lines.length;
    sections.push({
      heading: lines[start].replace(/^#{1,6}\s+/, "").trim(),
      body: lines.slice(start + 1, end).join("\n"),
    });
  }
  let best = "";
  let bestScore = -1;
  for (const section of sections) {
    const cleaned = cleanGuideBody(section.body);
    if (!cleaned) continue;
    const score = tokenHits(section.heading, tokens) * 3 + tokenHits(cleaned, tokens);
    if (score > bestScore) {
      bestScore = score;
      best = cleaned;
    }
  }
  if (!best || bestScore <= 0) return cleanGuideBody(text);
  return best;
};

/** Penalize a chunk only when stripping 목차, headings, and anchor lines leaves little prose. */
const mostlyTocAfterStrip = (raw) => {
  const lines = String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return true;
  const kept = cleanGuideBody(raw)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  return kept / lines.length < 0.45;
};

export const rankGuideHit = (hit, query, order) => {
  const tokens = queryTokens(query);
  const excerpt = focusGuideBody(hit?.content, query);
  const raw = String(hit?.content || "");
  let headingHits = 0;
  for (const line of raw.split("\n")) {
    const match = line.trim().match(/^#{1,6}\s+(.+)$/);
    if (!match || /^목차$/.test(match[1].trim())) continue;
    headingHits = Math.max(headingHits, tokenHits(match[1], tokens));
  }
  let score = excerpt ? tokenWeight(excerpt, tokens) * 2 : -1;
  score += headingHits * 3;
  if (mostlyTocAfterStrip(raw)) score -= 8;
  const place = Number.isFinite(order) ? Math.max(0, order) : GUIDE_CANDIDATES;
  score += (GUIDE_CANDIDATES - Math.min(place, GUIDE_CANDIDATES)) * 0.25;
  return { hit, order, excerpt, score };
};

export const guideTitleForModel = (title) =>
  String(title || "")
    .replace(/\s*·\s*조각\s*\d+\s*$/u, "")
    .trim();
