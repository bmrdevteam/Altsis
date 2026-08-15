import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import SlashCommandList, {
  type SlashCommandItem,
} from "../SlashCommandList";

export type SlashDialogActions = {
  openImage?: () => void;
  openYouTube?: () => void;
  openEmbed?: () => void;
  openMath?: () => void;
};

const slashPluginKey = new PluginKey("slashCommand");

export const createSlashSuggestion = (
  getActions: () => SlashDialogActions
): Omit<SuggestionOptions<SlashCommandItem>, "editor"> => ({
  char: "/",
  pluginKey: slashPluginKey,
  allowSpaces: false,
  allowedPrefixes: [" ", "\n"],
  allow: ({ state, range }) => {
    const $from = state.doc.resolve(range.from);
    const parent = $from.parent;
    if (parent.type.name !== "paragraph") return false;
    // 빈 단락(또는 `/` 쿼리만 있는 단락)에서만 허용
    const text = parent.textContent.trim();
    return text === "" || /^\/\S*$/.test(text);
  },
  items: ({ query, editor }) => {
    const actions = getActions();
    const all: SlashCommandItem[] = [
      {
        title: "제목 1",
        keywords: ["h1", "제목1", "heading"],
        command: () =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        title: "제목 2",
        keywords: ["h2", "제목2"],
        command: () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        title: "제목 3",
        keywords: ["h3", "제목3"],
        command: () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        title: "제목 4",
        keywords: ["h4", "제목4"],
        command: () =>
          editor.chain().focus().toggleHeading({ level: 4 }).run(),
      },
      {
        title: "제목 5",
        keywords: ["h5", "제목5"],
        command: () =>
          editor.chain().focus().toggleHeading({ level: 5 }).run(),
      },
      {
        title: "제목 6",
        keywords: ["h6", "제목6"],
        command: () =>
          editor.chain().focus().toggleHeading({ level: 6 }).run(),
      },
      {
        title: "목록",
        keywords: ["bullet", "목록", "ul"],
        command: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        title: "번호 목록",
        keywords: ["ordered", "번호", "ol"],
        command: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        title: "체크리스트",
        keywords: ["todo", "체크리스트", "task"],
        command: () => editor.chain().focus().toggleTaskList().run(),
      },
      {
        title: "인라인 체크",
        keywords: ["인라인체크", "checkbox", "체크"],
        command: () =>
          editor
            .chain()
            .focus()
            .insertContent({
              type: "inlineCheckbox",
              attrs: { checked: false },
            })
            .run(),
      },
      {
        title: "인용",
        keywords: ["quote", "인용"],
        command: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        title: "구분선",
        keywords: ["hr", "구분선", "가로줄"],
        command: () => editor.chain().focus().setHorizontalRule().run(),
      },
      {
        title: "표",
        keywords: ["table", "표"],
        command: () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
      },
      {
        title: "코드 블록",
        keywords: ["code", "코드"],
        command: () => editor.chain().focus().toggleCodeBlock().run(),
      },
      {
        title: "이미지",
        keywords: ["image", "이미지", "img"],
        command: () => actions.openImage?.(),
      },
      {
        title: "YouTube",
        keywords: ["youtube", "영상", "비디오"],
        command: () => actions.openYouTube?.(),
      },
      {
        title: "캔버스",
        keywords: ["html", "embed", "임베드", "캔버스", "canvas"],
        command: () => actions.openEmbed?.(),
      },
      {
        title: "수식",
        keywords: ["math", "수식", "latex"],
        command: () => actions.openMath?.(),
      },
    ];

    const q = (query || "").toLowerCase().trim();
    if (!q) return all;
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  },
  command: ({ editor, range, props }) => {
    // 슬래시 쿼리 텍스트 제거 후 명령 실행
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .run();
    props.command();
  },
  render: () => {
    let component: ReactRenderer | null = null;
    let popup: HTMLDivElement | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(SlashCommandList, {
          props: {
            items: props.items,
            command: (item: SlashCommandItem) => props.command(item),
          },
          editor: props.editor,
        });
        popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.zIndex = "1000";
        popup.appendChild(component.element);
        document.body.appendChild(popup);
        const rect = props.clientRect?.();
        if (rect && popup) {
          popup.style.left = `${rect.left + window.scrollX}px`;
          popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
        }
      },
      onUpdate: (props: any) => {
        component?.updateProps({
          items: props.items,
          command: (item: SlashCommandItem) => props.command(item),
        });
        const rect = props.clientRect?.();
        if (rect && popup) {
          popup.style.left = `${rect.left + window.scrollX}px`;
          popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
        }
      },
      onKeyDown: (props: any) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          component?.destroy();
          return true;
        }
        return (component?.ref as any)?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.remove();
        component?.destroy();
      },
    };
  },
});

export const SlashCommand = Extension.create<{
  getActions: () => SlashDialogActions;
}>({
  name: "slashCommand",

  addOptions() {
    return {
      getActions: () => ({}),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...createSlashSuggestion(this.options.getActions),
      }),
    ];
  },
});
