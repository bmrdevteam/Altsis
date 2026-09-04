/**
 * 양식 응답 Alter 스킬 — 파서·타입 검증
 * (aiSkills와 순환 import를 피하기 위해 normalize를 여기에 둔다)
 */

const unwrapOuterMarkdownFence = (text) => {
  const t = String(text || "").trim();
  const m = t.match(
    /^```(?:markdown|md|json)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i
  );
  return m ? m[1].trim() : t;
};

const CANVAS_JSON_START_RE = /\{\s*"(?:v|html)"\s*:/;

const looksLikeCanvasJson = (text) => {
  const s = String(text || "").trim();
  if (!s) return false;
  const fenced = s.match(
    /^```(?:html-app|canvas)(?::\d+)?[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/
  );
  const body = fenced ? fenced[1].trim() : s;
  const start = body.search(CANVAS_JSON_START_RE);
  if (start < 0) return false;
  const json = body.slice(start);
  const end = json.lastIndexOf("}");
  if (end < 0) return false;
  try {
    const parsed = JSON.parse(json.slice(0, end + 1));
    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        (parsed.v === 1 ||
          "html" in parsed ||
          "css" in parsed ||
          "javascript" in parsed ||
          "js" in parsed)
    );
  } catch {
    return false;
  }
};

const normalizeDocumentDraftContent = (content) => {
  const text = unwrapOuterMarkdownFence(content);
  if (!text.trim()) return text;
  if (/```(?:html-app|canvas)(?::\d+)?\b/.test(text)) return text;
  if (looksLikeCanvasJson(text)) return text;

  const looksLikeHtmlApp =
    /<script[\s>]/i.test(text) ||
    /<!DOCTYPE\s+html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    (/<style[\s>]/i.test(text) &&
      /<\/style>/i.test(text) &&
      /<(?:div|section|main|body)\b/i.test(text));
  if (!looksLikeHtmlApp) return text;

  const startMatch = text.match(
    /<(?:!DOCTYPE\s+html|html\b|head\b|body\b|style\b|script\b|div\b|section\b|main\b)[\s>]/i
  );
  if (!startMatch || startMatch.index == null) return text;

  const before = text.slice(0, startMatch.index).trimEnd();
  const html = text
    .slice(startMatch.index)
    .trim()
    .replace(/```/g, "`\u200b``");
  const fenced = `\`\`\`html-app\n${html}\n\`\`\``;
  return before ? `${before}\n\n${fenced}` : fenced;
};

export const FORM_RESPONSE_WRITABLE_TYPES = new Set([
  "text",
  "textarea",
  "docResponse",
  "number",
  "date",
  "multiDate",
  "time",
  "select",
  "multiSelect",
  "checkbox",
  "radio",
  "userSelect",
  "rating",
  "scale",
  "counter",
  "approval",
  "circulation",
  "link",
]);

export const isFormResponseWritableType = (type) =>
  FORM_RESPONSE_WRITABLE_TYPES.has(String(type || ""));

const findCandidate = (candidates, raw) => {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!raw || typeof raw !== "object") {
    const id = String(raw || "").trim();
    if (!id) return null;
    return list.find((c) => c.userId === id || String(c.user) === id) || null;
  }
  const userId = String(raw.userId || "").trim();
  const user = String(raw.user || "").trim();
  return (
    list.find(
      (c) =>
        (userId && c.userId === userId) ||
        (user && String(c.user) === user) ||
        (userId && String(c.user) === userId)
    ) || null
  );
};

/**
 * @param {{ fieldId: string, type: string, options?: string[], validation?: object }} field
 * @param {unknown} raw
 * @param {Array<{user,userId,userName}>} userCandidates
 */
export const coerceFormResponseValue = (
  field,
  raw,
  userCandidates = []
) => {
  const type = String(field?.type || "");
  if (!isFormResponseWritableType(type)) return null;

  if (
    type === "text" ||
    type === "textarea" ||
    type === "date" ||
    type === "time"
  ) {
    const s = String(raw ?? "").trim();
    return s || null;
  }

  if (type === "docResponse") {
    const s = normalizeDocumentDraftContent(String(raw ?? "")).trim();
    return s || null;
  }

  if (
    type === "number" ||
    type === "rating" ||
    type === "scale" ||
    type === "counter"
  ) {
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
    if (!Number.isFinite(n)) return null;
    let next = n;
    const min = field.validation?.min;
    const max = field.validation?.max;
    if (typeof min === "number" && next < min) next = min;
    if (typeof max === "number" && next > max) next = max;
    return next;
  }

  if (type === "checkbox") {
    if (typeof raw === "boolean") return raw;
    const s = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (["true", "1", "yes", "y", "예", "체크"].includes(s)) return true;
    if (["false", "0", "no", "n", "아니오"].includes(s)) return false;
    return null;
  }

  if (type === "select" || type === "radio") {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    const options = field.options || [];
    if (options.length > 0 && !options.includes(s)) return null;
    return s;
  }

  if (type === "multiSelect" || type === "multiDate") {
    let arr = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.startsWith("[")) {
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) arr = parsed;
        } catch {
          arr = t
            .split(/[,|\n]/)
            .map((x) => x.trim())
            .filter(Boolean);
        }
      } else {
        arr = t
          .split(/[,|\n]/)
          .map((x) => x.trim())
          .filter(Boolean);
      }
    } else return null;
    const strings = arr.map((x) => String(x).trim()).filter(Boolean);
    if (type === "multiSelect") {
      const options = field.options || [];
      const filtered =
        options.length > 0
          ? strings.filter((s) => options.includes(s))
          : strings;
      return filtered.length ? filtered : null;
    }
    return strings.length ? strings : null;
  }

  if (type === "link") {
    if (typeof raw === "string") {
      const url = raw.trim();
      return url ? { url } : null;
    }
    if (raw && typeof raw === "object") {
      const url = String(raw.url || "").trim();
      return url ? { url } : null;
    }
    return null;
  }

  if (type === "userSelect") {
    if (Array.isArray(raw)) {
      const users = raw
        .map((r) => findCandidate(userCandidates, r))
        .filter(Boolean);
      return users.length ? users : null;
    }
    return findCandidate(userCandidates, raw);
  }

  if (type === "approval") {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.steps)) {
      return null;
    }
    const steps = raw.steps
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const approver = findCandidate(userCandidates, s.approver);
        if (!approver) return null;
        return {
          order: typeof s.order === "number" ? s.order : 0,
          label: String(s.label || ""),
          mode: "pick",
          approver,
        };
      })
      .filter(Boolean);
    return steps.length
      ? {
          version: 2,
          currentStep: 0,
          overallStatus: "pending",
          status: "pending",
          steps,
        }
        : null;
  }

  if (type === "circulation") {
    if (Array.isArray(raw)) {
      const users = raw
        .map((r) => findCandidate(userCandidates, r))
        .filter(Boolean);
      return users.length ? users : null;
    }
    const one = findCandidate(userCandidates, raw);
    return one ? [one] : null;
  }

  return null;
};

/** FIELD 키 정규화 — 모델이 `id=<fieldId>`로 쓰는 경우 허용 */
const normalizeFieldKey = (key) => {
  let k = String(key || "").trim();
  if (!k) return "";
  // <<<FIELD id=uuid type=text>>> → uuid
  const idEq = k.match(/^id=(.+)$/i);
  if (idEq) k = String(idEq[1] || "").trim();
  return k;
};

const resolveFieldMeta = (key, metaById, metaByLabel) => {
  const k = normalizeFieldKey(key);
  if (!k) return null;
  if (metaById.has(k)) return metaById.get(k);
  const byLabel = metaByLabel.get(k) || metaByLabel.get(k.toLowerCase());
  return byLabel || null;
};

const coerceBodyForField = (field, body, userCandidates) => {
  const type = String(field.type || "");
  let parsedRaw = body;
  if (
    type !== "text" &&
    type !== "textarea" &&
    type !== "docResponse" &&
    type !== "date" &&
    type !== "time"
  ) {
    try {
      parsedRaw = JSON.parse(body);
    } catch {
      parsedRaw = body;
    }
  }
  return coerceFormResponseValue(field, parsedRaw, userCandidates);
};

/** 마커/JSON이 없을 때 넣을 대표 텍스트 필드 (기안문 우선) */
const pickPrimaryTextField = (fieldMeta = []) => {
  const order = ["docResponse", "textarea", "text"];
  for (const type of order) {
    const hit = (fieldMeta || []).find((f) => f?.type === type);
    if (hit) return hit;
  }
  return null;
};

const stripAssistantPreamble = (text) => {
  let t = String(text || "").trim();
  // 흔한 안내 문장 제거
  t = t.replace(
    /^(?:네|좋습니다|알겠습니다|아래는|다음과 같이|초안입니다)[^\n]*\n+/i,
    ""
  );
  return t.trim();
};

/**
 * <<<FIELD id type=xxx>>>body<<<END_FIELD>>> 파싱 후 타입 검증.
 * 마커가 없거나 id가 라벨인 경우·자유 서술 응답도 최대한 살린다.
 * @param {string} text
 * @param {Array<{fieldId,type,label?,options?,validation?}>} fieldMeta
 * @param {Array} userCandidates
 * @returns {{ byField: Record<string, unknown> }}
 */
export const parseFormResponseDraftResponse = (
  text,
  fieldMeta = [],
  userCandidates = []
) => {
  const raw = unwrapOuterMarkdownFence(text);
  const metaById = new Map(
    (fieldMeta || []).map((f) => [String(f.fieldId), f])
  );
  const metaByLabel = new Map();
  for (const f of fieldMeta || []) {
    const label = String(f.label || "").trim();
    if (label) {
      metaByLabel.set(label, f);
      metaByLabel.set(label.toLowerCase(), f);
    }
  }
  const byField = {};

  // 1) 표준 마커
  const re =
    /<<<FIELD\s+([^\s>]+)(?:\s+type=([^\s>]+))?\s*>>>\s*([\s\S]*?)\s*<<<END_FIELD>>>/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const key = String(m[1] || "").trim();
    const typeHint = String(m[2] || "").trim();
    const body = String(m[3] || "").trim();
    const meta = resolveFieldMeta(key, metaById, metaByLabel);
    if (!meta) continue;
    const field = { ...meta, type: meta.type || typeHint };
    const coerced = coerceBodyForField(field, body, userCandidates);
    if (coerced != null) byField[String(meta.fieldId)] = coerced;
  }

  // 2) JSON 객체 폴백: { "byField": {...} } 또는 { "<fieldId|label>": value }
  if (Object.keys(byField).length === 0) {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const obj = JSON.parse(jsonMatch[0]);
        const source =
          obj && typeof obj === "object" && obj.byField && typeof obj.byField === "object"
            ? obj.byField
            : obj;
        if (source && typeof source === "object" && !Array.isArray(source)) {
          for (const [key, value] of Object.entries(source)) {
            const meta = resolveFieldMeta(key, metaById, metaByLabel);
            if (!meta) continue;
            const coerced = coerceFormResponseValue(
              meta,
              value,
              userCandidates
            );
            if (coerced != null) byField[String(meta.fieldId)] = coerced;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 3) 자유 서술 / 잘못된 FIELD id 폴백: 대표 텍스트·기안문 필드에 본문 넣기
  // 다중 대상일 때는 dump 금지(한 필드에 몰아넣기 방지) — 스킬 재시도/에러로 넘긴다.
  if (Object.keys(byField).length === 0 && (fieldMeta || []).length === 1) {
    const primary = pickPrimaryTextField(fieldMeta);
    if (primary) {
      // 마커 id가 틀려도 블록 본문은 살린다
      const orphanBodies = [];
      const bodyRe =
        /<<<FIELD\s+[^\s>]+(?:\s+type=[^\s>]+)?\s*>>>\s*([\s\S]*?)\s*<<<END_FIELD>>>/gi;
      let bm;
      while ((bm = bodyRe.exec(raw)) !== null) {
        const body = String(bm[1] || "").trim();
        if (body) orphanBodies.push(body);
      }

      let cleaned = stripAssistantPreamble(raw)
        .replace(/<<<FIELD[\s\S]*?<<<END_FIELD>>>/gi, "")
        .trim();
      if (cleaned.length < 8 && orphanBodies.length > 0) {
        cleaned = orphanBodies.join("\n\n").trim();
      }
      // 마커·본문 혼합 실패 시 원문 전체라도 시도
      if (cleaned.length < 8) {
        cleaned = stripAssistantPreamble(raw).trim();
      }

      if (cleaned.length >= 1) {
        const coerced = coerceFormResponseValue(
          primary,
          cleaned,
          userCandidates
        );
        if (coerced != null) byField[String(primary.fieldId)] = coerced;
      }
    }
  }

  return { byField };
};
