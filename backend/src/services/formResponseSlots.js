/**
 * 기안문(docResponse) 작성 칸 관용구
 * - 표준: (작성), (본문 작성), (금액 작성) 등 — 괄호 안이 「작성」으로 끝남
 * - 확장: (기입), (입력), (내용)
 * - 호환: (이곳에 입력하세요.) / (이곳에 입력하세요)
 * - 명시 칸이 없으면 빈 표 셀·라벨:·밑줄 등을 추론 슬롯으로 사용
 */

/** `(작성)` 또는 `(…작성)` — 줄바꿈·중첩 괄호 없음 */
const STANDARD_SLOT_RE = /\((?:작성|[^\n()]{1,40}?작성)\)/g;
/** `(기입)` `(입력)` `(내용)` */
const FILL_IDIOM_RE = /\((?:기입|입력|내용)\)/g;
/** 기존 양식 호환 */
const LEGACY_SLOT_RE = /\(이곳에\s*입력하세요\.?\)/g;

const SLOT_FILL_RE =
  /<<<SLOT\s*([^\n>]*?)\s*>>>\s*([\s\S]*?)\s*<<<END_SLOT>>>/gi;

const MAX_INFERRED_SLOTS = 20;

/** data URI·초장 URL 이미지는 프롬프트에 넣지 않고 자리만 남긴다 */
export const redactImagesForPrompt = (markdown) => {
  let i = 0;
  return String(markdown || "").replace(
    /!\[([^\]]*)\]\((data:image\/[^)]+|https?:\/\/[^)\s]{180,})\)/gi,
    (_, alt) => {
      i += 1;
      const label = String(alt || "").trim() || "image";
      return `![${label}](<<KEEP_IMAGE_${i}>>)`;
    }
  );
};

/**
 * AI가 넣은 깨진/불필요 이미지·base64 잔여물을 제거한다.
 * 양식 원본의 이미지는 merge 시 base에서 유지되므로 fill 값에 data URI가 있으면 버린다.
 */
export const sanitizeAiDocResponseFill = (text) => {
  let t = String(text || "");
  // `![] (url)` → `![](url)`
  t = t.replace(/!\[([^\]]*)\]\s+\(/g, "![$1](");
  // AI가 따라 쓴 data URI / KEEP 자리표시 이미지 제거
  t = t.replace(/!\[[^\]]*\]\(data:image\/[^)]*\)/gi, "");
  t = t.replace(/!\[[^\]]*\]\(<<KEEP_IMAGE_\d+>>\)/gi, "");
  // 닫는 ) 없이 잘린 data URI·원문 base64 덩어리 제거
  t = t.replace(/!\[[^\]]*\]\(\s*data:image\/[\s\S]*$/gi, "");
  t = t.replace(
    /data:image\/[a-zA-Z0-9+.-]*;base64,[A-Za-z0-9+/=\s]{80,}/gi,
    ""
  );
  t = t.replace(/!\[[^\]]*\]\(\s*$/gm, "");
  return t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};

/** AI·절단 결과처럼 보이는 깨진 data-URI 덤프인지 */
export const isBrokenDocResponseImageDump = (text) => {
  const t = String(text || "");
  if (/!\[\s*\]\s*\(\s*data:image/i.test(t)) return true;
  if (/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{200,}/i.test(t)) return true;
  // 본문 대부분이 base64처럼 보이면
  const compact = t.replace(/\s+/g, "");
  if (compact.length > 400 && /^(?:[A-Za-z0-9+/=]|data:image){400,}/.test(compact)) {
    return true;
  }
  return false;
};

/**
 * SLOT 마커 없이 양식 전체를 다시 쓴 것처럼 보이는지
 * (표 HTML·다수 태그·마크다운 표 골격 재현)
 */
export const looksLikeFullDocRewrite = (aiText) => {
  const t = String(aiText || "").trim();
  if (!t) return false;
  if (parseDocResponseSlotFills(t).length > 0) return false;
  if (/<table[\s>]/i.test(t)) return true;
  const htmlTags = t.match(/<\/?(?:tr|td|th|div|html|body|thead|tbody)\b/gi);
  if (htmlTags && htmlTags.length >= 3) return true;
  // 마크다운 표 골격(+ 수신/경유)을 통째로 다시 쓴 경우
  if (/\|\s*:?-{3,}/.test(t) && (/수신/.test(t) || /경유/.test(t))) {
    return true;
  }
  if (/\|\s*:?-{3,}/.test(t) && t.length > 200) return true;
  if (/수신/.test(t) && /경유/.test(t) && t.length > 180) return true;
  return false;
};

const dedupeSlotsByRange = (found) => {
  found.sort((a, b) => a.start - b.start || a.end - b.end);
  const slots = [];
  let lastEnd = -1;
  for (const s of found) {
    if (s.start < lastEnd) continue;
    slots.push({ ...s, index: slots.length });
    lastEnd = s.end;
  }
  return slots;
};

/**
 * @param {string} text
 * @returns {Array<{ raw: string, label: string, start: number, end: number, index: number }>}
 */
export const extractDocResponseSlots = (text) => {
  const src = String(text || "");
  const found = [];
  const pushMatches = (re) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      found.push({
        raw: m[0],
        label: m[0].slice(1, -1).trim(),
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  };
  pushMatches(STANDARD_SLOT_RE);
  pushMatches(FILL_IDIOM_RE);
  pushMatches(LEGACY_SLOT_RE);
  return dedupeSlotsByRange(found);
};

const isMdTableSeparatorLine = (line) => {
  const t = String(line || "").trim();
  if (!t.includes("|") || !/-{3,}/.test(t)) return false;
  return /^[\s|:\-]+$/.test(t);
};

const parseMdRowCells = (line, lineStart) => {
  const cells = [];
  const cellRe = /\|([^|]*)/g;
  let m;
  while ((m = cellRe.exec(line)) !== null) {
    const inner = m[1];
    const start = lineStart + m.index + 1;
    const end = start + inner.length;
    cells.push({
      inner,
      text: inner.trim(),
      start,
      end,
    });
  }
  return cells;
};

/** HTML 셀 안이 시각적으로 비어 있는지 (에디터 빈 td / &nbsp; / 빈 p) */
const isBlankHtmlCellInner = (inner) => {
  let t = String(inner || "");
  if (/data:image|<img\b|!\[[\s\S]*\]\(/i.test(t)) return false;
  if (/<<KEEP_IMAGE_/.test(t)) return false;
  t = t
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?(?:p|div|span|strong|em|b|i|u)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .trim();
  return t.length === 0;
};

const stripHtmlToText = (html) =>
  String(html || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * HTML 표의 빈 td/th 내부를 추론 슬롯으로 잡는다 (TipTap 기안문).
 * @param {string} src
 * @returns {Array<{ raw: string, label: string, start: number, end: number }>}
 */
const inferHtmlTableEmptyCells = (src) => {
  const found = [];
  if (!/<table[\s>]/i.test(src) || !/<(?:td|th)\b/i.test(src)) return found;

  const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = cellRe.exec(src)) !== null) {
    const tag = String(m[1] || "").toLowerCase();
    const inner = m[3] ?? "";
    const openEnd = m[0].indexOf(">");
    if (openEnd < 0) continue;
    const innerStart = m.index + openEnd + 1;
    // th는 보통 라벨 — 비어 있어도 채우지 않음(헤더 칸 보호)
    if (tag === "th") continue;
    if (!isBlankHtmlCellInner(inner)) continue;

    // 같은 행에서 왼쪽 비어 있지 않은 셀 텍스트를 라벨로
    const before = src.slice(0, m.index);
    const trOpen = before.toLowerCase().lastIndexOf("<tr");
    let label = "";
    if (trOpen >= 0) {
      const rowSlice = src.slice(trOpen, m.index);
      const priorCells = [...rowSlice.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
      for (let i = priorCells.length - 1; i >= 0; i -= 1) {
        const text = stripHtmlToText(priorCells[i][2]);
        if (text) {
          label = text.slice(0, 40);
          break;
        }
      }
    }
    if (!label) label = "빈칸";

    found.push({
      raw: inner,
      label,
      start: innerStart,
      end: innerStart + inner.length,
    });
  }
  return found;
};

/**
 * 명시 작성 칸이 없을 때 빈칸처럼 보이는 위치를 추론한다.
 * @param {string} text
 * @returns {Array<{ raw: string, label: string, start: number, end: number, index: number }>}
 */
export const inferDocResponseSlots = (text) => {
  const src = String(text || "");
  if (!src.trim()) return [];
  const found = [];

  // 1) 마크다운 표: separator 아래 공백-only 셀
  const lines = src.split("\n");
  let offset = 0;
  let inTable = false;
  let headerLabels = [];
  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li];
    const lineStart = offset;
    offset += line.length + 1;

    if (!line.includes("|")) {
      inTable = false;
      headerLabels = [];
      continue;
    }

    if (isMdTableSeparatorLine(line)) {
      inTable = true;
      // 직전 행을 헤더로
      if (li > 0 && lines[li - 1].includes("|")) {
        headerLabels = parseMdRowCells(
          lines[li - 1],
          lineStart - lines[li - 1].length - 1
        ).map((c) => c.text || "");
      }
      continue;
    }

    if (!inTable) continue;

    const cells = parseMdRowCells(line, lineStart);
    for (let ci = 0; ci < cells.length; ci += 1) {
      const cell = cells[ci];
      if (cell.text) continue;
      if (/!\[/.test(cell.inner) || /data:image/i.test(cell.inner)) continue;
      if (/<<KEEP_IMAGE_/.test(cell.inner)) continue;
      let label = "";
      for (let left = ci - 1; left >= 0; left -= 1) {
        if (cells[left].text) {
          label = cells[left].text;
          break;
        }
      }
      if (!label && headerLabels[ci]) label = headerLabels[ci];
      if (!label) label = `빈칸${ci + 1}`;
      found.push({
        raw: cell.inner,
        label,
        start: cell.start,
        end: cell.end,
      });
    }
  }

  // 2) HTML 표 빈 td (TipTap 기안문)
  for (const slot of inferHtmlTableEmptyCells(src)) {
    found.push(slot);
  }

  // 3) 줄 단위 라벨: / 라벨： 뒤가 비어 있음
  {
    const re = /^([^\n|:]{1,20})\s*[:：]\s*$/gm;
    let m;
    while ((m = re.exec(src)) !== null) {
      const label = String(m[1] || "").trim();
      if (!label) continue;
      const insertAt = m.index + m[0].length;
      found.push({
        raw: "",
        label,
        start: insertAt,
        end: insertAt,
      });
    }
  }

  // 4) 밑줄·점선 공란
  {
    const blankRe = /_{3,}|[.·]{3,}/g;
    let m;
    while ((m = blankRe.exec(src)) !== null) {
      const lineStart = src.lastIndexOf("\n", m.index) + 1;
      const prefix = src.slice(lineStart, m.index).replace(/\s+$/u, "");
      const label =
        prefix.replace(/^[\s|*#-]+/, "").trim().slice(-20) || "빈칸";
      found.push({
        raw: m[0],
        label,
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  return dedupeSlotsByRange(found).slice(0, MAX_INFERRED_SLOTS);
};

/**
 * 명시 슬롯이 있으면 그것만, 없으면 추론 슬롯.
 */
export const resolveDocResponseSlots = (text) => {
  const explicit = extractDocResponseSlots(text);
  if (explicit.length) return explicit;
  return inferDocResponseSlots(text);
};

export const hasDocResponseSlots = (text) =>
  resolveDocResponseSlots(text).length > 0;

/**
 * 양식에 나온 순서대로 슬롯을 values로 치환. 값이 비면 원문 유지.
 * @param {string} template
 * @param {Array<string|null|undefined>} values
 * @param {ReturnType<typeof resolveDocResponseSlots>} [slots]
 */
export const fillDocResponseSlotsInOrder = (template, values, slots) => {
  const listSlots =
    Array.isArray(slots) && slots.length
      ? slots
      : resolveDocResponseSlots(template);
  if (!listSlots.length) return String(template || "");
  const list = Array.isArray(values) ? values : [];
  let out = String(template || "");
  // 뒤에서부터 치환해 인덱스 유지
  for (let i = listSlots.length - 1; i >= 0; i -= 1) {
    const slot = listSlots[i];
    const v = list[i];
    if (v == null || !String(v).trim()) continue;
    out = out.slice(0, slot.start) + String(v).trim() + out.slice(slot.end);
  }
  return out;
};

/**
 * AI 본문에서 <<<SLOT …>>> 블록 파싱 (양식 순서 또는 라벨 매칭용)
 * @returns {Array<{ key: string, value: string }>}
 */
export const parseDocResponseSlotFills = (aiText) => {
  const raw = String(aiText || "");
  const fills = [];
  SLOT_FILL_RE.lastIndex = 0;
  let m;
  while ((m = SLOT_FILL_RE.exec(raw)) !== null) {
    const key = String(m[1] || "")
      .trim()
      .replace(/^label\s*=\s*/i, "");
    const value = String(m[2] || "").trim();
    if (value) fills.push({ key, value });
  }
  return fills;
};

const normalizeSlotKey = (key) =>
  String(key || "")
    .trim()
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .trim()
    .toLowerCase();

/**
 * 슬롯 배열에 fill 값을 순서·라벨로 매핑
 * @param {ReturnType<typeof extractDocResponseSlots>} slots
 * @param {Array<{ key: string, value: string }>} fills
 */
export const mapSlotFillsToValues = (slots, fills) => {
  const values = slots.map(() => null);
  if (!fills.length) return values;
  const used = new Set();
  // 1) 라벨 매칭
  for (let i = 0; i < slots.length; i += 1) {
    const labelKey = normalizeSlotKey(slots[i].label);
    const rawKey = normalizeSlotKey(slots[i].raw);
    const hit = fills.findIndex(
      (f, fi) =>
        !used.has(fi) &&
        (normalizeSlotKey(f.key) === labelKey ||
          normalizeSlotKey(f.key) === rawKey ||
          `(${normalizeSlotKey(f.key)})` === normalizeSlotKey(slots[i].raw))
    );
    if (hit >= 0) {
      values[i] = fills[hit].value;
      used.add(hit);
    }
  }
  // 2) 남은 fill을 빈 슬롯에 순서대로
  let fi = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] != null) continue;
    while (fi < fills.length && used.has(fi)) fi += 1;
    if (fi >= fills.length) break;
    values[i] = fills[fi].value;
    used.add(fi);
    fi += 1;
  }
  return values;
};

const stripSlotMarkers = (text) =>
  String(text || "")
    .replace(SLOT_FILL_RE, "$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * AI 결과가 양식 골격(이미지·표·수신 등)을 유지하는지
 */
export const preservesDocResponseSkeleton = (base, aiText) => {
  const baseMd = String(base || "");
  const ai = String(aiText || "");
  if (!baseMd.trim() || !ai.trim()) return false;
  // AI 초안(아직 병합 전)이 이미지 덤프면 골격 불일치.
  // 병합 결과는 base 로고 data URI를 포함하므로 이 검사에 넣지 않는다.

  const hasDataImages = /data:image\//i.test(baseMd);
  if (!hasDataImages) {
    const images = [...baseMd.matchAll(/!\[[^\]]*\]\([^)]+\)/g)].map(
      (m) => m[0]
    );
    if (images.length > 0) {
      const hit = images.filter((img) => ai.includes(img)).length;
      if (hit < Math.ceil(images.length * 0.6)) return false;
    }
  } else if (!/!\[/.test(ai) && !/<<KEEP_IMAGE_/.test(ai) && !/data:image\//i.test(ai)) {
    // base에 이미지가 있는데 AI/병합본에 이미지 흔적이 전혀 없으면 골격 불일치
    return false;
  }

  if (/\|\s*:?-{3,}/.test(baseMd) && !/\|\s*:?-{3,}/.test(ai)) return false;
  if (/수신/.test(baseMd) && !/수신/.test(ai)) return false;
  if (/경유/.test(baseMd) && !/경유/.test(ai)) return false;

  return true;
};

const baseHasDocSkeleton = (b) =>
  resolveDocResponseSlots(b).length > 0 ||
  /수신/.test(b) ||
  /경유/.test(b) ||
  /\|\s*:?-{3,}/.test(b) ||
  /data:image\//i.test(b) ||
  /!\[[^\]]*\]\([^)]+\)/.test(b);

/**
 * 서버 병합(또는 apply) 결과가 에디터에 넣어도 되는지.
 * 14k truncate로 로고 data URI만 남은 문서·이미지 덤프·골격 붕괴를 거부한다.
 */
export const isAcceptableMergedDocResponse = (base, merged) => {
  const b = String(base || "");
  const m = String(merged || "");
  if (!m.trim()) return false;

  // truncateText가 붙이는 말줄임 — 절단본은 절대 반영하지 않음
  if (m.endsWith("…") && (!b || m.length < b.length)) return false;

  // data URI 양식이 크게 줄면 절단/파괴
  if (/data:image\//i.test(b) && b.length > 500 && m.length < b.length * 0.5) {
    return false;
  }

  // base에 없던 깨진 `![] (data:…` 도입 거부
  if (
    /!\[\s*\]\s+\(\s*data:image/i.test(m) &&
    !/!\[\s*\]\s+\(\s*data:image/i.test(b)
  ) {
    return false;
  }

  if (baseHasDocSkeleton(b)) {
    if (!preservesDocResponseSkeleton(b, m)) return false;
  } else if (isBrokenDocResponseImageDump(m)) {
    return false;
  }

  return true;
};

const pickBodySlotIndex = (slots) => {
  const body = slots.findIndex((s) => /본문/.test(s.label));
  if (body >= 0) return body;
  // 레거시·일반 (작성) 중 마지막(보통 본문)
  return slots.length - 1;
};

/**
 * 양식(base)에 AI 결과를 안전하게 병합.
 * 슬롯(명시·추론)이 있으면 골격을 유지한 채 칸만 채운다. 전체 HTML 교체 금지.
 *
 * @param {string} baseDocument 에디터/템플릿 원문
 * @param {string} aiText FIELD 본문(또는 슬롯 블록)
 * @returns {string}
 */
export const mergeDocResponseTemplate = (baseDocument, aiText) => {
  const base = String(baseDocument || "");
  let ai = String(aiText || "").trim();
  if (!ai) return base;
  if (!base.trim()) {
    const only = sanitizeAiDocResponseFill(ai);
    return !only || isBrokenDocResponseImageDump(only) ? "" : only;
  }

  // 슬롯 마커 없이 이미지 덤프가 섞인 경우 → 텍스트만 남기거나 양식 유지
  if (
    isBrokenDocResponseImageDump(ai) &&
    !parseDocResponseSlotFills(ai).length
  ) {
    const cleanedDump = sanitizeAiDocResponseFill(ai);
    if (!cleanedDump || isBrokenDocResponseImageDump(cleanedDump)) {
      return base;
    }
    ai = cleanedDump;
  }

  const slots = resolveDocResponseSlots(base);
  if (!slots.length) {
    if (isBrokenDocResponseImageDump(ai)) return base;
    const cleanedNoSlot = sanitizeAiDocResponseFill(ai);
    if (!cleanedNoSlot || isBrokenDocResponseImageDump(cleanedNoSlot)) {
      return base;
    }
    // 골격이 있는데 전체 재작성처럼 보이면 반영하지 않음(재시도 유도)
    if (baseHasDocSkeleton(base) && looksLikeFullDocRewrite(cleanedNoSlot)) {
      return base;
    }
    return cleanedNoSlot;
  }

  const fills = parseDocResponseSlotFills(ai);
  if (fills.length > 0) {
    const values = mapSlotFillsToValues(slots, fills).map((v) => {
      if (v == null) return null;
      const cleaned = sanitizeAiDocResponseFill(v);
      if (!cleaned || isBrokenDocResponseImageDump(cleaned)) return null;
      return cleaned;
    });
    return fillDocResponseSlotsInOrder(base, values, slots);
  }

  const cleaned = sanitizeAiDocResponseFill(stripSlotMarkers(ai));
  if (!cleaned || isBrokenDocResponseImageDump(cleaned)) {
    return base;
  }

  // SLOT 없이 전체 양식을 다시 쓴 경우 → 미반영(스킬 재시도)
  if (looksLikeFullDocRewrite(ai)) {
    return base;
  }

  // 짧은 본문만 온 경우 → 본문 슬롯에만 넣고 골격 유지 (전체 교체 금지)
  const values = slots.map(() => null);
  values[pickBodySlotIndex(slots)] = cleaned;
  return fillDocResponseSlotsInOrder(base, values, slots);
};

/**
 * 프롬프트용 슬롯 목록 요약.
 * 명시 칸이 없으면 추론 슬롯에 `(추론)` 표시.
 * @returns {{ list: string, inferred: boolean, slots: ReturnType<typeof resolveDocResponseSlots> }}
 */
export const describeDocResponseSlotsForPrompt = (baseDocument) => {
  const explicit = extractDocResponseSlots(baseDocument);
  const inferred = explicit.length === 0;
  const slots = inferred
    ? inferDocResponseSlots(baseDocument)
    : explicit;
  if (!slots.length) {
    return { list: "", inferred: false, slots: [] };
  }
  const list = slots
    .map((s, i) => {
      const name = s.raw?.trim()
        ? s.raw.trim()
        : s.label
          ? `(${s.label})`
          : `(빈칸 ${i + 1})`;
      return inferred ? `${i + 1}. ${name} (추론)` : `${i + 1}. ${name}`;
    })
    .join("\n");
  return { list, inferred, slots };
};
