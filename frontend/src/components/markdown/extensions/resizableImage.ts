import Image from "@tiptap/extension-image";

export type ImageAlign = "left" | "center" | "right";

export const ResizableImage = Image.extend({
  // 표 안 로고를 살짝 밀 때 네이티브 드래그 + selectClickedLeaf RangeError 방지
  draggable: false,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img =
            el.tagName === "FIGURE" ? el.querySelector("img") : el;
          if (!img) return null;
          return (
            img.getAttribute("width") ||
            (img as HTMLElement).style.width ||
            null
          );
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      align: {
        default: "left",
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const data =
            el.getAttribute("data-align") ||
            (el.tagName === "FIGURE"
              ? el.getAttribute("data-align")
              : el.closest("figure")?.getAttribute("data-align"));
          if (data === "left" || data === "center" || data === "right") {
            return data;
          }
          const parent = el.closest("figure") as HTMLElement | null;
          const ta =
            el.style.textAlign ||
            parent?.style?.textAlign ||
            parent?.getAttribute("data-align");
          if (ta === "center" || ta === "right" || ta === "left") return ta;
          return "left";
        },
        renderHTML: (attributes) => ({
          "data-align": attributes.align || "left",
        }),
      },
      caption: {
        default: "",
        parseHTML: (element) => {
          const el = element as HTMLElement;
          if (el.tagName === "FIGURE") {
            return el.querySelector("figcaption")?.textContent || "";
          }
          const figure = el.closest("figure");
          return figure?.querySelector("figcaption")?.textContent || "";
        },
        renderHTML: () => ({}),
      },
      alt: {
        default: "",
        parseHTML: (element) => {
          const el = element as HTMLElement;
          const img =
            el.tagName === "FIGURE" ? el.querySelector("img") : el;
          return img?.getAttribute("alt") || "";
        },
        renderHTML: (attributes) =>
          attributes.alt ? { alt: attributes.alt } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const img = el.querySelector("img");
          if (!img?.getAttribute("src")) return false;
          const alignAttr = el.getAttribute("data-align");
          const align =
            alignAttr === "center" ||
            alignAttr === "right" ||
            alignAttr === "left"
              ? alignAttr
              : "left";
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") || "",
            width:
              img.getAttribute("width") ||
              (img as HTMLElement).style.width ||
              null,
            align,
            caption: el.querySelector("figcaption")?.textContent || "",
          };
        },
      },
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.align || "left";
    const caption = node.attrs.caption || "";
    const imgAttrs: Record<string, any> = { ...HTMLAttributes };
    if (node.attrs.width) imgAttrs.width = node.attrs.width;
    if (node.attrs.alt) imgAttrs.alt = node.attrs.alt;
    imgAttrs["data-align"] = align;

    if (caption) {
      return [
        "figure",
        {
          "data-align": align,
          style:
            align === "center"
              ? "display:block;max-width:100%;width:fit-content;text-align:center;margin:12px auto"
              : align === "right"
                ? "display:block;max-width:100%;width:fit-content;text-align:right;margin:12px 0 12px auto"
                : "display:block;max-width:100%;width:fit-content;text-align:left;margin:12px auto 12px 0",
        },
        ["img", { ...imgAttrs, style: "max-width:100%;height:auto;display:block" }],
        ["figcaption", {}, caption],
      ];
    }

    return [
      "img",
      {
        ...imgAttrs,
        style:
          align === "center"
            ? "display:block;max-width:100%;height:auto;margin-left:auto;margin-right:auto"
            : align === "right"
              ? "display:block;max-width:100%;height:auto;margin-left:auto;margin-right:0"
              : "display:block;max-width:100%;height:auto;margin-right:auto",
      },
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const src = node.attrs.src || "";
          const alt = node.attrs.alt || "";
          const caption = node.attrs.caption || "";
          const align = node.attrs.align || "left";
          const width = node.attrs.width
            ? ` width="${node.attrs.width}"`
            : "";
          if (caption || align !== "left") {
            const style =
              align === "center"
                ? ' style="text-align:center;margin:12px auto"'
                : align === "right"
                  ? ' style="text-align:right;margin:12px 0 12px auto"'
                  : "";
            const cap = caption
              ? `<figcaption>${caption}</figcaption>`
              : "";
            state.write(
              `<figure data-align="${align}"${style}><img src="${src}" alt="${alt}"${width} data-align="${align}" />${cap}</figure>`
            );
            state.closeBlock(node);
          } else {
            state.write(`![${alt}](${src})`);
            state.closeBlock(node);
          }
        },
        parse: {},
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "resizable-image-wrapper";
      wrapper.style.position = "relative";
      wrapper.style.maxWidth = "100%";
      wrapper.style.lineHeight = "1.4";
      wrapper.setAttribute("data-align", node.attrs.align || "left");

      const applyAlign = (align: string) => {
        wrapper.setAttribute("data-align", align);
        wrapper.classList.remove(
          "align-left",
          "align-center",
          "align-right"
        );
        wrapper.classList.add(`align-${align}`);
        // float 사용 금지: ProseMirror/에디터 overflow:visible 에서 컨테이너 밖으로 탈출함
        wrapper.style.cssFloat = "none";
        wrapper.style.clear = "none";
        wrapper.style.display = "block";
        wrapper.style.maxWidth = "100%";
        wrapper.style.width = "fit-content";
        wrapper.style.textAlign = align === "center" ? "center" : "left";
        if (align === "center") {
          wrapper.style.marginLeft = "auto";
          wrapper.style.marginRight = "auto";
        } else if (align === "right") {
          wrapper.style.marginLeft = "auto";
          wrapper.style.marginRight = "0";
        } else {
          wrapper.style.marginLeft = "0";
          wrapper.style.marginRight = "auto";
        }
      };
      applyAlign(node.attrs.align || "left");

      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || "";
      img.title = node.attrs.title || "";
      img.draggable = false;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      if (node.attrs.width) {
        img.style.width =
          typeof node.attrs.width === "number"
            ? `${node.attrs.width}px`
            : node.attrs.width;
      }

      const captionEl = document.createElement("div");
      captionEl.className = "image-caption";
      captionEl.contentEditable = editor.isEditable ? "true" : "false";
      captionEl.textContent = node.attrs.caption || "";
      if (!node.attrs.caption) {
        captionEl.dataset.placeholder = "캡션 입력…";
      }

      const commitCaption = () => {
        if (typeof getPos !== "function") return;
        const pos = getPos();
        if (pos == null) return;
        const text = captionEl.textContent || "";
        const current = editor.state.doc.nodeAt(pos);
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...(current?.attrs || node.attrs),
            caption: text,
          })
        );
      };
      captionEl.addEventListener("blur", commitCaption);
      captionEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          captionEl.blur();
        }
      });

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
            const current = editor.state.doc.nodeAt(pos);
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, {
                ...(current?.attrs || node.attrs),
                width: `${finalWidth}px`,
              })
            );
          }
        }
      };

      handle.addEventListener("mousedown", onMouseDown);

      const onDragStart = (e: DragEvent) => {
        e.preventDefault();
      };
      img.addEventListener("dragstart", onDragStart);
      wrapper.draggable = false;
      wrapper.addEventListener("dragstart", onDragStart);

      wrapper.appendChild(img);
      wrapper.appendChild(captionEl);
      if (editor.isEditable) wrapper.appendChild(handle);

      return {
        dom: wrapper,
        stopEvent: (event: Event) => {
          const t = event.target as Node;
          return (
            event.type === "dragstart" ||
            event.target === handle ||
            captionEl.contains(t) ||
            wrapper.classList.contains("image-resizing")
          );
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== "image") return false;
          node = updatedNode;
          img.src = updatedNode.attrs.src;
          img.alt = updatedNode.attrs.alt || "";
          applyAlign(updatedNode.attrs.align || "left");
          if (document.activeElement !== captionEl) {
            captionEl.textContent = updatedNode.attrs.caption || "";
          }
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
          img.removeEventListener("dragstart", onDragStart);
          wrapper.removeEventListener("dragstart", onDragStart);
          captionEl.removeEventListener("blur", commitCaption);
        },
      };
    };
  },
});
