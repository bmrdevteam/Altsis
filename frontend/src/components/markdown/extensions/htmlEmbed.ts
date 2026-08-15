import { Node } from "@tiptap/core";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import CanvasEditor, {
  type CanvasEditorSubmit,
} from "../canvas/CanvasEditor";
import {
  attrsFromPayload,
  CANVAS_IFRAME_SANDBOX,
  parseCanvasContent,
  payloadFromAttrs,
  serializeCanvasPayload,
  serializeCodeEmbed,
  shouldSerializeAsCanvas,
  srcDocFromCodeAttrs,
  type CanvasPayload,
} from "../canvas/canvasModel";

export interface HtmlEmbedAttrs {
  embedType: "code" | "url";
  content: string;
  height: number;
  title?: string;
  html?: string;
  css?: string;
  javascript?: string;
  editing?: boolean;
}

export interface HtmlEmbedOptions {
  maxInlineSize: number; // bytes
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlEmbed: {
      setHtmlEmbed: (options: {
        embedType: "code" | "url";
        content?: string;
        height?: number;
        title?: string;
        html?: string;
        css?: string;
        javascript?: string;
        editing?: boolean;
      }) => ReturnType;
      updateHtmlEmbed: (
        pos: number,
        attrs: Partial<HtmlEmbedAttrs>
      ) => ReturnType;
    };
  }
}

const MAX_INLINE_SIZE = 100 * 1024; // 100KB
const MIN_HEIGHT = 200;
const AUTO_HEIGHT_PX = 500;

function normalizeCodeAttrs(options: {
  content?: string;
  height?: number;
  title?: string;
  html?: string;
  css?: string;
  javascript?: string;
}): HtmlEmbedAttrs {
  const height = options.height ?? 0;
  const hasSplit =
    options.html != null ||
    options.css != null ||
    options.javascript != null;
  const payload: CanvasPayload = hasSplit
    ? {
        v: 1,
        ...(options.title?.trim() ? { title: options.title.trim() } : {}),
        html: options.html ?? "",
        css: options.css ?? "",
        javascript: options.javascript ?? "",
      }
    : parseCanvasContent(options.content || "");
  if (!payload.title && options.title?.trim()) {
    payload.title = options.title.trim();
  }
  return attrsFromPayload(payload, height);
}

function codeSrcDoc(attrs: HtmlEmbedAttrs): string {
  return srcDocFromCodeAttrs(attrs);
}

/** 전체보기 오버레이 (에디터/뷰어 공용) */
export function openFullscreen(
  embedType: "code" | "url",
  content: string,
  onClose?: () => void
): { update: (next: string) => void; close: () => void } {
  const overlay = document.createElement("div");
  overlay.className = "embed-fullscreen-overlay";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "embed-fullscreen-close";
  closeBtn.title = "닫기 (ESC)";
  closeBtn.setAttribute("aria-label", "전체 보기 닫기");
  closeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
  </svg>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", CANVAS_IFRAME_SANDBOX);
  iframe.className = "embed-fullscreen-iframe";
  iframe.title = "캔버스 전체 보기";
  if (embedType === "url") {
    iframe.src = content;
  } else {
    iframe.srcdoc = content;
  }

  const close = () => {
    document.removeEventListener("keydown", onEsc);
    overlay.remove();
    onClose?.();
  };

  const onEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", onEsc);

  overlay.appendChild(iframe);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  return {
    update: (next: string) => {
      if (embedType === "url") {
        iframe.src = next;
      } else {
        iframe.srcdoc = next;
      }
    },
    close,
  };
}

export const HtmlEmbed = Node.create<HtmlEmbedOptions>({
  name: "htmlEmbed",
  group: "block",
  atom: true,

  addOptions() {
    return {
      maxInlineSize: MAX_INLINE_SIZE,
    };
  },

  addAttributes() {
    return {
      embedType: { default: "code" },
      content: { default: "" },
      height: { default: 0 }, // 0 = 자동
      title: { default: "" },
      html: { default: "" },
      css: { default: "" },
      javascript: { default: "" },
      editing: { default: false, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-html-embed]",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const embedType =
            (el.getAttribute("data-embed-type") as "code" | "url") || "code";
          const raw = el.getAttribute("data-embed-content") || "";
          const content = embedType === "code" ? safeAtob(raw) : raw;
          const height = parseInt(
            el.getAttribute("data-embed-height") || "0",
            10
          );
          if (embedType === "url") {
            return { embedType, content, height: height || 0 };
          }
          return normalizeCodeAttrs({ content, height: height || 0 });
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as HtmlEmbedAttrs;
    const { embedType, height } = attrs;
    const payload = embedType === "code" ? payloadFromAttrs(attrs) : null;
    const encodedContent =
      embedType === "code" && payload
        ? safeBtoa(
            shouldSerializeAsCanvas(payload)
              ? serializeCanvasPayload(payload)
              : attrs.content || attrs.html || ""
          )
        : attrs.content;
    return [
      "div",
      {
        "data-html-embed": "",
        "data-embed-type": embedType,
        "data-embed-content": encodedContent,
        ...(height ? { "data-embed-height": String(height) } : {}),
      },
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const h = node.attrs.height;
          const heightSuffix = h ? `:${h}` : "";
          if (node.attrs.embedType === "url") {
            state.write(`![embed${heightSuffix}](${node.attrs.content})`);
          } else {
            state.write(
              serializeCodeEmbed(payloadFromAttrs(node.attrs), h || 0)
            );
          }
          state.closeBlock(node);
        },
        parse: {
          // 파싱은 transformSpecialNodes에서 처리
        },
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentAttrs = { ...(node.attrs as HtmlEmbedAttrs) };
      let previewVisible = true;
      let editorFullscreen = false;
      let fullscreenBackdrop: HTMLDivElement | null = null;

      const resolvePos = (): number | null => {
        if (typeof getPos !== "function") return null;
        const pos = getPos();
        return typeof pos === "number" ? pos : null;
      };

      const dispatchAttrs = (next: Partial<HtmlEmbedAttrs>) => {
        const pos = resolvePos();
        if (pos == null) return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, {
            ...currentAttrs,
            ...next,
          })
        );
      };

      const applyIframeContent = () => {
        iframe.title = currentAttrs.title?.trim() || "캔버스";
        if (currentAttrs.embedType === "url") {
          iframe.removeAttribute("srcdoc");
          iframe.src = currentAttrs.content;
        } else {
          iframe.removeAttribute("src");
          iframe.srcdoc = codeSrcDoc(currentAttrs);
        }
      };

      const applyHeight = () => {
        if (!editorFullscreen) {
          if (currentAttrs.height > 0) {
            iframe.style.height = `${currentAttrs.height}px`;
          } else {
            iframe.style.height = `${AUTO_HEIGHT_PX}px`;
          }
        }
        heightInput.value = currentAttrs.height
          ? String(currentAttrs.height)
          : "";
        presetGroup.querySelectorAll(".embed-toolbar-btn").forEach((b) => {
          const value = Number((b as HTMLElement).dataset.height);
          b.classList.toggle("active", currentAttrs.height === value);
        });
      };

      const applyTitle = () => {
        const title = currentAttrs.title?.trim() || "";
        titleEl.textContent = title || "캔버스";
        titleEl.title = title || "캔버스";
        titleEl.hidden = currentAttrs.embedType === "url" && !title;
      };

      const updateHeight = (newHeight: number) => {
        iframe.style.height = `${newHeight || AUTO_HEIGHT_PX}px`;
        dispatchAttrs({ height: newHeight });
        applyHeight();
      };

      const shell = document.createElement("div");
      shell.className = "embed-shell";
      shell.style.width = "100%";
      shell.style.marginBottom = "16px";

      const wrapper = document.createElement("div");
      wrapper.className = "embed-frame";
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.minHeight = `${MIN_HEIGHT}px`;
      wrapper.style.borderRadius = "8px";
      wrapper.style.overflow = "hidden";
      wrapper.style.border = "1px solid var(--border-default-color)";
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";

      const toolbar = document.createElement("div");
      toolbar.className = "embed-toolbar";

      const presets = [
        { label: "자동", value: 0 },
        { label: "S", value: 300 },
        { label: "M", value: 500 },
        { label: "L", value: 700 },
      ];

      const presetGroup = document.createElement("div");
      presetGroup.className = "embed-toolbar-group";

      presets.forEach(({ label, value }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "embed-toolbar-btn";
        btn.textContent = label;
        btn.dataset.height = String(value);
        if (currentAttrs.height === value) {
          btn.classList.add("active");
        }
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          updateHeight(value);
        });
        presetGroup.appendChild(btn);
      });

      const heightInputWrapper = document.createElement("div");
      heightInputWrapper.className = "embed-toolbar-group";

      const heightInput = document.createElement("input");
      heightInput.type = "number";
      heightInput.className = "embed-height-input";
      heightInput.placeholder = "높이(px)";
      heightInput.min = String(MIN_HEIGHT);
      heightInput.setAttribute("aria-label", "캔버스 높이");
      heightInput.value = currentAttrs.height
        ? String(currentAttrs.height)
        : "";
      heightInput.addEventListener("change", (e) => {
        e.stopPropagation();
        const val = parseInt(heightInput.value, 10);
        if (val >= MIN_HEIGHT) {
          updateHeight(val);
        }
      });
      heightInput.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          heightInput.blur();
        }
      });

      const pxLabel = document.createElement("span");
      pxLabel.className = "embed-toolbar-label";
      pxLabel.textContent = "px";

      heightInputWrapper.appendChild(heightInput);
      heightInputWrapper.appendChild(pxLabel);

      const titleEl = document.createElement("span");
      titleEl.className = "embed-toolbar-title";
      applyTitle();

      const actionGroup = document.createElement("div");
      actionGroup.className = "embed-toolbar-group embed-toolbar-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "embed-toolbar-btn embed-toolbar-icon";
      editBtn.title = "캔버스 에디터";
      editBtn.setAttribute("aria-label", "캔버스 에디터");
      editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>`;
      editBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setEditing(!currentAttrs.editing);
      });

      const cloneBtn = document.createElement("button");
      cloneBtn.type = "button";
      cloneBtn.className = "embed-toolbar-btn embed-toolbar-icon";
      cloneBtn.title = "캔버스 복제";
      cloneBtn.setAttribute("aria-label", "캔버스 복제");
      cloneBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>`;
      cloneBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos = resolvePos();
        if (pos == null) return;
        const current = editor.state.doc.nodeAt(pos);
        if (!current || current.type.name !== "htmlEmbed") return;
        editor
          .chain()
          .insertContentAt(pos + current.nodeSize, {
            type: "htmlEmbed",
            attrs: { ...current.attrs, editing: false },
          })
          .run();
      });

      const previewBtn = document.createElement("button");
      previewBtn.type = "button";
      previewBtn.className = "embed-toolbar-btn embed-toolbar-icon";
      previewBtn.title = "미리보기 끄기";
      previewBtn.setAttribute("aria-label", "미리보기 끄기");
      previewBtn.setAttribute("aria-pressed", "true");
      previewBtn.hidden = true;
      previewBtn.style.display = "none";
      previewBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 6c3.79 0 7.17 2.13 8.82 5.5C19.17 14.87 15.79 17 12 17s-7.17-2.13-8.82-5.5C4.83 8.13 8.21 6 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 5a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0-5m0-2c-2.48 0-4.5 2.02-4.5 4.5S9.52 16 12 16s4.5-2.02 4.5-4.5S14.48 7 12 7z"/>
      </svg>`;
      previewBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setPreviewVisible(!previewVisible);
      });

      const fullscreenBtn = document.createElement("button");
      fullscreenBtn.type = "button";
      fullscreenBtn.className = "embed-toolbar-btn embed-toolbar-icon";
      fullscreenBtn.title = "에디터 전체화면";
      fullscreenBtn.setAttribute("aria-label", "에디터 전체화면");
      fullscreenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
      </svg>`;
      fullscreenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentAttrs.embedType === "url") {
          openFullscreen("url", currentAttrs.content);
          return;
        }
        setEditorFullscreen(!editorFullscreen);
      });

      if (editor.isEditable && currentAttrs.embedType !== "url") {
        actionGroup.appendChild(editBtn);
        actionGroup.appendChild(previewBtn);
      }
      actionGroup.appendChild(cloneBtn);
      actionGroup.appendChild(fullscreenBtn);

      toolbar.appendChild(presetGroup);
      toolbar.appendChild(heightInputWrapper);
      toolbar.appendChild(titleEl);
      toolbar.appendChild(actionGroup);

      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", CANVAS_IFRAME_SANDBOX);
      iframe.style.width = "100%";
      iframe.style.minHeight = `${MIN_HEIGHT}px`;
      iframe.style.border = "none";
      iframe.style.display = "block";
      applyIframeContent();
      applyHeight();

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "embed-resize-handle";
      resizeHandle.title = "드래그하여 높이 조절";

      let startY = 0;
      let startHeight = 0;
      let dragging = false;

      resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        startY = e.clientY;
        startHeight = iframe.getBoundingClientRect().height;
        wrapper.style.userSelect = "none";

        const onMouseMove = (ev: MouseEvent) => {
          if (!dragging) return;
          const delta = ev.clientY - startY;
          const newHeight = Math.max(MIN_HEIGHT, startHeight + delta);
          iframe.style.height = `${newHeight}px`;
        };

        const onMouseUp = (ev: MouseEvent) => {
          if (!dragging) return;
          dragging = false;
          wrapper.style.userSelect = "";
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          const finalHeight = Math.max(
            MIN_HEIGHT,
            Math.round(startHeight + (ev.clientY - startY))
          );
          updateHeight(finalHeight);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      const editorMount = document.createElement("div");
      editorMount.className = "canvas-inline-editor";
      editorMount.style.display = "none";

      let reactRoot: Root | null = null;

      const applyCodeAttrs = (value: CanvasEditorSubmit) => {
        const code = normalizeCodeAttrs({
          title: value.title,
          html: value.html,
          css: value.css,
          javascript: value.javascript,
          height: currentAttrs.height,
        });
        dispatchAttrs({
          ...code,
          title: code.title || "",
        });
      };

      const mountEditor = () => {
        if (reactRoot) return;
        editorMount.style.display = "flex";
        editorMount.style.flexDirection = "column";
        editBtn.classList.add("active");
        reactRoot = createRoot(editorMount);
        reactRoot.render(
          createElement(CanvasEditor, {
            initial: currentAttrs,
            onLiveChange: applyCodeAttrs,
            onSubmit: (value) => {
              applyCodeAttrs(value);
              setEditing(false);
            },
          })
        );
        applyPreviewVisibility();
      };

      const setEditing = (editing: boolean) => {
        if (editing) mountEditor();
        else unmountEditor();
        dispatchAttrs({ editing });
      };

      const unmountEditor = () => {
        if (reactRoot) {
          reactRoot.unmount();
          reactRoot = null;
        }
        editorMount.style.display = "none";
        editBtn.classList.remove("active");
        applyPreviewVisibility();
        if (editorFullscreen) setEditorFullscreen(false);
      };

      const applyPreviewVisibility = () => {
        const editing = reactRoot != null;
        previewBtn.hidden = !editing;
        previewBtn.style.display = editing ? "" : "none";
        const showIframe = !editing || previewVisible;
        iframe.style.display = showIframe ? "block" : "none";
        resizeHandle.style.display =
          showIframe && !editorFullscreen ? "block" : "none";
        previewBtn.classList.toggle("is-on", previewVisible);
        previewBtn.setAttribute("aria-pressed", previewVisible ? "true" : "false");
        previewBtn.title = previewVisible ? "미리보기 끄기" : "미리보기 켜기";
        previewBtn.setAttribute(
          "aria-label",
          previewVisible ? "미리보기 끄기" : "미리보기 켜기"
        );
      };

      const onFullscreenEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape" && editorFullscreen) {
          e.preventDefault();
          setEditorFullscreen(false);
        }
      };

      const setPreviewVisible = (visible: boolean) => {
        previewVisible = visible;
        applyPreviewVisibility();
      };

      const setEditorFullscreen = (on: boolean) => {
        if (on === editorFullscreen) return;
        editorFullscreen = on;
        wrapper.classList.toggle("embed-editor-fullscreen", on);
        fullscreenBtn.classList.toggle("is-on", on);
        fullscreenBtn.title = on ? "전체화면 닫기" : "에디터 전체화면";
        fullscreenBtn.setAttribute(
          "aria-label",
          on ? "전체화면 닫기" : "에디터 전체화면"
        );

        if (on) {
          shell.style.minHeight = `${wrapper.getBoundingClientRect().height}px`;
          if (!fullscreenBackdrop) {
            fullscreenBackdrop = document.createElement("div");
            fullscreenBackdrop.className = "embed-editor-fullscreen-backdrop";
            fullscreenBackdrop.addEventListener("click", () => {
              setEditorFullscreen(false);
            });
            document.body.appendChild(fullscreenBackdrop);
          }
          if (
            editor.isEditable &&
            currentAttrs.embedType !== "url" &&
            !currentAttrs.editing
          ) {
            setEditing(true);
          }
          document.addEventListener("keydown", onFullscreenEsc);
        } else {
          shell.style.minHeight = "";
          fullscreenBackdrop?.remove();
          fullscreenBackdrop = null;
          document.removeEventListener("keydown", onFullscreenEsc);
          iframe.style.height = "";
          applyHeight();
        }
        applyPreviewVisibility();
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
        });
      };

      wrapper.appendChild(toolbar);
      wrapper.appendChild(editorMount);
      wrapper.appendChild(iframe);
      wrapper.appendChild(resizeHandle);
      shell.appendChild(wrapper);
      applyPreviewVisibility();

      if (
        editor.isEditable &&
        currentAttrs.editing &&
        currentAttrs.embedType !== "url"
      ) {
        mountEditor();
      }

      return {
        dom: shell,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "htmlEmbed") return false;
          const next = updatedNode.attrs as HtmlEmbedAttrs;
          const wasEditing = Boolean(currentAttrs.editing);
          const srcChanged =
            next.embedType !== currentAttrs.embedType ||
            next.content !== currentAttrs.content ||
            next.html !== currentAttrs.html ||
            next.css !== currentAttrs.css ||
            next.javascript !== currentAttrs.javascript ||
            next.title !== currentAttrs.title;
          currentAttrs = { ...next };
          if (srcChanged) applyIframeContent();
          applyHeight();
          applyTitle();
          const nowEditing = Boolean(next.editing);
          if (nowEditing !== wasEditing) {
            if (nowEditing && next.embedType !== "url") mountEditor();
            else unmountEditor();
          }
          return true;
        },
        destroy: () => {
          setEditorFullscreen(false);
          unmountEditor();
        },
        stopEvent: (event: Event) => {
          const target = event.target;
          return (
            target instanceof Element &&
            (toolbar.contains(target) || editorMount.contains(target))
          );
        },
        ignoreMutation: () => true,
      };
    };
  },

  addCommands() {
    return {
      setHtmlEmbed:
        (options) =>
        ({ commands }) => {
          const attrs =
            options.embedType === "url"
              ? {
                  embedType: "url" as const,
                  content: options.content || "",
                  height: options.height ?? 0,
                  editing: false,
                }
              : {
                  ...normalizeCodeAttrs(options),
                  editing: options.editing ?? false,
                };
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateHtmlEmbed:
        (pos, attrs) =>
        ({ tr, dispatch, state }) => {
          const current = state.doc.nodeAt(pos);
          if (!current || current.type.name !== "htmlEmbed") return false;
          const nextType = attrs.embedType ?? current.attrs.embedType;
          const next =
            nextType === "url"
              ? {
                  ...current.attrs,
                  ...attrs,
                  embedType: "url" as const,
                  editing: false,
                }
              : {
                  ...normalizeCodeAttrs({
                    content: attrs.content ?? current.attrs.content,
                    height: attrs.height ?? current.attrs.height,
                    title: attrs.title ?? current.attrs.title,
                    html: attrs.html ?? current.attrs.html,
                    css: attrs.css ?? current.attrs.css,
                    javascript: attrs.javascript ?? current.attrs.javascript,
                  }),
                  editing: attrs.editing ?? current.attrs.editing ?? false,
                };
          if (dispatch) {
            dispatch(tr.setNodeMarkup(pos, undefined, next));
          }
          return true;
        },
    };
  },
});

// Base64 인코딩/디코딩 (유니코드 지원)
function safeBtoa(str: string): string {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function safeAtob(str: string): string {
  try {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return "";
  }
}

export { safeBtoa, safeAtob };
