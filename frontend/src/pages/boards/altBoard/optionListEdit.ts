const OPTION_PASTE_MAX = 200;

/**
 * 클립보드 텍스트를 옵션 목록으로 나눈다.
 * 줄바꿈 우선, 한 줄이면 탭(엑셀 행)으로 나눈다.
 */
export const splitOptionPaste = (text: string): string[] => {
  const raw = String(text ?? "");
  const lines = raw
    .split(/\r\n|\n|\r/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 1 && lines[0].includes("\t")) {
    return lines[0]
      .split("\t")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, OPTION_PASTE_MAX);
  }
  return lines.slice(0, OPTION_PASTE_MAX);
};

export type TOptionListEdit = {
  options: string[];
  focusIndex: number;
};

/** 여러 줄 붙여넣기: 현재 칸을 첫 줄로 바꾸고 나머지를 아래에 삽입 */
export const applyOptionPaste = (
  options: string[] | undefined,
  atIndex: number,
  pasted: string
): TOptionListEdit | null => {
  const lines = splitOptionPaste(pasted);
  if (lines.length <= 1) return null;
  const next = Array.isArray(options) ? [...options] : [];
  if (atIndex < 0 || atIndex > next.length) return null;
  if (atIndex === next.length) {
    next.push(...lines);
    return { options: next, focusIndex: next.length - 1 };
  }
  next[atIndex] = lines[0];
  next.splice(atIndex + 1, 0, ...lines.slice(1));
  return { options: next, focusIndex: atIndex + lines.length - 1 };
};

/** Enter: 현재 칸 아래에 빈 옵션을 넣고 포커스. 마지막 칸이 비어 있으면 무시 */
export const applyOptionEnter = (
  options: string[] | undefined,
  atIndex: number
): TOptionListEdit | null => {
  const next = Array.isArray(options) ? [...options] : [];
  if (atIndex < 0 || atIndex >= next.length) return null;
  const isLast = atIndex === next.length - 1;
  if (isLast && !String(next[atIndex] ?? "").trim()) return null;
  next.splice(atIndex + 1, 0, "");
  return { options: next, focusIndex: atIndex + 1 };
};
