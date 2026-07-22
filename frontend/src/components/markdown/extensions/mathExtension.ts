import { Node } from "@tiptap/core";
import katex from "katex";

export type MathEditRequest = {
  latex: string;
  mode: "inline" | "block";
  pos: number;
};

type MathInlineStorage = {
  markdown: {
    serialize: (state: any, node: any) => void;
    parse: Record<string, unknown>;
  };
  openEdit: ((req: MathEditRequest) => void) | null;
};

const openMathEdit = (
  editor: any,
  latex: string,
  mode: "inline" | "block",
  getPos: () => number | undefined
) => {
  const openEdit = (editor.storage as { mathInline?: MathInlineStorage })
    ?.mathInline?.openEdit;
  if (!openEdit || typeof getPos !== "function") return;
  const pos = getPos();
  if (pos == null) return;
  openEdit({ latex, mode, pos });
};

// 인라인 수식: $...$
export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-math-inline]",
        getAttrs: (dom) => ({
          latex: (dom as HTMLElement).getAttribute("data-latex") || "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      { "data-math-inline": "", "data-latex": node.attrs.latex },
      `$${node.attrs.latex}$`,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`$${node.attrs.latex}$`);
        },
        parse: {},
      },
      openEdit: null as ((req: MathEditRequest) => void) | null,
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const span = document.createElement("span");
      span.className = "math-inline-node";
      span.style.cursor = "pointer";
      span.title = "더블클릭하여 편집";

      const renderMath = (latex: string) => {
        try {
          katex.render(latex, span, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          span.textContent = `$${latex}$`;
        }
      };

      renderMath(node.attrs.latex);

      span.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMathEdit(editor, node.attrs.latex, "inline", getPos as any);
      });

      return {
        dom: span,
        stopEvent: () => false,
        update: (updatedNode: any) => {
          if (updatedNode.type.name !== "mathInline") return false;
          renderMath(updatedNode.attrs.latex);
          return true;
        },
      };
    };
  },
});

// 블록 수식: $$...$$
export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-math-block]",
        getAttrs: (dom) => ({
          latex: (dom as HTMLElement).getAttribute("data-latex") || "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      { "data-math-block": "", "data-latex": node.attrs.latex },
      `$$${node.attrs.latex}$$`,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`$$\n${node.attrs.latex}\n$$`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const div = document.createElement("div");
      div.className = "math-block-node";
      div.style.cursor = "pointer";
      div.style.textAlign = "center";
      div.style.padding = "12px 0";
      div.title = "더블클릭하여 편집";

      const renderMath = (latex: string) => {
        try {
          katex.render(latex, div, {
            throwOnError: false,
            displayMode: true,
          });
        } catch {
          div.textContent = `$$${latex}$$`;
        }
      };

      renderMath(node.attrs.latex);

      div.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMathEdit(editor, node.attrs.latex, "block", getPos as any);
      });

      return {
        dom: div,
        stopEvent: () => false,
        update: (updatedNode: any) => {
          if (updatedNode.type.name !== "mathBlock") return false;
          renderMath(updatedNode.attrs.latex);
          return true;
        },
      };
    };
  },
});
