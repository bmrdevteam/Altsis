import { Node } from "@tiptap/core";
import katex from "katex";

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
        tag: 'span[data-math-inline]',
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
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const span = document.createElement("span");
      span.className = "math-inline-node";
      span.style.cursor = "pointer";

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

      // 더블클릭으로 편집
      span.addEventListener("dblclick", () => {
        const newLatex = prompt("수식 편집:", node.attrs.latex);
        if (newLatex !== null && typeof getPos === "function") {
          const pos = getPos();
          if (pos != null) {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                latex: newLatex,
              })
            );
          }
        }
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
        tag: 'div[data-math-block]',
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

      div.addEventListener("dblclick", () => {
        const newLatex = prompt("수식 편집:", node.attrs.latex);
        if (newLatex !== null && typeof getPos === "function") {
          const pos = getPos();
          if (pos != null) {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                latex: newLatex,
              })
            );
          }
        }
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
