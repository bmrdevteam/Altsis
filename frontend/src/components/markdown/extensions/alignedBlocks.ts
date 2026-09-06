import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import { Plugin } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import type { Node as PMNode } from "prosemirror-model";
import { serializeAlignedBlock } from "../alignedBlockMarkdown";
import {
  TOOLBAR_INDENT_STEP,
  canIndentFromSpace,
  canOutdentFromBackspace,
  clampIndent,
  formatIndentPadding,
  isBlockIndentTarget,
  isInsideList,
  leadingSpaceFix,
  nextIndent,
  parseIndentFromPadding,
} from "../blockIndent";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockIndent: {
      indentBlockBy: (delta: number) => ReturnType;
      indentBlock: () => ReturnType;
      outdentBlock: () => ReturnType;
    };
  }
}

const ancestorNamesAt = (state: EditorState, pos: number): string[] => {
  const $pos = state.doc.resolve(Math.min(pos + 1, state.doc.content.size));
  const names: string[] = [];
  for (let d = $pos.depth; d > 0; d -= 1) {
    names.push($pos.node(d).type.name);
  }
  return names;
};

const collectIndentBlocks = (
  state: EditorState
): { pos: number; node: PMNode }[] => {
  const { from, to } = state.selection;
  const blocks: { pos: number; node: PMNode }[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!isBlockIndentTarget(node.type.name)) return;
    if (isInsideList(ancestorNamesAt(state, pos))) return false;
    blocks.push({ pos, node });
    return false;
  });
  return blocks;
};

const applyIndentDelta = (
  state: EditorState,
  tr: Transaction,
  delta: number
): boolean => {
  const blocks = collectIndentBlocks(state);
  if (blocks.length === 0) return false;
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const { pos, node } = blocks[i];
    const indent = nextIndent(node.attrs.indent, delta);
    if (indent === clampIndent(node.attrs.indent)) continue;
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent });
  }
  return tr.docChanged;
};

const indentAttribute = {
  indent: {
    default: 0,
    parseHTML: (element: HTMLElement) =>
      parseIndentFromPadding(element.style.paddingLeft),
    renderHTML: (attributes: { indent?: number }) => {
      const n = clampIndent(attributes.indent);
      if (n <= 0) return {};
      return { style: `padding-left: ${formatIndentPadding(n)}` };
    },
  },
};

const runIndentDelta = (
  state: EditorState,
  tr: Transaction,
  dispatch: ((tr: Transaction) => void) | undefined,
  delta: number
): boolean => {
  const ok = applyIndentDelta(state, tr, delta);
  if (ok && dispatch) dispatch(tr);
  return ok;
};

const selectionIndentContext = (state: EditorState) => {
  const { selection } = state;
  const { $from, empty } = selection;
  const ancestorNames: string[] = [];
  for (let d = $from.depth; d > 0; d -= 1) {
    ancestorNames.push($from.node(d).type.name);
  }
  return {
    emptySelection: empty,
    parentName: $from.parent.type.name,
    ancestorNames,
    atBlockStart: $from.parentOffset === 0,
    indent: $from.parent.attrs.indent,
  };
};

const blockIndentShortcuts = {
  Space: ({ editor }: { editor: { state: EditorState; commands: { indentBlockBy: (delta: number) => boolean } } }) => {
    if (!canIndentFromSpace(selectionIndentContext(editor.state))) return false;
    editor.commands.indentBlockBy(1);
    return true;
  },
  Backspace: ({ editor }: { editor: { state: EditorState; commands: { indentBlockBy: (delta: number) => boolean } } }) => {
    if (!canOutdentFromBackspace(selectionIndentContext(editor.state))) {
      return false;
    }
    editor.commands.indentBlockBy(-1);
    return true;
  },
};

const leadingSpacePlugin = () =>
  new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      const fixes: ReturnType<typeof leadingSpaceFix>[] = [];
      newState.doc.descendants((node, pos) => {
        if (!isBlockIndentTarget(node.type.name)) return;
        const first = node.firstChild;
        const firstText = first?.isText ? first.text || "" : "";
        const fix = leadingSpaceFix({
          pos,
          nodeName: node.type.name,
          indent: node.attrs.indent,
          ancestorNames: ancestorNamesAt(newState, pos),
          firstText,
        });
        if (fix) fixes.push(fix);
      });
      if (fixes.length === 0) return null;
      const tr = newState.tr;
      for (let i = fixes.length - 1; i >= 0; i -= 1) {
        const fix = fixes[i];
        if (!fix) continue;
        const node = tr.doc.nodeAt(fix.pos);
        if (!node) continue;
        tr.delete(fix.pos + 1, fix.pos + 1 + fix.deleteLen);
        tr.setNodeMarkup(fix.pos, undefined, {
          ...node.attrs,
          indent: fix.nextIndent,
        });
      }
      return tr.docChanged ? tr : null;
    },
  });

export const AlignedParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...indentAttribute,
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      indentBlockBy:
        (delta: number) =>
        ({ state, dispatch, tr }) =>
          runIndentDelta(state, tr, dispatch, delta),
      indentBlock:
        () =>
        ({ commands }) =>
          commands.indentBlockBy(TOOLBAR_INDENT_STEP),
      outdentBlock:
        () =>
        ({ commands }) =>
          commands.indentBlockBy(-TOOLBAR_INDENT_STEP),
    };
  },
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      ...blockIndentShortcuts,
    };
  },
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), leadingSpacePlugin()];
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          serializeAlignedBlock(state, node, "paragraph");
        },
        parse: {},
      },
    };
  },
});

export const AlignedHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...indentAttribute,
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          serializeAlignedBlock(state, node, "heading");
        },
        parse: {},
      },
    };
  },
}).configure({ levels: [1, 2, 3, 4, 5, 6] });
