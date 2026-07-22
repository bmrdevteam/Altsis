import { Editor } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
// @ts-expect-error moduleResolution:node doesn't resolve package.json exports
import { BubbleMenu } from "@tiptap/react/menus";
import style from "./markdown.module.scss";

const LINK_BUBBLE_KEY = new PluginKey("linkBubbleMenu");

type Props = {
  editor: Editor;
  onEdit: () => void;
};

const LinkBubbleMenu = ({ editor, onEdit }: Props) => {
  const href = editor.getAttributes("link").href || "";
  const shouldShowLinkMenu = (props: { editor: Editor }) =>
    props.editor.isEditable && props.editor.isActive("link");

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={LINK_BUBBLE_KEY}
      updateDelay={0}
      options={{ placement: "top", offset: 8 }}
      shouldShow={shouldShowLinkMenu}
    >
      <div
        className={style.linkBubbleMenu}
        data-editor-popup
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className={style.linkBubbleUrl} title={href}>
          {href || "(URL 없음)"}
        </span>
        <button
          type="button"
          className={style.linkBubbleBtn}
          onClick={onEdit}
        >
          편집
        </button>
        <button
          type="button"
          className={style.linkBubbleBtn}
          onClick={() => {
            if (href) window.open(href, "_blank", "noopener,noreferrer");
          }}
          disabled={!href}
        >
          열기
        </button>
        <button
          type="button"
          className={style.linkBubbleBtn}
          onClick={() =>
            editor.chain().focus().extendMarkRange("link").unsetLink().run()
          }
        >
          제거
        </button>
      </div>
    </BubbleMenu>
  );
};

export default LinkBubbleMenu;
