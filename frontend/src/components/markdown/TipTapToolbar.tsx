import { Editor } from "@tiptap/react";
import Svg from "assets/svg/Svg";
import { extractYouTubeId } from "./extensions/youtube";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor | null;
  isSourceMode: boolean;
  onSourceToggle: () => void;
  onEmbedClick: () => void;
  onImageClick: () => void;
};

const TipTapToolbar = ({ editor, isSourceMode, onSourceToggle, onEmbedClick, onImageClick }: Props) => {
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
    {
      icon: "link",
      title: "링크",
      action: handleLinkInsert,
      isActive: () => editor.isActive("link"),
    },
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
  ];

  return (
    <div className={style.toolbarButtons}>
      {toolbarButtons.map((btn, idx) => (
        <button
          key={idx}
          type="button"
          title={btn.title}
          onClick={btn.action}
          className={`${style.toolbarBtn} ${
            btn.isActive?.() ? style.toolbarBtnActive : ""
          }`}
        >
          <Svg type={btn.icon} width="18px" height="18px" />
        </button>
      ))}
      <span className={style.divider} />
      <button
        type="button"
        title={isSourceMode ? "편집 모드" : "소스 모드"}
        onClick={onSourceToggle}
        className={`${style.toolbarBtn} ${
          isSourceMode ? style.toolbarBtnActive : ""
        }`}
      >
        <Svg type="editNote" width="18px" height="18px" />
      </button>
    </div>
  );
};

export default TipTapToolbar;
