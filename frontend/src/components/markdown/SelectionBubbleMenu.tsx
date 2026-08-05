import { Editor } from "@tiptap/react";
import { EditorState, NodeSelection, PluginKey } from "@tiptap/pm/state";
// @ts-expect-error moduleResolution:node doesn't resolve package.json exports
import { BubbleMenu } from "@tiptap/react/menus";
import Svg from "assets/svg/Svg";
import style from "./markdown.module.scss";

const SELECTION_BUBBLE_KEY = new PluginKey("selectionBubbleMenu");

type Props = {
  editor: Editor;
  onLinkClick: () => void;
};

const SelectionBubbleMenu = ({ editor, onLinkClick }: Props) => {
  const buttons: Array<{
    icon: string;
    title: string;
    action: () => void;
    isActive?: () => boolean;
  }> = [
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
      title: "인라인 코드",
      action: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive("code"),
    },
    {
      icon: "link",
      title: "링크",
      action: onLinkClick,
      isActive: () => editor.isActive("link"),
    },
  ];

  // 마운트는 MarkdownEditor bubbleKind로 제어. 여기선 안전망만 둔다.
  const shouldShow = (props: { editor: Editor; state: EditorState }) => {
    const { editor: ed, state } = props;
    if (!ed.isEditable) return false;
    const { selection } = state;
    if (selection.empty || selection instanceof NodeSelection) return false;
    return true;
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={SELECTION_BUBBLE_KEY}
      updateDelay={80}
      options={{ placement: "top", offset: 8 }}
      shouldShow={shouldShow}
    >
      <div
        className={style.selectionBubbleMenu}
        data-editor-popup
        onMouseDown={(e) => e.preventDefault()}
      >
        {buttons.map((btn) => (
          <button
            key={btn.icon}
            type="button"
            title={btn.title}
            onClick={btn.action}
            className={`${style.selectionBubbleBtn} ${
              btn.isActive?.() ? style.selectionBubbleBtnActive : ""
            }`}
          >
            <Svg type={btn.icon} width="16px" height="16px" />
          </button>
        ))}
      </div>
    </BubbleMenu>
  );
};

export default SelectionBubbleMenu;
