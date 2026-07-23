import { useState } from "react";
import { Editor } from "@tiptap/react";
import { EditorState, PluginKey } from "@tiptap/pm/state";
// @ts-expect-error moduleResolution:node doesn't resolve package.json exports
import { BubbleMenu } from "@tiptap/react/menus";
import Svg from "assets/svg/Svg";
import ColorDropdown from "./ColorDropdown";
import style from "./markdown.module.scss";

const TABLE_BUBBLE_KEY = new PluginKey("tableBubbleMenu");

type Props = {
  editor: Editor;
};

const getCellAttrs = (editor: Editor) => {
  if (editor.isActive("tableHeader")) {
    return editor.getAttributes("tableHeader");
  }
  return editor.getAttributes("tableCell");
};

const TableBubbleMenu = ({ editor }: Props) => {
  const [showCellColor, setShowCellColor] = useState(false);
  const cellAttrs = getCellAttrs(editor);
  const vAlign = cellAttrs.verticalAlign || null;

  const buttons: Array<
    | { divider: true }
    | {
        icon: string;
        title: string;
        action: () => void;
        disabled?: () => boolean;
        isActive?: () => boolean;
      }
  > = [
    {
      icon: "tableInsertUp",
      title: "위에 행 추가",
      action: () => editor.chain().focus().addRowBefore().run(),
      disabled: () => !editor.can().addRowBefore(),
    },
    {
      icon: "tableInsertDown",
      title: "아래에 행 추가",
      action: () => editor.chain().focus().addRowAfter().run(),
      disabled: () => !editor.can().addRowAfter(),
    },
    {
      icon: "tableInsertLeft",
      title: "왼쪽에 열 추가",
      action: () => editor.chain().focus().addColumnBefore().run(),
      disabled: () => !editor.can().addColumnBefore(),
    },
    {
      icon: "tableInsertRight",
      title: "오른쪽에 열 추가",
      action: () => editor.chain().focus().addColumnAfter().run(),
      disabled: () => !editor.can().addColumnAfter(),
    },
    { divider: true },
    {
      icon: "tableHeaderRow",
      title: "헤더 행 토글",
      action: () => editor.chain().focus().toggleHeaderRow().run(),
      disabled: () => !editor.can().toggleHeaderRow(),
      isActive: () => {
        const { $from } = editor.state.selection;
        for (let d = $from.depth; d > 0; d -= 1) {
          const node = $from.node(d);
          if (node.type.name === "tableRow") {
            let hasHeader = false;
            node.forEach((cell) => {
              if (cell.type.name === "tableHeader") hasHeader = true;
            });
            return hasHeader;
          }
        }
        return false;
      },
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
      icon: "alignTop",
      title: "위쪽 정렬",
      action: () =>
        editor
          .chain()
          .focus()
          .setCellAttribute("verticalAlign", "top")
          .run(),
      isActive: () => vAlign === "top",
    },
    {
      icon: "alignMiddle",
      title: "세로 가운데",
      action: () =>
        editor
          .chain()
          .focus()
          .setCellAttribute("verticalAlign", "middle")
          .run(),
      isActive: () => vAlign === "middle",
    },
    {
      icon: "alignBottom",
      title: "아래쪽 정렬",
      action: () =>
        editor
          .chain()
          .focus()
          .setCellAttribute("verticalAlign", "bottom")
          .run(),
      isActive: () => vAlign === "bottom",
    },
    { divider: true },
    {
      icon: "tableDeleteRow",
      title: "행 삭제",
      action: () => editor.chain().focus().deleteRow().run(),
      disabled: () => !editor.can().deleteRow(),
    },
    {
      icon: "tableDeleteColumn",
      title: "열 삭제",
      action: () => editor.chain().focus().deleteColumn().run(),
      disabled: () => !editor.can().deleteColumn(),
    },
    {
      icon: "delete",
      title: "표 삭제",
      action: () => editor.chain().focus().deleteTable().run(),
      disabled: () => !editor.can().deleteTable(),
    },
  ];

  const shouldShowTableMenu = (props: {
    editor: Editor;
    state: EditorState;
  }) => {
    const { editor: ed, state } = props;
    if (!ed.isEditable || ed.isActive("link")) return false;
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d -= 1) {
      if ($from.node(d).type.name === "table") return true;
    }
    return false;
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={TABLE_BUBBLE_KEY}
      updateDelay={0}
      options={{ placement: "top", offset: 8 }}
      shouldShow={shouldShowTableMenu}
    >
      <div
        className={style.tableBubbleMenu}
        onMouseDown={(e) => e.preventDefault()}
      >
        {buttons.map((btn: any, idx: number) =>
          btn.divider ? (
            <span key={idx} className={style.tableBubbleDivider} />
          ) : (
            <button
              key={idx}
              type="button"
              title={btn.title}
              onClick={btn.action}
              disabled={btn.disabled?.()}
              className={`${style.tableBubbleBtn} ${
                btn.isActive?.() ? style.tableBubbleBtnActive : ""
              }`}
            >
              <Svg type={btn.icon} width="16px" height="16px" />
            </button>
          )
        )}
        <div className={style.colorBtnWrapper}>
          <button
            type="button"
            title="셀 배경색"
            onClick={() => setShowCellColor(!showCellColor)}
            className={style.tableBubbleBtn}
          >
            <Svg type="highlightColor" width="16px" height="16px" />
          </button>
          {showCellColor && (
            <ColorDropdown
              currentColor={cellAttrs.backgroundColor}
              onSelect={(color) => {
                if (color) {
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute("backgroundColor", color)
                    .run();
                } else {
                  editor
                    .chain()
                    .focus()
                    .setCellAttribute("backgroundColor", null)
                    .run();
                }
              }}
              onClose={() => setShowCellColor(false)}
            />
          )}
        </div>
      </div>
    </BubbleMenu>
  );
};

export default TableBubbleMenu;
