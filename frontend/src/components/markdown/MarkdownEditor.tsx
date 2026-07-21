import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "./extensions/resizableImage";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import { HtmlEmbed } from "./extensions/htmlEmbed";
import { MathInline, MathBlock } from "./extensions/mathExtension";
import Mention from "@tiptap/extension-mention";
import { createMentionSuggestion } from "./extensions/mentionSuggestion";
import TipTapToolbar from "./TipTapToolbar";
import TableBubbleMenu from "./TableBubbleMenu";
import EmbedDialog from "./EmbedDialog";
import ImageInsertDialog from "./ImageInsertDialog";
import YouTubeInsertDialog from "./YouTubeInsertDialog";
import MarkdownViewer from "./MarkdownViewer";
import {
  postprocessMarkdown,
  transformSpecialNodes,
} from "./extensions/youtube";
import { useEditorDraft } from "./hooks/useEditorDraft";
import style from "./markdown.module.scss";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
  onFileDrop?: (files: File[]) => void;
  draftKey?: string;
  title?: string;
  onDraftRestore?: (data: { content: string; title?: string }) => void;
  searchMentionUsers?: (query: string) => Promise<any[]>;
  toolbarExtra?: React.ReactNode;
};

type ViewMode = "wysiwyg" | "split";

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
  onImageUpload,
  onFileDrop,
  draftKey,
  title,
  onDraftRestore,
  searchMentionUsers,
  toolbarExtra,
}: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isInternalUpdate = useRef(false);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const dragCountRef = useRef(0);
  const titleRef = useRef(title);
  titleRef.current = title;
  const valueRef = useRef(value);
  valueRef.current = value;

  const {
    hasDraft,
    draftData,
    clearDraft,
    restoreDraft,
    dismissDraft,
    startAutoSave,
  } = useEditorDraft(draftKey);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Markdown.configure({
        html: true,
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
      ResizableImage,
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle.configure({}),
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: (element) =>
                element.style.backgroundColor || null,
              renderHTML: (attributes) => {
                if (!attributes.backgroundColor) return {};
                return {
                  style: `background-color: ${attributes.backgroundColor}`,
                };
              },
            },
          };
        },
      }),
      TableHeader,
      HtmlEmbed,
      MathInline,
      MathBlock,
      ...(searchMentionUsers
        ? [
            Mention.extend({
              addStorage() {
                return {
                  markdown: {
                    serialize(state: any, node: any) {
                      state.write(`@[${node.attrs.label || ""}](${node.attrs.id || ""})`);
                    },
                    parse: {},
                  },
                };
              },
            }).configure({
              HTMLAttributes: { class: "mention-chip" },
              suggestion: createMentionSuggestion(searchMentionUsers),
            }),
          ]
        : []),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const md = getMarkdownFromEditor(editor);
      onChange(postprocessMarkdown(md));
    },
  });

  // 자동 저장 시작
  useEffect(() => {
    if (draftKey) {
      startAutoSave(() => ({
        content: valueRef.current,
        title: titleRef.current,
        savedAt: Date.now(),
      }));
    }
  }, [draftKey, startAutoSave]);

  const handleDraftRestore = () => {
    const data = restoreDraft();
    if (data && onDraftRestore) {
      onDraftRestore({ content: data.content, title: data.title });
    } else if (data) {
      onChange(data.content);
    }
  };

  // 에디터 초기화 후 및 WYSIWYG 전환 시 특수 노드 변환
  // ![youtube](URL) → YouTube 노드, ![embed](URL) → HtmlEmbed 노드,
  // ```html-app → HtmlEmbed 노드
  // useEffect를 사용하여 EditorContent가 DOM에 마운트된 후 실행되도록 보장
  useEffect(() => {
    if (!editor || viewMode !== "wysiwyg") return;
    transformSpecialNodes(editor);
  }, [editor, viewMode]);

  // 외부 value 변경 시 에디터 동기화 (소스 모드에서 편집 후 전환 등)
  useEffect(() => {
    if (!editor) return;
    // 분할 모드에서는 textarea가 직접 value를 편집하므로
    // TipTap 동기화를 건너뛴다 (피드백 루프 방지)
    if (viewModeRef.current !== "wysiwyg") return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentMd = postprocessMarkdown(getMarkdownFromEditor(editor));
    if (value !== currentMd) {
      // addToHistory: false로 설정하여 Ctrl+Z 시 이전 상태로 되돌리지 않음
      editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta("addToHistory", false);
          return true;
        })
        .setContent(value)
        .run();
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

  const switchMode = (mode: ViewMode) => {
    if (mode === viewMode) return;
    // 분할 모드에서 WYSIWYG로 복귀 시 에디터 동기화
    if (mode === "wysiwyg" && viewMode !== "wysiwyg" && editor) {
      editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta("addToHistory", false);
          return true;
        })
        .setContent(value)
        .run();
      // transformSpecialNodes는 useEffect에서 viewMode 변경 후 실행됨
      // (EditorContent가 DOM에 마운트된 후 안전하게 실행)
    }
    setViewMode(mode);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    if (dragCountRef.current === 1) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const otherFiles = files.filter((f) => !f.type.startsWith("image/"));

    // 이미지 파일은 에디터에 인라인으로 삽입
    for (const file of imageFiles) {
      if (onImageUpload && editor) {
        const url = await onImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    }

    // 비이미지 파일은 부모 컴포넌트에 전달
    if (otherFiles.length > 0 && onFileDrop) {
      onFileDrop(otherFiles);
    }
  };

  const handleEmbedSubmit = (embedType: "code" | "url", content: string) => {
    if (editor) {
      editor.chain().focus().setHtmlEmbed({ embedType, content }).run();
    }
    setShowEmbedDialog(false);
  };

  return (
    <div className={style.editor}>
      {hasDraft && draftData && (
        <div className={style.draftBanner}>
          <span>
            저장된 임시글이 있습니다 (
            {(() => {
              const mins = Math.floor(
                (Date.now() - draftData.savedAt) / 60000
              );
              if (mins < 1) return "방금 전";
              if (mins < 60) return `${mins}분 전`;
              const hours = Math.floor(mins / 60);
              if (hours < 24) return `${hours}시간 전`;
              return `${Math.floor(hours / 24)}일 전`;
            })()}
            )
          </span>
          <div className={style.draftBannerActions}>
            <button type="button" onClick={handleDraftRestore}>
              복원
            </button>
            <button type="button" onClick={dismissDraft}>
              삭제
            </button>
          </div>
        </div>
      )}
      <div className={style.toolbar}>
        <div className={style.tabs}>
          <button
            type="button"
            className={viewMode === "wysiwyg" ? style.active : ""}
            onClick={() => switchMode("wysiwyg")}
          >
            편집
          </button>
          <button
            type="button"
            className={viewMode === "split" ? style.active : ""}
            onClick={() => switchMode("split")}
          >
            분할
          </button>
        </div>
        <div className={style.toolbarRight}>
          <TipTapToolbar
            editor={editor}
            onEmbedClick={() => setShowEmbedDialog(true)}
            onImageClick={() => setShowImageDialog(true)}
            onYouTubeClick={() => setShowYouTubeDialog(true)}
          />
          {toolbarExtra}
        </div>
      </div>

      {viewMode === "wysiwyg" ? (
        <div
          className={style.tiptapContent}
          style={{ minHeight, position: "relative" }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <EditorContent editor={editor} />
          {editor && <TableBubbleMenu editor={editor} />}
          {isDragging && (
            <div className={style.dropOverlay}>
              <span>파일을 여기에 놓으세요</span>
            </div>
          )}
        </div>
      ) : (
        <div className={style.splitView} style={{ minHeight }}>
          <textarea
            className={style.splitTextarea}
            value={value}
            onChange={handleSourceChange}
            placeholder={placeholder}
          />
          <div className={style.splitDivider} />
          <div className={style.splitPreview}>
            <MarkdownViewer content={value} />
          </div>
        </div>
      )}

      {showEmbedDialog && (
        <EmbedDialog
          onSubmit={handleEmbedSubmit}
          onClose={() => setShowEmbedDialog(false)}
        />
      )}

      {showImageDialog && (
        <ImageInsertDialog
          onSubmit={(url) => {
            if (editor) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          onClose={() => setShowImageDialog(false)}
          onImageUpload={onImageUpload}
        />
      )}
      {showYouTubeDialog && (
        <YouTubeInsertDialog
          onSubmit={(src) => {
            if (editor) {
              editor.chain().focus().setYoutubeVideo({ src }).run();
            }
          }}
          onClose={() => setShowYouTubeDialog(false)}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
