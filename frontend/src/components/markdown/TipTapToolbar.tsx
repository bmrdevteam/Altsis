import { useState } from "react";
import { Editor } from "@tiptap/react";
import Svg from "assets/svg/Svg";
import ColorDropdown from "./ColorDropdown";
import HeadingDropdown, { getHeadingBadge } from "./HeadingDropdown";
import FontSizeDropdown from "./FontSizeDropdown";
import FontFamilyDropdown from "./FontFamilyDropdown";
import CodeDropdown from "./CodeDropdown";
import CheckDropdown from "./CheckDropdown";
import ToolbarMoreMenu, { type MoreMenuItem } from "./ToolbarMoreMenu";
import MarkdownShortcutsHelp from "./MarkdownShortcutsHelp";
import UndoRedoButtons from "./UndoRedoButtons";
import {
  FONT_OPTIONS,
  canonicalFontFamily,
  parseFontSizePx,
} from "./editorFonts";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor | null;
  onEmbedClick: () => void;
  onImageClick: () => void;
  onYouTubeClick: () => void;
  onLinkClick: () => void;
  onMathClick: () => void;
  enableMention?: boolean;
  moreExtraItems?: MoreMenuItem[];
};

const TipTapToolbar = ({
  editor,
  onEmbedClick,
  onImageClick,
  onYouTubeClick,
  onLinkClick,
  onMathClick,
  enableMention = false,
  moreExtraItems,
}: Props) => {
  const [activeDropdown, setActiveDropdown] = useState<
    | "textColor"
    | "highlight"
    | "heading"
    | "fontSize"
    | "fontFamily"
    | "code"
    | "check"
    | "more"
    | "shortcuts"
    | null
  >(null);

  if (!editor) return null;

  const handleTableInsert = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const headingBadge = getHeadingBadge(editor);
  const textStyle = editor.getAttributes("textStyle") as {
    fontSize?: string | null;
    fontFamily?: string | null;
  };
  const currentFontPx = parseFontSizePx(textStyle.fontSize);
  const currentFontFamily = canonicalFontFamily(textStyle.fontFamily);
  const fontLabel =
    FONT_OPTIONS.find((opt) =>
      opt.family == null ? !currentFontFamily : opt.family === currentFontFamily
    )?.label ?? "기본";

  const close = () => setActiveDropdown(null);

  const moreItems = [
    {
      icon: "quote",
      label: "인용",
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
    {
      icon: "horizontalRule",
      label: "가로줄",
      onClick: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      icon: "table",
      label: "표 (3x3)",
      onClick: handleTableInsert,
      active: editor.isActive("table"),
    },
    {
      icon: "youtube",
      label: "YouTube",
      onClick: onYouTubeClick,
    },
    {
      icon: "htmlEmbed",
      label: "캔버스",
      onClick: onEmbedClick,
    },
    {
      icon: "math",
      label: "수식",
      onClick: onMathClick,
    },
    {
      icon: "keyboard",
      label: "마크다운 단축 문법",
      onClick: () => setActiveDropdown("shortcuts"),
      skipClose: true,
    },
    ...(enableMention
      ? [
          {
            icon: "mention",
            label: "멘션 (@)",
            onClick: () => editor.chain().focus().insertContent("@").run(),
          },
        ]
      : []),
    ...(moreExtraItems ?? []),
  ];

  const renderBtn = (btn: {
    icon: string;
    title: string;
    action: () => void;
    isActive?: () => boolean;
    isDisabled?: () => boolean;
  }) => (
    <button
      type="button"
      title={btn.title}
      onClick={btn.action}
      className={`${style.toolbarBtn} ${
        btn.isActive?.() ? style.toolbarBtnActive : ""
      } ${btn.isDisabled?.() ? style.toolbarBtnDisabled : ""}`}
    >
      <Svg type={btn.icon} width="18px" height="18px" />
    </button>
  );

  return (
    <div className={style.toolbarButtons}>
      <UndoRedoButtons editor={editor} />
      <span className={style.divider} />

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="제목"
          onClick={() =>
            setActiveDropdown(activeDropdown === "heading" ? null : "heading")
          }
          className={`${style.toolbarBtn} ${
            editor.isActive("heading") ? style.toolbarBtnActive : ""
          }`}
        >
          <Svg type="heading" width="18px" height="18px" />
          {headingBadge && (
            <span className={style.headingBadge}>{headingBadge}</span>
          )}
        </button>
        {activeDropdown === "heading" && (
          <HeadingDropdown editor={editor} onClose={close} />
        )}
      </div>

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="글자 크기"
          aria-label="글자 크기"
          onClick={() =>
            setActiveDropdown(
              activeDropdown === "fontSize" ? null : "fontSize"
            )
          }
          className={`${style.toolbarBtn} ${style.toolbarLabelBtn} ${
            currentFontPx != null ? style.toolbarBtnActive : ""
          }`}
        >
          {currentFontPx ?? 14}
        </button>
        {activeDropdown === "fontSize" && (
          <FontSizeDropdown
            currentPx={currentFontPx}
            onSelect={(size) => {
              if (size) editor.chain().focus().setFontSize(size).run();
              else editor.chain().focus().unsetFontSize().run();
            }}
            onClose={close}
          />
        )}
      </div>

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="글꼴"
          aria-label="글꼴"
          onClick={() =>
            setActiveDropdown(
              activeDropdown === "fontFamily" ? null : "fontFamily"
            )
          }
          className={`${style.toolbarBtn} ${style.toolbarLabelBtn} ${
            currentFontFamily ? style.toolbarBtnActive : ""
          }`}
          style={
            currentFontFamily ? { fontFamily: currentFontFamily } : undefined
          }
        >
          {fontLabel}
        </button>
        {activeDropdown === "fontFamily" && (
          <FontFamilyDropdown
            currentFamily={currentFontFamily}
            onSelect={(family) => {
              if (family) editor.chain().focus().setFontFamily(family).run();
              else editor.chain().focus().unsetFontFamily().run();
            }}
            onClose={close}
          />
        )}
      </div>

      {renderBtn({
        icon: "bold",
        title: "굵게",
        action: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive("bold"),
      })}
      {renderBtn({
        icon: "italic",
        title: "기울임",
        action: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive("italic"),
      })}
      {renderBtn({
        icon: "strikethrough",
        title: "취소선",
        action: () => editor.chain().focus().toggleStrike().run(),
        isActive: () => editor.isActive("strike"),
      })}

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="코드"
          onClick={() =>
            setActiveDropdown(activeDropdown === "code" ? null : "code")
          }
          className={`${style.toolbarBtn} ${
            editor.isActive("code") || editor.isActive("codeBlock")
              ? style.toolbarBtnActive
              : ""
          }`}
        >
          <Svg type="code" width="18px" height="18px" />
        </button>
        {activeDropdown === "code" && (
          <CodeDropdown editor={editor} onClose={close} />
        )}
      </div>

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="텍스트 색상"
          onClick={() =>
            setActiveDropdown(
              activeDropdown === "textColor" ? null : "textColor"
            )
          }
          className={`${style.toolbarBtn} ${
            activeDropdown === "textColor" ? style.toolbarBtnActive : ""
          }`}
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
              if (color) editor.chain().focus().setColor(color).run();
              else editor.chain().focus().unsetColor().run();
            }}
            onClose={close}
          />
        )}
      </div>

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
            editor.isActive("highlight") || activeDropdown === "highlight"
              ? style.toolbarBtnActive
              : ""
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
              if (color)
                editor.chain().focus().toggleHighlight({ color }).run();
              else editor.chain().focus().unsetHighlight().run();
            }}
            onClose={close}
          />
        )}
      </div>

      <span className={style.divider} />

      {renderBtn({
        icon: "alignLeft",
        title: "왼쪽 정렬",
        action: () => editor.chain().focus().setTextAlign("left").run(),
        isActive: () => editor.isActive({ textAlign: "left" }),
      })}
      {renderBtn({
        icon: "alignCenter",
        title: "가운데 정렬",
        action: () => editor.chain().focus().setTextAlign("center").run(),
        isActive: () => editor.isActive({ textAlign: "center" }),
      })}
      {renderBtn({
        icon: "alignRight",
        title: "오른쪽 정렬",
        action: () => editor.chain().focus().setTextAlign("right").run(),
        isActive: () => editor.isActive({ textAlign: "right" }),
      })}
      {renderBtn({
        icon: "alignJustify",
        title: "양쪽 정렬",
        action: () => editor.chain().focus().setTextAlign("justify").run(),
        isActive: () => editor.isActive({ textAlign: "justify" }),
      })}

      <span className={style.divider} />

      {renderBtn({
        icon: "link",
        title: "링크 (Ctrl/⌘+K)",
        action: onLinkClick,
        isActive: () => editor.isActive("link"),
      })}
      {renderBtn({
        icon: "image",
        title: "이미지",
        action: onImageClick,
      })}
      {renderBtn({
        icon: "listBullet",
        title: "목록",
        action: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive("bulletList"),
      })}
      {renderBtn({
        icon: "listNumber",
        title: "번호 목록",
        action: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive("orderedList"),
      })}

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="체크"
          onClick={() =>
            setActiveDropdown(activeDropdown === "check" ? null : "check")
          }
          className={`${style.toolbarBtn} ${
            editor.isActive("taskList") || editor.isActive("inlineCheckbox")
              ? style.toolbarBtnActive
              : ""
          }`}
        >
          <Svg type="checkbox" width="18px" height="18px" />
        </button>
        {activeDropdown === "check" && (
          <CheckDropdown editor={editor} onClose={close} />
        )}
      </div>

      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="더보기"
          onClick={() =>
            setActiveDropdown(
              activeDropdown === "more" || activeDropdown === "shortcuts"
                ? null
                : "more"
            )
          }
          className={`${style.toolbarBtn} ${
            activeDropdown === "more" || activeDropdown === "shortcuts"
              ? style.toolbarBtnActive
              : ""
          }`}
        >
          <Svg type="horizontalDots" width="18px" height="18px" />
        </button>
        {activeDropdown === "more" && (
          <ToolbarMoreMenu items={moreItems} onClose={close} />
        )}
        {activeDropdown === "shortcuts" && (
          <MarkdownShortcutsHelp onClose={close} />
        )}
      </div>
    </div>
  );
};

export default TipTapToolbar;
