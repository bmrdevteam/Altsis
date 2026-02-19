import Image from "@tiptap/extension-image";

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "inline-block";
      wrapper.style.position = "relative";
      wrapper.style.maxWidth = "100%";
      wrapper.style.lineHeight = "0";

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || "";
      img.title = node.attrs.title || "";
      img.style.maxWidth = "100%";
      img.style.display = "block";
      if (node.attrs.width) {
        img.style.width =
          typeof node.attrs.width === "number"
            ? `${node.attrs.width}px`
            : node.attrs.width;
      }

      // 리사이즈 핸들 (우하단)
      const handle = document.createElement("div");
      handle.className = "image-resize-handle";
      handle.contentEditable = "false";

      let startX = 0;
      let startWidth = 0;

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        startWidth = img.offsetWidth;
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        wrapper.classList.add("image-resizing");
      };

      const onMouseMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff);
        img.style.width = `${newWidth}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        wrapper.classList.remove("image-resizing");

        const finalWidth = img.offsetWidth;
        if (typeof getPos === "function") {
          const pos = getPos();
          if (pos != null) {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                width: `${finalWidth}px`,
              })
            );
          }
        }
      };

      handle.addEventListener("mousedown", onMouseDown);

      wrapper.appendChild(img);
      wrapper.appendChild(handle);

      return {
        dom: wrapper,
        stopEvent: (event: Event) => {
          return event.target === handle || wrapper.classList.contains("image-resizing");
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== "image") return false;
          img.src = updatedNode.attrs.src;
          img.alt = updatedNode.attrs.alt || "";
          if (updatedNode.attrs.width) {
            img.style.width =
              typeof updatedNode.attrs.width === "number"
                ? `${updatedNode.attrs.width}px`
                : updatedNode.attrs.width;
          } else {
            img.style.width = "";
          }
          return true;
        },
        destroy: () => {
          handle.removeEventListener("mousedown", onMouseDown);
        },
      };
    };
  },
});
