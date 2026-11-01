import type { Mark, Node as PMNode } from "prosemirror-model";
import { parseFontSizePx } from "./editorFonts";

type FontSizeEditorState = {
  doc: PMNode;
  storedMarks: readonly Mark[] | null;
  selection: {
    empty: boolean;
    from: number;
    to: number;
    $from: { marks: () => readonly Mark[] };
  };
};

/**
 * `.tiptapContent .ProseMirror` 의 font-size.
 * markdown.module.scss 와 함께 바꾼다.
 */
export const EDITOR_BASE_FONT_PX = 14;

/** h1–h6 em. markdown.module.scss 의 제목 크기와 같다. */
export const HEADING_FONT_EM: Record<number, number> = {
  1: 2,
  2: 1.5,
  3: 1.25,
  4: 1.125,
  5: 1,
  6: 0.875,
};

/**
 * `code`와 `pre`가 각각 85%다. `pre code`는 font-size를 되돌리지 않으므로
 * 코드 블록은 85%가 두 번 적용된다.
 */
export const CODE_FONT_SCALE = 0.85;

export type SelectionFontSize =
  | { status: "uniform"; px: number; explicit: boolean }
  | { status: "mixed" }
  | { status: "none" };

export type FontSizeContext = {
  explicitPx: number | null;
  headingLevel: number | null;
  /** 인라인 `code` 마크 */
  inlineCode: boolean;
  /** `codeBlock` 안 */
  codeBlock: boolean;
};

const toCents = (px: number): number => Math.round(px * 100);

/** 85%를 센트 단위로 곱해 0.85의 이진 오차가 10.11처럼 보이지 않게 한다. */
const scaleByCode = (px: number, steps: number): number => {
  const percent = Math.round(CODE_FONT_SCALE * 100);
  let cents = toCents(px);
  for (let step = 0; step < steps; step += 1) {
    cents = Math.round((cents * percent) / 100);
  }
  return cents / 100;
};

export const formatToolbarFontSize = (px: number): string => {
  const cents = toCents(px);
  const whole = Math.trunc(cents / 100);
  const frac = Math.abs(cents % 100);
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
};

/** 스타일로만 정해지는 크기. 직접 지정한 px와 코드 85%는 포함하지 않는다. */
export const implicitBlockFontSizePx = (headingLevel: number | null): number => {
  const em =
    headingLevel != null ? HEADING_FONT_EM[headingLevel] : undefined;
  const px = em != null ? EDITOR_BASE_FONT_PX * em : EDITOR_BASE_FONT_PX;
  return toCents(px) / 100;
};

/**
 * 화면에 보이는 글자 크기.
 * 직접 지정한 px는 절대값이라 제목·코드 배율보다 우선한다.
 */
export const displayedFontSizePx = (ctx: FontSizeContext): number => {
  if (ctx.explicitPx != null) return toCents(ctx.explicitPx) / 100;
  const base = implicitBlockFontSizePx(ctx.headingLevel);
  const steps =
    (ctx.codeBlock ? 2 : 0) + (!ctx.codeBlock && ctx.inlineCode ? 1 : 0);
  if (steps === 0) return base;
  return scaleByCode(base, steps);
};

const explicitPxFromMarks = (marks: readonly Mark[]): number | null => {
  const mark = marks.find((item) => item.type.name === "textStyle");
  if (!mark) return null;
  return parseFontSizePx(mark.attrs?.fontSize);
};

const contextFromAncestors = (
  doc: PMNode,
  pos: number,
  marks: readonly Mark[]
): FontSizeContext => {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  let headingLevel: number | null = null;
  let codeBlock = false;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type.name === "heading" && headingLevel == null) {
      const level = Number(node.attrs.level);
      if (level >= 1 && level <= 6) headingLevel = level;
    }
    if (node.type.name === "codeBlock") codeBlock = true;
  }
  return {
    explicitPx: explicitPxFromMarks(marks),
    headingLevel,
    inlineCode: marks.some((mark) => mark.type.name === "code"),
    codeBlock,
  };
};

const sizeFromContext = (
  ctx: FontSizeContext
): { px: number; explicit: boolean } => ({
  px: displayedFontSizePx(ctx),
  explicit: ctx.explicitPx != null,
});

/**
 * 커서이거나 선택 안 글의 크기가 하나면 그 크기를, 여러 크기면 mixed를 반환한다.
 * 글자가 없는 노드 선택(이미지 등)은 none이다.
 */
export const resolveSelectionFontSize = (
  state: FontSizeEditorState
): SelectionFontSize => {
  const { selection } = state;
  if (selection.empty) {
    const marks = state.storedMarks ?? selection.$from.marks();
    const sized = sizeFromContext(
      contextFromAncestors(state.doc, selection.from, marks)
    );
    return { status: "uniform", ...sized };
  }

  let px: number | null = null;
  let explicit = true;
  let sawText = false;
  let mixed = false;
  state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (!node.isText || mixed) return;
    sawText = true;
    const sized = sizeFromContext(
      contextFromAncestors(state.doc, pos, node.marks)
    );
    if (px == null) {
      px = sized.px;
      explicit = sized.explicit;
      return;
    }
    if (px !== sized.px) {
      mixed = true;
      return;
    }
    if (!sized.explicit) explicit = false;
  });

  if (!sawText || px == null) return { status: "none" };
  if (mixed) return { status: "mixed" };
  return { status: "uniform", px, explicit };
};
