import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { getMarkRange } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { ResizableImage } from "./extensions/resizableImage";
import { InlineCheckbox } from "./extensions/inlineCheckbox";
import { SlashCommand, type SlashDialogActions } from "./extensions/slashCommand";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { HtmlEmbed } from "./extensions/htmlEmbed";
import {
  MathInline,
  MathBlock,
  MathEditRequest,
} from "./extensions/mathExtension";
import Mention from "@tiptap/extension-mention";
import { createMentionSuggestion } from "./extensions/mentionSuggestion";
import TipTapToolbar from "./TipTapToolbar";
import type { MoreMenuItem } from "./ToolbarMoreMenu";
import ToolbarContextTabs from "./ToolbarContextTabs";
import TableToolbar from "./TableToolbar";
import ImageToolbar from "./ImageToolbar";
import LinkBubbleMenu from "./LinkBubbleMenu";
import { DEFAULT_CANVAS_HEIGHT } from "./canvas/canvasModel";
import ImageInsertDialog from "./ImageInsertDialog";
import YouTubeInsertDialog from "./YouTubeInsertDialog";
import LinkInsertDialog from "./LinkInsertDialog";
import MathInsertDialog from "./MathInsertDialog";
import MarkdownViewer from "./MarkdownViewer";
import {
  postprocessMarkdown,
  transformSpecialNodes,
} from "./extensions/youtube";
import { useEditorDraft } from "./hooks/useEditorDraft";
import { tableCellStyleAttributes } from "./tableCellAttributes";
import { handleAtomNodeClick } from "./atomNodeClick";
import { handleTableCellClick } from "./tableCellClick";
import { StyledTable } from "./tableMarkdown";
import { serializeClipboardPlainText } from "./clipboardPlainText";
import { AlignedHeading, AlignedParagraph } from "./extensions/alignedBlocks";
import { StyledTextStyle } from "./extensions/styledTextStyle";
import {
  activeToolbarPanel,
  detectEditorContext,
  resolveToolbarTab,
  type EditorContext,
  type ToolbarTab,
} from "./toolbarTab";
import style from "./markdown.module.scss";
import Svg from "assets/svg/Svg";
import "katex/dist/katex.min.css";

type MathDialogState =
  | null
  | { kind: "insert" }
  | {
      kind: "edit";
      latex: string;
      mathMode: "inline" | "block";
      pos: number;
    };

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
  toolbarMoreItems?: MoreMenuItem[];
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
  toolbarMoreItems,
}: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>("wysiwyg");
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [mathDialog, setMathDialog] = useState<MathDialogState>(null);
  const [isDragging, setIsDragging] = useState(false);
  // 에디터가 onChange로 내보낸 마지막 값. 외부 value와 다를 때만 TipTap에 동기화한다.
  // boolean isInternalUpdate는 onUpdate 후 state가 동일하면 effect가 안 돌아 플래그가
  // 남을 수 있어 Alter 반영 등 외부 setContent가 무시되는 버그가 있었다.
  const lastEmittedRef = useRef(value);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const dragCountRef = useRef(0);
  const titleRef = useRef(title);
  titleRef.current = title;
  const valueRef = useRef(value);
  valueRef.current = value;
  const transformTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentVersionRef = useRef(0);
  const openLinkDialogRef = useRef(() => {});
  openLinkDialogRef.current = () => setShowLinkDialog(true);
  const insertCanvasRef = useRef(() => {});

  const slashActionsRef = useRef<SlashDialogActions>({});
  slashActionsRef.current = {
    openImage: () => setShowImageDialog(true),
    openYouTube: () => setShowYouTubeDialog(true),
    openEmbed: () => insertCanvasRef.current(),
    openMath: () => setMathDialog({ kind: "insert" }),
  };

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
        heading: false,
        paragraph: false,
      }),
      AlignedParagraph,
      AlignedHeading,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      InlineCheckbox,
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
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      StyledTextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      // StyledTable: 셀 스타일이 있으면 HTML로 직렬화해 저장 시 스타일 유지
      // TipTap ≥3.6: TableView.ignoreMutation 수정으로 resizable과 CellSelection 병행 가능
      StyledTable.configure({ resizable: true }),
      TableRow,
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            ...tableCellStyleAttributes,
          };
        },
      }),
      TableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            ...tableCellStyleAttributes,
          };
        },
      }),
      HtmlEmbed,
      MathInline,
      MathBlock,
      SlashCommand.configure({
        getActions: () => slashActionsRef.current,
      }),
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
    editorProps: {
      clipboardTextSerializer: serializeClipboardPlainText,
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          openLinkDialogRef.current();
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        // MouseDown.up보다 먼저 셀 블록을 접어, Chrome·resizable 표의 옛 doc setSelection을 피한다
        mousedown: (view, event) => {
          const mouse = event as MouseEvent;
          if (mouse.button !== 0 || mouse.shiftKey) return false;
          const coords = view.posAtCoords({
            left: mouse.clientX,
            top: mouse.clientY,
          });
          if (coords) handleTableCellClick(view, coords.pos);
          return false;
        },
      },
      handleClickOn: (view, _pos, node, nodePos, event, direct) => {
        if (event.button !== 0 || !direct) return false;
        if (node.type.name !== "image") return false;
        // selectClickedLeaf는 옛 ResolvedPos로 NodeSelection을 만들어 표 안 이미지에서 RangeError가 난다
        handleAtomNodeClick(view, nodePos);
        return true;
      },
      handleClick: (view, pos, event) => {
        if (event.button !== 0) return false;
        if (handleTableCellClick(view, pos)) return true;
        const linkType = view.state.schema.marks.link;
        if (!linkType) return false;
        const $pos = view.state.doc.resolve(pos);
        const range = getMarkRange($pos, linkType);
        if (!range) return false;
        // 클릭 시 링크만 선택 → 버블 메뉴 표시 (편집 다이얼로그는 버블의 '편집' / Mod-K)
        const tr = view.state.tr.setSelection(
          TextSelection.create(view.state.doc, range.from, range.to)
        );
        view.dispatch(tr);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const md = postprocessMarkdown(getMarkdownFromEditor(editor));
      lastEmittedRef.current = md;
      onChange(md);
    },
  });

  // 수식 더블클릭 → 편집 다이얼로그
  useEffect(() => {
    if (!editor) return;
    const storage = editor.storage as {
      mathInline?: { openEdit: ((req: MathEditRequest) => void) | null };
    };
    if (!storage.mathInline) return;
    storage.mathInline.openEdit = (req) => {
      setMathDialog({
        kind: "edit",
        latex: req.latex,
        mathMode: req.mode,
        pos: req.pos,
      });
    };
    return () => {
      if (storage.mathInline) storage.mathInline.openEdit = null;
    };
  }, [editor]);

  // 버블은 링크만. 표/이미지는 상단 탭에서 같은 줄의 도구를 교체한다.
  const [bubbleKind, setBubbleKind] = useState<"none" | "link">("none");
  const [editorContext, setEditorContext] = useState<EditorContext>("none");
  const [toolbarTab, setToolbarTab] = useState<ToolbarTab>("format");
  const editorContextRef = useRef<EditorContext>("none");
  const toolbarTabRef = useRef<ToolbarTab>("format");
  editorContextRef.current = editorContext;
  toolbarTabRef.current = toolbarTab;
  const [linkHover, setLinkHover] = useState<{
    href: string;
    top: number;
    left: number;
    from: number;
    to: number;
  } | null>(null);

  useEffect(() => {
    if (!editor) return;
    const syncChrome = () => {
      const { selection } = editor.state;
      const isImage =
        selection instanceof NodeSelection &&
        selection.node?.type?.name === "image";
      const context = detectEditorContext({
        isImage,
        isTable: editor.isActive("table"),
      });
      const nextTab = resolveToolbarTab({
        context,
        previousContext: editorContextRef.current,
        tab: toolbarTabRef.current,
      });
      editorContextRef.current = context;
      setEditorContext(context);
      if (nextTab !== toolbarTabRef.current) {
        toolbarTabRef.current = nextTab;
        setToolbarTab(nextTab);
      }

      if (isImage) {
        setBubbleKind("none");
      } else if (editor.isActive("link")) {
        setBubbleKind("link");
        setLinkHover(null);
      } else {
        setBubbleKind("none");
      }
    };
    syncChrome();
    editor.on("selectionUpdate", syncChrome);
    editor.on("transaction", syncChrome);
    return () => {
      editor.off("selectionUpdate", syncChrome);
      editor.off("transaction", syncChrome);
    };
  }, [editor]);

  // 링크 호버 시 URL 프리뷰 (선택 전이어도 표시)
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const clearHide = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!editor.isEditable) return;
      if (editor.isActive("link")) {
        setLinkHover(null);
        return;
      }
      const coords = editor.view.posAtCoords({
        left: e.clientX,
        top: e.clientY,
      });
      if (!coords) {
        clearHide();
        hideTimer = setTimeout(() => setLinkHover(null), 200);
        return;
      }
      const linkType = editor.state.schema.marks.link;
      if (!linkType) return;
      const $pos = editor.state.doc.resolve(coords.pos);
      const range = getMarkRange($pos, linkType);
      if (!range) {
        clearHide();
        hideTimer = setTimeout(() => setLinkHover(null), 200);
        return;
      }
      clearHide();
      let linkHref = "";
      editor.state.doc.nodesBetween(range.from, range.to, (node) => {
        const mark = node.marks.find((m) => m.type === linkType);
        if (mark) {
          linkHref = mark.attrs.href || "";
          return false;
        }
      });
      const startCoords = editor.view.coordsAtPos(range.from);
      const endCoords = editor.view.coordsAtPos(range.to);
      setLinkHover({
        href: linkHref,
        top: startCoords.top,
        left: (startCoords.left + endCoords.right) / 2,
        from: range.from,
        to: range.to,
      });
    };

    const onLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest?.("[data-link-hover-preview]")) return;
      clearHide();
      hideTimer = setTimeout(() => setLinkHover(null), 250);
    };

    dom.addEventListener("mousemove", onMove);
    dom.addEventListener("mouseleave", onLeave);
    return () => {
      clearHide();
      dom.removeEventListener("mousemove", onMove);
      dom.removeEventListener("mouseleave", onLeave);
    };
  }, [editor]);

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

  const scheduleTransformSpecialNodes = useCallback(
    (expectedVersion?: number) => {
      if (transformTimeoutRef.current) {
        clearTimeout(transformTimeoutRef.current);
        transformTimeoutRef.current = null;
      }
      // setContent 직후 DOM/파서 반영을 기다린 뒤 한 번만 실행
      transformTimeoutRef.current = setTimeout(() => {
        transformTimeoutRef.current = null;
        if (
          expectedVersion !== undefined &&
          expectedVersion !== contentVersionRef.current
        ) {
          return;
        }
        if (!editor || editor.isDestroyed || viewModeRef.current !== "wysiwyg") {
          return;
        }
        transformSpecialNodes(editor);
      }, 0);
    },
    [editor]
  );

  useEffect(() => {
    return () => {
      if (transformTimeoutRef.current) {
        clearTimeout(transformTimeoutRef.current);
        transformTimeoutRef.current = null;
      }
    };
  }, []);

  // 에디터 초기화 후 및 WYSIWYG 전환 시 특수 노드 변환
  // ![youtube](URL) → YouTube 노드, ![embed](URL) → HtmlEmbed 노드,
  // ```html-app / ```canvas → HtmlEmbed 노드
  // useEffect를 사용하여 EditorContent가 DOM에 마운트된 후 실행되도록 보장
  useEffect(() => {
    if (!editor || viewMode !== "wysiwyg") return;
    scheduleTransformSpecialNodes();
  }, [editor, viewMode, scheduleTransformSpecialNodes]);

  // 외부 value 변경 시 에디터 동기화 (소스 모드에서 편집 후 전환 등)
  useEffect(() => {
    if (!editor) return;
    // 분할 모드에서는 textarea가 직접 value를 편집하므로
    // TipTap 동기화를 건너뛴다 (피드백 루프 방지)
    if (viewModeRef.current !== "wysiwyg") return;
    // 에디터→부모로 올라온 값이면 재주입하지 않음 (커서 점프/루프 방지)
    if (value === lastEmittedRef.current) return;
    const currentMd = postprocessMarkdown(getMarkdownFromEditor(editor));
    if (value === currentMd) {
      lastEmittedRef.current = value;
      return;
    }
    const version = ++contentVersionRef.current;
    // addToHistory: false로 설정하여 Ctrl+Z 시 이전 상태로 되돌리지 않음
    editor
      .chain()
      .command(({ tr }) => {
        tr.setMeta("addToHistory", false);
        return true;
      })
      .setContent(value)
      .run();
    // setContent → onUpdate가 lastEmitted를 직렬화 결과로 갱신함
    // 직렬화가 value와 달라도 루프를 막기 위해 외부 주입값을 기준으로 맞춤
    lastEmittedRef.current = value;
    // 다시 특수 노드 변환 (스케줄 중복·stale 실행 방지)
    scheduleTransformSpecialNodes(version);
  }, [value, editor, scheduleTransformSpecialNodes]);

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

  const insertCanvas = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setHtmlEmbed({
        embedType: "code",
        html: "",
        css: "",
        javascript: "",
        height: DEFAULT_CANVAS_HEIGHT,
        editing: true,
      })
      .run();
  };
  insertCanvasRef.current = insertCanvas;

  const toolbarPanel = activeToolbarPanel({
    viewMode,
    context: editorContext,
    tab: toolbarTab,
  });

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
        <div className={style.toolbarLeading}>
          <div className={style.tabs}>
            <button
              type="button"
              title="일반 에디터"
              aria-label="일반 에디터"
              className={viewMode === "wysiwyg" ? style.active : ""}
              onClick={() => switchMode("wysiwyg")}
            >
              <Svg type="formatText" width="18px" height="18px" />
            </button>
            <button
              type="button"
              title="마크다운 편집"
              aria-label="마크다운 편집"
              className={viewMode === "split" ? style.active : ""}
              onClick={() => switchMode("split")}
            >
              <Svg type="markdown" width="18px" height="18px" />
            </button>
          </div>
          {viewMode === "wysiwyg" && (
            <ToolbarContextTabs
              context={editorContext}
              tab={toolbarTab}
              onChange={(next) => {
                toolbarTabRef.current = next;
                setToolbarTab(next);
              }}
            />
          )}
        </div>
        <div className={style.toolbarRight}>
          {toolbarPanel === "table" && editor ? (
            <TableToolbar editor={editor} />
          ) : toolbarPanel === "image" && editor ? (
            <ImageToolbar editor={editor} />
          ) : (
            <TipTapToolbar
              editor={editor}
              onEmbedClick={insertCanvas}
              onImageClick={() => setShowImageDialog(true)}
              onYouTubeClick={() => setShowYouTubeDialog(true)}
              onLinkClick={() => setShowLinkDialog(true)}
              onMathClick={() => setMathDialog({ kind: "insert" })}
              enableMention={!!searchMentionUsers}
              moreExtraItems={toolbarMoreItems}
            />
          )}
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
          {editor && bubbleKind === "link" && (
            <LinkBubbleMenu
              editor={editor}
              onEdit={() => setShowLinkDialog(true)}
            />
          )}
          {linkHover && bubbleKind !== "link" && (
            <div
              className={style.linkHoverPreview}
              data-link-hover-preview
              style={{
                top: Math.max(8, linkHover.top - 44),
                left: linkHover.left,
              }}
              onMouseLeave={() => setLinkHover(null)}
            >
              <span className={style.linkBubbleUrl} title={linkHover.href}>
                {linkHover.href || "(URL 없음)"}
              </span>
              <button
                type="button"
                className={style.linkBubbleBtn}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .setTextSelection({
                      from: linkHover.from,
                      to: linkHover.to,
                    })
                    .run();
                  setLinkHover(null);
                  setShowLinkDialog(true);
                }}
              >
                편집
              </button>
              <button
                type="button"
                className={style.linkBubbleBtn}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (linkHover.href) {
                    window.open(
                      linkHover.href,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }
                }}
                disabled={!linkHover.href}
              >
                열기
              </button>
            </div>
          )}
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
            <MarkdownViewer content={value} allowHtmlApp />
          </div>
        </div>
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
      {showLinkDialog && (
        <LinkInsertDialog
          initialUrl={editor?.getAttributes("link").href || ""}
          hasExistingLink={!!editor?.isActive("link")}
          onSubmit={(url) => {
            if (editor) {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
            }
          }}
          onRemove={() => {
            if (editor) {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .unsetLink()
                .run();
            }
          }}
          onClose={() => setShowLinkDialog(false)}
        />
      )}
      {mathDialog && (
        <MathInsertDialog
          title={mathDialog.kind === "edit" ? "수식 편집" : "수식 삽입"}
          submitLabel={mathDialog.kind === "edit" ? "적용" : "삽입"}
          initialLatex={
            mathDialog.kind === "edit" ? mathDialog.latex : "E = mc^2"
          }
          initialMode={
            mathDialog.kind === "edit" ? mathDialog.mathMode : "inline"
          }
          lockMode={mathDialog.kind === "edit"}
          onSubmit={(latex, mode) => {
            if (!editor) return;
            if (mathDialog.kind === "edit") {
              const { pos } = mathDialog;
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, { latex })
              );
              editor.commands.focus();
              return;
            }
            if (mode === "block") {
              editor
                .chain()
                .focus()
                .insertContent({ type: "mathBlock", attrs: { latex } })
                .run();
            } else {
              editor
                .chain()
                .focus()
                .insertContent({ type: "mathInline", attrs: { latex } })
                .run();
            }
          }}
          onClose={() => setMathDialog(null)}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
