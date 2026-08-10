/**
 * 기안문(docResponse) 작성 칸·미리보기·병합 결과 검증
 * (슬롯 병합은 백엔드에서 수행; 클라이언트는 미리보기·적용 가드만)
 */

const STANDARD_SLOT_RE = /\((?:작성|[^\n()]{1,40}?작성)\)/g;
const FILL_IDIOM_RE = /\((?:기입|입력|내용)\)/g;
const LEGACY_SLOT_RE = /\(이곳에\s*입력하세요\.?\)/g;

const MAX_INFERRED_SLOTS = 20;

/** 미리보기용: data URI·초장 이미지를 짧은 표기로 치환 */
export const redactImagesForPreview = (text: string) => {
  let t = String(text || "");
  t = t.replace(/!\[([^\]]*)\]\s+\(/g, "![$1](");
  t = t.replace(/!\[[^\]]*\]\(data:image\/[^)]*\)/gi, "[이미지]");
  t = t.replace(/!\[[^\]]*\]\(\s*data:image\/[\s\S]*$/gi, "[이미지]");
  t = t.replace(
    /!\[[^\]]*\]\(https?:\/\/[^)\s]{180,}\)/gi,
    "[이미지]"
  );
  t = t.replace(
    /data:image\/[a-zA-Z0-9+.-]*;base64,[A-Za-z0-9+/=\s]{40,}/gi,
    "[이미지]"
  );
  return t.replace(/\n{3,}/g, "\n\n").trim();
};

/** AI·절단 결과처럼 보이는 깨진 data-URI 덤프인지 */
export const isBrokenDocResponseImageDump = (text: string) => {
  const t = String(text || "");
  if (/!\[\s*\]\s*\(\s*data:image/i.test(t)) return true;
  if (/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{200,}/i.test(t)) return true;
  const compact = t.replace(/\s+/g, "");
  if (
    compact.length > 400 &&
    /^(?:[A-Za-z0-9+/=]|data:image){400,}/.test(compact)
  ) {
    return true;
  }
  return false;
};

type TDocResponseSlot = {
  raw: string;
  label: string;
  start: number;
  end: number;
  index: number;
};

const dedupeSlotsByRange = (
  found: Array<Omit<TDocResponseSlot, "index">>
): TDocResponseSlot[] => {
  found.sort((a, b) => a.start - b.start || a.end - b.end);
  const slots: TDocResponseSlot[] = [];
  let lastEnd = -1;
  for (const s of found) {
    if (s.start < lastEnd) continue;
    slots.push({ ...s, index: slots.length });
    lastEnd = s.end;
  }
  return slots;
};

const extractDocResponseSlots = (text: string): TDocResponseSlot[] => {
  const src = String(text || "");
  const found: Array<Omit<TDocResponseSlot, "index">> = [];
  const pushMatches = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
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

const isMdTableSeparatorLine = (line: string) => {
  const t = String(line || "").trim();
  if (!t.includes("|") || !/-{3,}/.test(t)) return false;
  return /^[\s|:\-]+$/.test(t);
};

const parseMdRowCells = (line: string, lineStart: number) => {
  const cells: Array<{
    inner: string;
    text: string;
    start: number;
    end: number;
  }> = [];
  const cellRe = /\|([^|]*)/g;
  let m: RegExpExecArray | null;
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
const isBlankHtmlCellInner = (inner: string) => {
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

const stripHtmlToText = (html: string) =>
  String(html || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const inferHtmlTableEmptyCells = (
  src: string
): Array<Omit<TDocResponseSlot, "index">> => {
  const found: Array<Omit<TDocResponseSlot, "index">> = [];
  if (!/<table[\s>]/i.test(src) || !/<(?:td|th)\b/i.test(src)) return found;

  const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(src)) !== null) {
    const tag = String(m[1] || "").toLowerCase();
    const inner = m[3] ?? "";
    const openEnd = m[0].indexOf(">");
    if (openEnd < 0) continue;
    const innerStart = m.index + openEnd + 1;
    if (tag === "th") continue;
    if (!isBlankHtmlCellInner(inner)) continue;

    const before = src.slice(0, m.index);
    const trOpen = before.toLowerCase().lastIndexOf("<tr");
    let label = "";
    if (trOpen >= 0) {
      const rowSlice = src.slice(trOpen, m.index);
      const priorCells = Array.from(
        rowSlice.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)
      );
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

/** 명시 작성 칸이 없을 때 빈칸처럼 보이는 위치를 추론 */
const inferDocResponseSlots = (text: string): TDocResponseSlot[] => {
  const src = String(text || "");
  if (!src.trim()) return [];
  const found: Array<Omit<TDocResponseSlot, "index">> = [];

  const lines = src.split("\n");
  let offset = 0;
  let inTable = false;
  let headerLabels: string[] = [];
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

  for (const slot of inferHtmlTableEmptyCells(src)) {
    found.push(slot);
  }

  {
    const re = /^([^\n|:]{1,20})\s*[:：]\s*$/gm;
    let m: RegExpExecArray | null;
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

  {
    const blankRe = /_{3,}|[.·]{3,}/g;
    let m: RegExpExecArray | null;
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

const resolveDocResponseSlots = (text: string): TDocResponseSlot[] => {
  const explicit = extractDocResponseSlots(text);
  if (explicit.length) return explicit;
  return inferDocResponseSlots(text);
};

const preservesDocResponseSkeleton = (base: string, aiText: string) => {
  const baseMd = String(base || "");
  const ai = String(aiText || "");
  if (!baseMd.trim() || !ai.trim()) return false;

  const hasDataImages = /data:image\//i.test(baseMd);
  if (!hasDataImages) {
    const images = Array.from(
      baseMd.matchAll(/!\[[^\]]*\]\([^)]+\)/g),
      (m) => m[0]
    );
    if (images.length > 0) {
      const hit = images.filter((img) => ai.includes(img)).length;
      if (hit < Math.ceil(images.length * 0.6)) return false;
    }
  } else if (
    !/!\[/.test(ai) &&
    !/<<KEEP_IMAGE_/.test(ai) &&
    !/data:image\//i.test(ai)
  ) {
    return false;
  }

  if (/\|\s*:?-{3,}/.test(baseMd) && !/\|\s*:?-{3,}/.test(ai)) return false;
  if (/수신/.test(baseMd) && !/수신/.test(ai)) return false;
  if (/경유/.test(baseMd) && !/경유/.test(ai)) return false;

  return true;
};

/**
 * 서버 병합(또는 apply) 결과가 에디터에 넣어도 되는지.
 * truncate로 로고 data URI만 남은 문서·이미지 덤프·골격 붕괴를 거부한다.
 */
export const isAcceptableMergedDocResponse = (
  base: string,
  merged: string
) => {
  const b = String(base || "");
  const m = String(merged || "");
  if (!m.trim()) return false;

  if (m.endsWith("…") && (!b || m.length < b.length)) return false;

  if (/data:image\//i.test(b) && b.length > 500 && m.length < b.length * 0.5) {
    return false;
  }

  if (
    /!\[\s*\]\s+\(\s*data:image/i.test(m) &&
    !/!\[\s*\]\s+\(\s*data:image/i.test(b)
  ) {
    return false;
  }

  const baseHasSkeleton =
    resolveDocResponseSlots(b).length > 0 ||
    /수신/.test(b) ||
    /경유/.test(b) ||
    /\|\s*:?-{3,}/.test(b) ||
    /data:image\//i.test(b) ||
    /!\[[^\]]*\]\([^)]+\)/.test(b);

  if (baseHasSkeleton) {
    if (!preservesDocResponseSkeleton(b, m)) return false;
  } else if (isBrokenDocResponseImageDump(m)) {
    return false;
  }

  return true;
};
