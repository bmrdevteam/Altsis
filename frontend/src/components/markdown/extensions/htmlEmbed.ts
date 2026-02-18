import { Node } from "@tiptap/core";

export interface HtmlEmbedOptions {
  maxInlineSize: number; // bytes
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlEmbed: {
      setHtmlEmbed: (options: {
        embedType: "code" | "url";
        content: string;
        height?: number;
      }) => ReturnType;
    };
  }
}

const MAX_INLINE_SIZE = 50 * 1024; // 50KB
const MIN_HEIGHT = 200;

/** 전체보기 오버레이 (에디터/뷰어 공용) */
export function openFullscreen(embedType: "code" | "url", content: string) {
  const overlay = document.createElement("div");
  overlay.className = "embed-fullscreen-overlay";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "embed-fullscreen-close";
  closeBtn.title = "닫기 (ESC)";
  closeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/>
  </svg>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.className = "embed-fullscreen-iframe";
  if (embedType === "url") {
    iframe.src = content;
  } else {
    iframe.srcdoc = content;
  }

  const close = () => {
    document.removeEventListener("keydown", onEsc);
    overlay.remove();
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
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-html-embed]",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const embedType = el.getAttribute("data-embed-type") || "code";
          const raw = el.getAttribute("data-embed-content") || "";
          const content = embedType === "code" ? safeAtob(raw) : raw;
          const height = parseInt(
            el.getAttribute("data-embed-height") || "0",
            10
          );
          return { embedType, content, height: height || 0 };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { embedType, content, height } = HTMLAttributes;
    const encodedContent =
      embedType === "code" ? safeBtoa(content) : content;
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

  // tiptap-markdown 직렬화: HTML 대신 마크다운 형식으로 출력
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
              `\`\`\`html-app${heightSuffix}\n${node.attrs.content}\n\`\`\``
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
    return ({ node, editor }) => {
      // node attr 업데이트 헬퍼
      const updateHeight = (newHeight: number) => {
        iframe.style.height = `${newHeight}px`;
        const pos = editor.view.posAtDOM(wrapper, 0);
        if (pos != null) {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              height: newHeight,
            })
          );
        }
      };

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.minHeight = `${MIN_HEIGHT}px`;
      wrapper.style.borderRadius = "8px";
      wrapper.style.overflow = "hidden";
      wrapper.style.border = "1px solid var(--border-default-color)";
      wrapper.style.marginBottom = "16px";

      // === 높이 조절 툴바 ===
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
        if (node.attrs.height === value) {
          btn.classList.add("active");
        }
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          // 활성 상태 업데이트
          presetGroup
            .querySelectorAll(".embed-toolbar-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          heightInput.value = value ? String(value) : "";
          if (value === 0) {
            // 자동: 높이 제거 후 iframe 자동 조절
            iframe.style.height = "";
            const pos = editor.view.posAtDOM(wrapper, 0);
            if (pos != null) {
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  height: 0,
                })
              );
            }
            autoResizeIframe();
          } else {
            updateHeight(value);
          }
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
      heightInput.value = node.attrs.height ? String(node.attrs.height) : "";
      heightInput.addEventListener("change", (e) => {
        e.stopPropagation();
        const val = parseInt(heightInput.value, 10);
        if (val >= MIN_HEIGHT) {
          presetGroup
            .querySelectorAll(".embed-toolbar-btn")
            .forEach((b) => b.classList.remove("active"));
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

      // 전체보기 버튼
      const fullscreenBtn = document.createElement("button");
      fullscreenBtn.type = "button";
      fullscreenBtn.className = "embed-toolbar-btn embed-toolbar-icon";
      fullscreenBtn.title = "전체 보기";
      fullscreenBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
      </svg>`;
      fullscreenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFullscreen(node.attrs.embedType, node.attrs.content);
      });

      toolbar.appendChild(presetGroup);
      toolbar.appendChild(heightInputWrapper);
      toolbar.appendChild(fullscreenBtn);

      // === iframe ===
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
      iframe.style.width = "100%";
      iframe.style.minHeight = `${MIN_HEIGHT}px`;
      iframe.style.border = "none";
      iframe.style.display = "block";

      // 저장된 높이가 있으면 적용
      if (node.attrs.height > 0) {
        iframe.style.height = `${node.attrs.height}px`;
      }

      if (node.attrs.embedType === "url") {
        iframe.src = node.attrs.content;
      } else {
        iframe.srcdoc = node.attrs.content;
      }

      // iframe 높이 자동 조절
      const autoResizeIframe = () => {
        try {
          const body = iframe.contentDocument?.body;
          if (body) {
            const h = body.scrollHeight;
            iframe.style.height = `${Math.min(h + 16, 600)}px`;
          }
        } catch {
          iframe.style.height = "400px";
        }
      };

      // 저장된 높이가 없을 때만 자동 조절
      if (!node.attrs.height) {
        iframe.addEventListener("load", autoResizeIframe);
      }

      // === 리사이즈 핸들 ===
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
          heightInput.value = String(finalHeight);
          presetGroup
            .querySelectorAll(".embed-toolbar-btn")
            .forEach((b) => b.classList.remove("active"));
          updateHeight(finalHeight);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      wrapper.appendChild(toolbar);
      wrapper.appendChild(iframe);
      wrapper.appendChild(resizeHandle);

      return {
        dom: wrapper,
        // 툴바 내 input/button 이벤트를 ProseMirror가 가로채지 않도록
        stopEvent: (event: Event) => {
          const target = event.target as HTMLElement;
          return toolbar.contains(target);
        },
      };
    };
  },

  addCommands() {
    return {
      setHtmlEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
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
