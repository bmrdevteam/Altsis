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
      }) => ReturnType;
    };
  }
}

const MAX_INLINE_SIZE = 50 * 1024; // 50KB

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
          return { embedType, content };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { embedType, content } = HTMLAttributes;
    const encodedContent =
      embedType === "code" ? safeBtoa(content) : content;
    return [
      "div",
      {
        "data-html-embed": "",
        "data-embed-type": embedType,
        "data-embed-content": encodedContent,
      },
    ];
  },

  // tiptap-markdown 직렬화: HTML 대신 마크다운 형식으로 출력
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          if (node.attrs.embedType === "url") {
            state.write(`![embed](${node.attrs.content})`);
          } else {
            state.write(`\`\`\`html-app\n${node.attrs.content}\n\`\`\``);
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
    return ({ node }) => {
      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";
      wrapper.style.width = "100%";
      wrapper.style.minHeight = "200px";
      wrapper.style.borderRadius = "8px";
      wrapper.style.overflow = "hidden";
      wrapper.style.border = "1px solid var(--border-default-color)";
      wrapper.style.marginBottom = "16px";

      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
      iframe.style.width = "100%";
      iframe.style.minHeight = "200px";
      iframe.style.border = "none";
      iframe.style.display = "block";

      if (node.attrs.embedType === "url") {
        iframe.src = node.attrs.content;
      } else {
        iframe.srcdoc = node.attrs.content;
      }

      // iframe 높이 자동 조절
      iframe.addEventListener("load", () => {
        try {
          const body = iframe.contentDocument?.body;
          if (body) {
            const height = body.scrollHeight;
            iframe.style.height = `${Math.min(height + 16, 600)}px`;
          }
        } catch {
          // cross-origin 에러 무시
          iframe.style.height = "400px";
        }
      });

      wrapper.appendChild(iframe);

      return { dom: wrapper };
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
