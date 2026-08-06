/**
 * 기안문(docResponse) 작성 칸·미리보기·병합 결과 검증
 * (슬롯 병합은 백엔드에서 수행; 클라이언트는 미리보기·적용 가드만)
 */

const STANDARD_SLOT_RE = /\((?:작성|[^\n()]{1,40}?작성)\)/g;
const LEGACY_SLOT_RE = /\(이곳에\s*입력하세요\.?\)/g;

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

export type TDocResponseSlot = {
  raw: string;
  label: string;
  start: number;
  end: number;
  index: number;
};

export const extractDocResponseSlots = (text: string): TDocResponseSlot[] => {
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
  pushMatches(LEGACY_SLOT_RE);
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

export const preservesDocResponseSkeleton = (base: string, aiText: string) => {
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
    extractDocResponseSlots(b).length > 0 ||
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
