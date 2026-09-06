/** 스페이스 1칸 = indent 1. 툴바는 두 칸씩 움직인다. */
export const MAX_INDENT = 16;
export const TOOLBAR_INDENT_STEP = 2;

const LEADING_WS = /^[\u0020\u00a0\t]+/;

export const clampIndent = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_INDENT, Math.max(0, Math.round(n)));
};

export const nextIndent = (current: unknown, delta: number): number =>
  clampIndent(clampIndent(current) + delta);

export const formatIndentPadding = (indent: unknown): string =>
  `${clampIndent(indent)}ch`;

/** padding-left에서 indent를 읽는다. 비정상 값은 0. */
export const parseIndentFromPadding = (raw: unknown): number => {
  const text = String(raw || "").trim();
  if (!text) return 0;
  const m = text.match(/^(-?\d+(?:\.\d+)?)(ch|em|rem|px)?$/i);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const unit = (m[2] || "ch").toLowerCase();
  if (unit === "ch") return clampIndent(n);
  if (unit === "em" || unit === "rem") return clampIndent(n * 2);
  if (unit === "px") return clampIndent(n / 8);
  return 0;
};

export const countLeadingIndentChars = (text: string): number => {
  const m = String(text || "").match(LEADING_WS);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[0]) {
    n += ch === "\t" ? 2 : 1;
  }
  return n;
};

export const isBlockIndentTarget = (nodeName: string): boolean =>
  nodeName === "paragraph" || nodeName === "heading";

export const isListContainerName = (name: string): boolean =>
  name === "listItem" || name === "taskItem";

export const isInsideList = (ancestorNames: string[]): boolean =>
  ancestorNames.some(isListContainerName);

export const canIndentFromSpace = (input: {
  emptySelection: boolean;
  parentName: string;
  ancestorNames: string[];
  atBlockStart: boolean;
}): boolean => {
  if (!input.emptySelection || !input.atBlockStart) return false;
  if (!isBlockIndentTarget(input.parentName)) return false;
  return !isInsideList(input.ancestorNames);
};

export const canOutdentFromBackspace = (input: {
  emptySelection: boolean;
  parentName: string;
  ancestorNames: string[];
  atBlockStart: boolean;
  indent: unknown;
}): boolean => {
  if (!canIndentFromSpace(input)) return false;
  return clampIndent(input.indent) > 0;
};

export type LeadingSpaceFix = {
  pos: number;
  deleteLen: number;
  nextIndent: number;
};

/** 문단 앞 공백을 indent로 바꿀 수 있으면 변환량을 반환한다. */
export const leadingSpaceFix = (input: {
  pos: number;
  nodeName: string;
  indent: unknown;
  ancestorNames: string[];
  firstText: string;
}): LeadingSpaceFix | null => {
  if (!isBlockIndentTarget(input.nodeName)) return null;
  if (isInsideList(input.ancestorNames)) return null;
  const match = String(input.firstText || "").match(LEADING_WS);
  if (!match) return null;
  const add = countLeadingIndentChars(match[0]);
  if (add <= 0) return null;
  return {
    pos: input.pos,
    deleteLen: match[0].length,
    nextIndent: nextIndent(input.indent, add),
  };
};
