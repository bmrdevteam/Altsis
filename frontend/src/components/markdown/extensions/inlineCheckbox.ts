import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineCheckbox: {
      insertInlineCheckbox: (checked?: boolean) => ReturnType;
    };
  }
}

export const InlineCheckbox = Node.create({
  name: "inlineCheckbox",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      checked: {
        default: false,
        parseHTML: (element) =>
          (element as HTMLElement).hasAttribute("checked") ||
          (element as HTMLElement).getAttribute("data-checked") === "true",
        renderHTML: (attributes) =>
          attributes.checked
            ? { checked: "checked", "data-checked": "true" }
            : { "data-checked": "false" },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'input[type="checkbox"][data-inline-checkbox]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "input",
      mergeAttributes(HTMLAttributes, {
        type: "checkbox",
        "data-inline-checkbox": "",
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const checked = !!node.attrs.checked;
          state.write(
            `<input type="checkbox" data-inline-checkbox${
              checked ? " checked" : ""
            } data-checked="${checked}" />`
          );
        },
        parse: {},
      },
    };
  },

  addCommands() {
    return {
      insertInlineCheckbox:
        (checked = false) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { checked },
          }),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "inline-checkbox-node";
      input.setAttribute("data-inline-checkbox", "");
      input.checked = !!node.attrs.checked;
      input.contentEditable = "false";
      input.title = "클릭하여 체크/해제";

      const onChange = () => {
        if (!editor.isEditable || typeof getPos !== "function") {
          input.checked = !!node.attrs.checked;
          return;
        }
        const pos = getPos();
        if (pos == null) return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, {
            checked: input.checked,
          })
        );
      };

      input.addEventListener("mousedown", (e) => e.preventDefault());
      input.addEventListener("change", onChange);

      return {
        dom: input,
        stopEvent: () => true,
        update: (updated) => {
          if (updated.type.name !== "inlineCheckbox") return false;
          input.checked = !!updated.attrs.checked;
          return true;
        },
        destroy: () => {
          input.removeEventListener("change", onChange);
        },
      };
    };
  },
});
