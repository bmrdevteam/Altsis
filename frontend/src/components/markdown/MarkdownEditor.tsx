import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { HtmlEmbed } from "./extensions/htmlEmbed";
import TipTapToolbar from "./TipTapToolbar";
import EmbedDialog from "./EmbedDialog";
import {
  postprocessMarkdown,
  transformSpecialNodes,
} from "./extensions/youtube";
import style from "./markdown.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
};

type ViewMode = "wysiwyg" | "source";

// tiptap-markdown 스토리지에서 마크다운 추출
const getMarkdownFromEditor = (
  editor: ReturnType<typeof useEditor>
): string => {
  if (!editor) return "";
  return (editor.storage as any).markdown?.getMarkdown?.() ?? "";
};

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  minHeight = "300px",
}: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image,
      Placeholder.configure({ placeholder }),
      Youtube.extend({
        addStorage() {
          return {
            markdown: {
              serialize(state: any, node: any) {
                state.write(`![youtube](${node.attrs.src})`);
                state.closeBlock(node);
              },
              parse: {},
            },
          };
        },
      }).configure({
        controls: true,
        nocookie: true,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      HtmlEmbed,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const md = getMarkdownFromEditor(editor);
      onChange(postprocessMarkdown(md));
    },
  });

  // 에디터 초기화 후 특수 노드 변환
  // ![youtube](URL) → YouTube 노드, ![embed](URL) → HtmlEmbed 노드,
  // ```html-app → HtmlEmbed 노드
  useEffect(() => {
    if (!editor) return;
    transformSpecialNodes(editor);
  }, [editor]);

  // 외부 value 변경 시 에디터 동기화 (소스 모드에서 편집 후 전환 등)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentMd = postprocessMarkdown(getMarkdownFromEditor(editor));
    if (value !== currentMd) {
      editor.commands.setContent(value);
      // 다시 특수 노드 변환
      setTimeout(() => transformSpecialNodes(editor), 0);
    }
  }, [value, editor]);

  const handleSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleSourceToggle = () => {
    if (viewMode === "source" && editor) {
      editor.commands.setContent(value);
      setTimeout(() => transformSpecialNodes(editor), 0);
    }
    setViewMode(viewMode === "source" ? "wysiwyg" : "source");
  };

  const handleEmbedSubmit = (embedType: "code" | "url", content: string) => {
    if (editor) {
      editor.chain().focus().setHtmlEmbed({ embedType, content }).run();
    }
    setShowEmbedDialog(false);
  };

  return (
    <div className={style.editor}>
      <div className={style.toolbar}>
        <div className={style.tabs}>
          <button
            type="button"
            className={viewMode === "wysiwyg" ? style.active : ""}
            onClick={() => viewMode !== "wysiwyg" && handleSourceToggle()}
          >
            편집
          </button>
          <button
            type="button"
            className={viewMode === "source" ? style.active : ""}
            onClick={() => viewMode !== "source" && handleSourceToggle()}
          >
            소스
          </button>
        </div>
        <TipTapToolbar
          editor={editor}
          isSourceMode={viewMode === "source"}
          onSourceToggle={handleSourceToggle}
          onEmbedClick={() => setShowEmbedDialog(true)}
        />
      </div>

      {viewMode === "source" ? (
        <textarea
          className={style.textarea}
          value={value}
          onChange={handleSourceChange}
          placeholder={placeholder}
          style={{ minHeight }}
        />
      ) : (
        <div className={style.tiptapContent} style={{ minHeight }}>
          <EditorContent editor={editor} />
        </div>
      )}

      {showEmbedDialog && (
        <EmbedDialog
          onSubmit={handleEmbedSubmit}
          onClose={() => setShowEmbedDialog(false)}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
