import { useState } from "react";
import { Editor } from "@tiptap/react";
import Svg from "assets/svg/Svg";
import { extractYouTubeId } from "./extensions/youtube";
import ColorDropdown from "./ColorDropdown";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor | null;
  onEmbedClick: () => void;
  onImageClick: () => void;
};

const TipTapToolbar = ({ editor, onEmbedClick, onImageClick }: Props) => {
  const [activeDropdown, setActiveDropdown] = useState<"textColor" | "highlight" | null>(null);

  if (!editor) return null;

  const handleLinkInsert = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = prompt("링크 URL을 입력하세요:", previousUrl || "https://");
    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleYouTubeInsert = () => {
    const url = prompt(
      "YouTube URL을 입력하세요:\n(예: https://www.youtube.com/watch?v=VIDEO_ID)"
    );
    if (!url) return;

    const videoId = extractYouTubeId(url);
    if (videoId) {
      editor
        .chain()
        .focus()
        .setYoutubeVideo({
          src: `https://www.youtube.com/watch?v=${videoId}`,
        })
        .run();
    } else {
      alert("유효한 YouTube URL이 아닙니다.");
    }
  };

  const handleTableInsert = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const toolbarButtons = [
    {
      icon: "undo",
      title: "실행 취소",
      action: () => editor.chain().focus().undo().run(),
      isDisabled: () => !editor.can().undo(),
    },
    {
      icon: "redo",
      title: "다시 실행",
      action: () => editor.chain().focus().redo().run(),
      isDisabled: () => !editor.can().redo(),
    },
    { divider: true },
    {
      icon: "heading",
      title: "제목",
      action: () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive("heading", { level: 3 }),
    },
    {
      icon: "bold",
      title: "굵게",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
    },
    {
      icon: "italic",
      title: "기울임",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
    },
    {
      icon: "strikethrough",
      title: "취소선",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive("strike"),
    },
    {
      icon: "code",
      title: "코드",
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive("code"),
    },
    { divider: true },
    {
      icon: "alignLeft",
      title: "왼쪽 정렬",
      action: () => editor.chain().focus().setTextAlign("left").run(),
      isActive: () => editor.isActive({ textAlign: "left" }),
    },
    {
      icon: "alignCenter",
      title: "가운데 정렬",
      action: () => editor.chain().focus().setTextAlign("center").run(),
      isActive: () => editor.isActive({ textAlign: "center" }),
    },
    {
      icon: "alignRight",
      title: "오른쪽 정렬",
      action: () => editor.chain().focus().setTextAlign("right").run(),
      isActive: () => editor.isActive({ textAlign: "right" }),
    },
    { divider: true },
    {
      icon: "link",
      title: "링크",
      action: handleLinkInsert,
      isActive: () => editor.isActive("link"),
    },
    { divider: true },
    {
      icon: "image",
      title: "이미지",
      action: onImageClick,
    },
    {
      icon: "listBullet",
      title: "목록",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
    },
    {
      icon: "listNumber",
      title: "번호 목록",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive("orderedList"),
    },
    {
      icon: "checkbox",
      title: "체크박스",
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive("taskList"),
    },
    {
      icon: "quote",
      title: "인용",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
    },
    {
      icon: "horizontalRule",
      title: "가로줄",
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: "table",
      title: "표 (3x3)",
      action: handleTableInsert,
      isActive: () => editor.isActive("table"),
    },
    {
      icon: "youtube",
      title: "YouTube",
      action: handleYouTubeInsert,
    },
    {
      icon: "app",
      title: "앱 임베드",
      action: onEmbedClick,
    },
    {
      icon: "math",
      title: "수식 삽입",
      action: () => {
        const latex = prompt(
          "LaTeX 수식을 입력하세요:\n(인라인: 텍스트 안에 삽입, 블록: 별도 줄에 표시)",
          "E = mc^2"
        );
        if (latex) {
          editor
            .chain()
            .focus()
            .insertContent({ type: "mathInline", attrs: { latex } })
            .run();
        }
      },
    },
    {
      icon: "mention",
      title: "멘션 (@)",
      action: () => editor.chain().focus().insertContent("@").run(),
    },
  ];

  return (
    <div className={style.toolbarButtons}>
      {toolbarButtons.map((btn: any, idx: number) =>
        btn.divider ? (
          <span key={idx} className={style.divider} />
        ) : (
          <button
            key={idx}
            type="button"
            title={btn.title}
            onClick={btn.action}
            className={`${style.toolbarBtn} ${
              btn.isActive?.() ? style.toolbarBtnActive : ""
            } ${btn.isDisabled?.() ? style.toolbarBtnDisabled : ""}`}
          >
            <Svg type={btn.icon} width="18px" height="18px" />
          </button>
        )
      )}
      {/* 텍스트 색상 */}
      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="텍스트 색상"
          onClick={() =>
            setActiveDropdown(activeDropdown === "textColor" ? null : "textColor")
          }
          className={style.toolbarBtn}
        >
          <Svg type="textColor" width="18px" height="18px" />
          <span
            className={style.colorIndicator}
            style={{
              backgroundColor:
                editor.getAttributes("textStyle").color || "var(--accent-1)",
            }}
          />
        </button>
        {activeDropdown === "textColor" && (
          <ColorDropdown
            currentColor={editor.getAttributes("textStyle").color}
            onSelect={(color) => {
              if (color) {
                editor.chain().focus().setColor(color).run();
              } else {
                editor.chain().focus().unsetColor().run();
              }
              setActiveDropdown(null);
            }}
            onClose={() => setActiveDropdown(null)}
          />
        )}
      </div>
      {/* 하이라이트 색상 */}
      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="하이라이트"
          onClick={() =>
            setActiveDropdown(
              activeDropdown === "highlight" ? null : "highlight"
            )
          }
          className={`${style.toolbarBtn} ${
            editor.isActive("highlight") ? style.toolbarBtnActive : ""
          }`}
        >
          <Svg type="highlightColor" width="18px" height="18px" />
          <span
            className={style.colorIndicator}
            style={{
              backgroundColor:
                editor.getAttributes("highlight").color || "#EAB308",
            }}
          />
        </button>
        {activeDropdown === "highlight" && (
          <ColorDropdown
            currentColor={editor.getAttributes("highlight").color}
            onSelect={(color) => {
              if (color) {
                editor.chain().focus().toggleHighlight({ color }).run();
              } else {
                editor.chain().focus().unsetHighlight().run();
              }
              setActiveDropdown(null);
            }}
            onClose={() => setActiveDropdown(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TipTapToolbar;
