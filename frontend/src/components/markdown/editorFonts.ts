export const FONT_SIZE_PRESETS = [11, 12, 14, 16, 18, 20, 24, 28, 36] as const;
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 72;

export type FontOption = {
  id: string;
  label: string;
  family: string | null;
};

export const FONT_OPTIONS: FontOption[] = [
  { id: "default", label: "기본", family: null },
  { id: "gothic", label: "고딕", family: "'Noto Sans KR', sans-serif" },
  { id: "serif", label: "명조", family: "'Noto Serif KR', serif" },
  { id: "nanumGothic", label: "나눔고딕", family: "'Nanum Gothic', sans-serif" },
  {
    id: "nanumMyeongjo",
    label: "나눔명조",
    family: "'Nanum Myeongjo', serif",
  },
];

const compactFamily = (value: string): string =>
  value.replace(/['"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** 브라우저가 돌려준 font-family를 허용 목록의 정규 값으로 맞춤 */
export const canonicalFontFamily = (
  raw: string | null | undefined
): string | null => {
  if (!raw) return null;
  const compact = compactFamily(raw);
  if (!compact) return null;
  for (const opt of FONT_OPTIONS) {
    if (!opt.family) continue;
    const key = compactFamily(opt.family);
    const first = key.split(",")[0]?.trim();
    if (compact === key || (first && compact.startsWith(first))) {
      return opt.family;
    }
  }
  return null;
};

export const clampFontSizePx = (n: number): number | null => {
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < FONT_SIZE_MIN || rounded > FONT_SIZE_MAX) return null;
  return rounded;
};

export const parseFontSizePx = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const match = String(raw).trim().match(/^(\d+(?:\.\d+)?)(px)?$/i);
  if (!match) return null;
  return clampFontSizePx(Number(match[1]));
};

export const formatFontSizePx = (n: number): string => `${n}px`;

export type TextStyleMarkAttrs = {
  color?: string | null;
  fontSize?: string | null;
  fontFamily?: string | null;
};

export const textStyleMarkTags = (
  attrs: TextStyleMarkAttrs
): { open: string; close: string } | null => {
  const styles: string[] = [];
  if (attrs.color) styles.push(`color: ${attrs.color}`);
  if (attrs.fontSize) styles.push(`font-size: ${attrs.fontSize}`);
  if (attrs.fontFamily) styles.push(`font-family: ${attrs.fontFamily}`);
  if (!styles.length) return null;
  return {
    open: `<span style="${styles.join("; ")}">`,
    close: "</span>",
  };
};
