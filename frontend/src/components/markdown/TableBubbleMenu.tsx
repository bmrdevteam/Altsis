import { useState } from "react";
import { Editor } from "@tiptap/react";
// @ts-expect-error moduleResolution:node doesn't resolve package.json exports
import { BubbleMenu } from "@tiptap/react/menus";
import Svg from "assets/svg/Svg";
import ColorDropdown from "./ColorDropdown";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor;
};

const TableBubbleMenu = ({ editor }: Props) => {
  const [showCellColor, setShowCellColor] = useState(false);

  const buttons = [
    {
      icon: "tableInsertUp",
      title: "위에 행 추가",
      action: () => editor.chain().focus().addRowBefore().run(),
    },
    {
      icon: "tableInsertDown",
      title: "아래에 행 추가",
      action: () => editor.chain().focus().addRowAfter().run(),
    },
    {
      icon: "tableInsertLeft",
      title: "왼쪽에 열 추가",
      action: () => editor.chain().focus().addColumnBefore().run(),
    },
    {
      icon: "tableInsertRight",
      title: "오른쪽에 열 추가",
      action: () => editor.chain().focus().addColumnAfter().run(),
    },
    { divider: true },
    {
      icon: "tableMergeVertical",
      title: "셀 병합",
      action: () => editor.chain().focus().mergeCells().run(),
    },
    {
      icon: "tableMergeHorizontal",
      title: "셀 분할",
      action: () => editor.chain().focus().splitCell().run(),
    },
    { divider: true },
    {
      icon: "tableDeleteRow",
      title: "행 삭제",
      action: () => editor.chain().focus().deleteRow().run(),
    },
    {
      icon: "tableDeleteColumn",
      title: "열 삭제",
      action: () => editor.chain().focus().deleteColumn().run(),
    },
    {
      icon: "delete",
      title: "표 삭제",
      action: () => editor.chain().focus().deleteTable().run(),
    },
  ];

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ placement: "top", maxWidth: "none" }}
      shouldShow={({ editor }: { editor: Editor }) => editor.isActive("table")}
    >
      <div className={style.tableBubbleMenu}>
        {buttons.map((btn: any, idx: number) =>
          btn.divider ? (
            <span key={idx} className={style.tableBubbleDivider} />
          ) : (
            <button
              key={idx}
              type="button"
              title={btn.title}
              onClick={btn.action}
              className={style.tableBubbleBtn}
            >
              <Svg type={btn.icon} width="16px" height="16px" />
            </button>
          )
        )}
        {/* 셀 배경색 */}
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
              currentColor={
                editor.getAttributes("tableCell").backgroundColor
              }
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
                setShowCellColor(false);
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
