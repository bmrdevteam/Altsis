import { useState } from "react";
import { Editor } from "@tiptap/react";
import { NodeSelection, PluginKey } from "@tiptap/pm/state";
// @ts-expect-error moduleResolution:node doesn't resolve package.json exports
import { BubbleMenu } from "@tiptap/react/menus";
import style from "./markdown.module.scss";

const IMAGE_BUBBLE_KEY = new PluginKey("imageBubbleMenu");

type Props = {
  editor: Editor;
};

const ImageBubbleMenu = ({ editor }: Props) => {
  const [editingField, setEditingField] = useState<"alt" | "caption" | null>(
    null
  );
  const [fieldDraft, setFieldDraft] = useState("");

  const shouldShowImageMenu = (props: { editor: Editor }) => {
    const { selection } = props.editor.state;
    return (
      props.editor.isEditable &&
      selection instanceof NodeSelection &&
      selection.node?.type?.name === "image"
    );
  };

  const updateAttrs = (attrs: Record<string, any>) => {
    editor.chain().focus().updateAttributes("image", attrs).run();
  };

  const attrs =
    editor.state.selection instanceof NodeSelection &&
    editor.state.selection.node?.type?.name === "image"
      ? editor.state.selection.node.attrs
      : {};

  const commitField = () => {
    if (editingField === "alt") updateAttrs({ alt: fieldDraft });
    if (editingField === "caption") updateAttrs({ caption: fieldDraft });
    setEditingField(null);
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={IMAGE_BUBBLE_KEY}
      updateDelay={0}
      options={{ placement: "top", offset: 8 }}
      shouldShow={shouldShowImageMenu}
    >
      <div
        className={style.imageBubbleMenu}
        data-editor-popup
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          type="button"
          className={`${style.linkBubbleBtn} ${
            (attrs.align || "left") === "left" ? style.linkBubbleBtnActive : ""
          }`}
          title="왼쪽"
          onClick={() => updateAttrs({ align: "left" })}
        >
          왼쪽
        </button>
        <button
          type="button"
          className={`${style.linkBubbleBtn} ${
            attrs.align === "center" ? style.linkBubbleBtnActive : ""
          }`}
          title="가운데"
          onClick={() => updateAttrs({ align: "center" })}
        >
          가운데
        </button>
        <button
          type="button"
          className={`${style.linkBubbleBtn} ${
            attrs.align === "right" ? style.linkBubbleBtnActive : ""
          }`}
          title="오른쪽"
          onClick={() => updateAttrs({ align: "right" })}
        >
          오른쪽
        </button>
        <span className={style.tableBubbleDivider} />
        {editingField ? (
          <input
            className={style.imageBubbleInput}
            value={fieldDraft}
            autoFocus
            placeholder={
              editingField === "alt" ? "대체 텍스트" : "캡션"
            }
            onChange={(e) => setFieldDraft(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={commitField}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitField();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditingField(null);
              }
            }}
          />
        ) : (
          <>
            <button
              type="button"
              className={style.linkBubbleBtn}
              onClick={() => {
                setFieldDraft(attrs.alt || "");
                setEditingField("alt");
              }}
            >
              Alt
            </button>
            <button
              type="button"
              className={style.linkBubbleBtn}
              onClick={() => {
                setFieldDraft(attrs.caption || "");
                setEditingField("caption");
              }}
            >
              캡션
            </button>
          </>
        )}
        <button
          type="button"
          className={style.linkBubbleBtn}
          onClick={() => {
            editor.chain().focus().deleteSelection().run();
          }}
        >
          삭제
        </button>
      </div>
    </BubbleMenu>
  );
};

export default ImageBubbleMenu;
