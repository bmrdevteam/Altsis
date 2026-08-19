import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import Svg from "assets/svg/Svg";
import ColorDropdown from "./ColorDropdown";
import TableBorderDropdown from "./TableBorderDropdown";
import {
  canMergeAdjacentCells,
  mergeAdjacentCells,
} from "./tableCellSelection";
import style from "./markdown.module.scss";

type Props = {
  editor: Editor;
};

const getCellAttrs = (editor: Editor) => {
  if (editor.isActive("tableHeader")) {
    return editor.getAttributes("tableHeader");
  }
  return editor.getAttributes("tableCell");
};

const TableToolbar = ({ editor }: Props) => {
  const [, setRev] = useState(0);
  const [showCellColor, setShowCellColor] = useState(false);
  const [showBorder, setShowBorder] = useState(false);

  useEffect(() => {
    const bump = () => setRev((n) => n + 1);
    editor.on("transaction", bump);
    editor.on("selectionUpdate", bump);
    return () => {
      editor.off("transaction", bump);
      editor.off("selectionUpdate", bump);
    };
  }, [editor]);
  const cellAttrs = getCellAttrs(editor);
  const vAlign = cellAttrs.verticalAlign || null;

  const setCellAttr = (name: string, value: string | null) => {
    editor.chain().focus().setCellAttribute(name, value).run();
  };

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
      icon: "tableMergeHorizontal",
      title: "오른쪽 셀과 병합",
      action: () => {
        if (editor.can().mergeCells()) {
          editor.chain().focus().mergeCells().run();
          return;
        }
        mergeAdjacentCells(editor, "right");
      },
      disabled: () =>
        !editor.can().mergeCells() && !canMergeAdjacentCells(editor, "right"),
    },
    {
      icon: "tableMergeVertical",
      title: "아래 셀과 병합",
      action: () => mergeAdjacentCells(editor, "down"),
      disabled: () => !canMergeAdjacentCells(editor, "down"),
    },
    {
      icon: "tableSplit",
      title: "셀 분할",
      action: () => editor.chain().focus().splitCell().run(),
      disabled: () => !editor.can().splitCell(),
    },
    { divider: true },
    {
      icon: "tableHeaderRow",
      title: "헤더 행 토글",
      action: () => editor.chain().focus().toggleHeaderRow().run(),
      disabled: () => !editor.can().toggleHeaderRow(),
    },
    { divider: true },
    {
      icon: "alignTop",
      title: "위쪽 정렬",
      action: () =>
        editor.chain().focus().setCellAttribute("verticalAlign", "top").run(),
      isActive: () => vAlign === "top",
    },
    {
      icon: "alignMiddle",
      title: "세로 가운데",
      action: () =>
        editor.chain().focus().setCellAttribute("verticalAlign", "middle").run(),
      isActive: () => vAlign === "middle",
    },
    {
      icon: "alignBottom",
      title: "아래쪽 정렬",
      action: () =>
        editor.chain().focus().setCellAttribute("verticalAlign", "bottom").run(),
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

  return (
    <div
      className={style.toolbarButtons}
      role="toolbar"
      aria-label="표 도구"
      onMouseDown={(e) => e.preventDefault()}
    >
      {buttons.map((btn, idx) =>
        "divider" in btn ? (
          <span key={idx} className={style.tableBubbleDivider} />
        ) : (
          <button
            key={idx}
            type="button"
            title={btn.title}
            onClick={btn.action}
            disabled={btn.disabled?.()}
            className={`${style.toolbarBtn} ${
              btn.isActive?.() ? style.toolbarBtnActive : ""
            }`}
          >
            <Svg type={btn.icon} width="18px" height="18px" />
          </button>
        )
      )}
      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="셀 테두리 (모양·두께·색상)"
          onClick={() => {
            setShowBorder(!showBorder);
            setShowCellColor(false);
          }}
          className={`${style.toolbarBtn} ${
            showBorder ||
            cellAttrs.borderColor ||
            cellAttrs.borderStyle ||
            cellAttrs.borderWidth
              ? style.toolbarBtnActive
              : ""
          }`}
        >
          <Svg type="border" width="18px" height="18px" />
          <span
            className={style.colorIndicator}
            style={{
              backgroundColor: cellAttrs.borderColor || "currentColor",
            }}
          />
        </button>
        {showBorder && (
          <TableBorderDropdown
            borderColor={cellAttrs.borderColor}
            borderStyle={cellAttrs.borderStyle}
            borderWidth={cellAttrs.borderWidth}
            onChangeColor={(color) => setCellAttr("borderColor", color)}
            onChangeStyle={(borderStyle) =>
              setCellAttr("borderStyle", borderStyle)
            }
            onChangeWidth={(borderWidth) =>
              setCellAttr("borderWidth", borderWidth)
            }
            onReset={() => {
              editor
                .chain()
                .focus()
                .setCellAttribute("borderColor", null)
                .setCellAttribute("borderStyle", null)
                .setCellAttribute("borderWidth", null)
                .run();
            }}
            onClose={() => setShowBorder(false)}
          />
        )}
      </div>
      <div className={style.colorBtnWrapper}>
        <button
          type="button"
          title="셀 배경색"
          onClick={() => {
            setShowCellColor(!showCellColor);
            setShowBorder(false);
          }}
          className={style.toolbarBtn}
        >
          <Svg type="highlightColor" width="18px" height="18px" />
        </button>
        {showCellColor && (
          <ColorDropdown
            currentColor={cellAttrs.backgroundColor}
            onSelect={(color) => setCellAttr("backgroundColor", color)}
            onClose={() => setShowCellColor(false)}
          />
        )}
      </div>
    </div>
  );
};

export default TableToolbar;
