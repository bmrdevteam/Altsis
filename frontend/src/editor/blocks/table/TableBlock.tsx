import React, { useEffect, useMemo } from "react";
import style from "../../editor.module.scss";
import useEditorStore from "../../store/useEditorStore";
import { CellRange, TableBlockData } from "../../types";
import CheckBoxCell from "./CheckBoxCell";
import DataCell from "./DataCell";
import InputCell from "./InputCell";
import ParagraphCell from "./ParagraphCell";
import SelectCell from "./SelectCell";
import TimeCell from "./TimeCell";
import TimeRangeCell from "./TimeRangeCell";

type Props = { blockId: string; index: number };

const TableBlock = (props: Props) => {
  const block = useEditorStore((s) => s.blocks[props.index]);
  const selectCell = useEditorStore((s) => s.selectCell);
  const selectedCellPos = useEditorStore((s) => s.selectedCellPosition);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const selectedCellRange = useEditorStore((s) => s.selectedCellRange);
  const startCellDrag = useEditorStore((s) => s.startCellDrag);
  const updateCellDrag = useEditorStore((s) => s.updateCellDrag);
  const endCellDrag = useEditorStore((s) => s.endCellDrag);
  const mode = useEditorStore((s) => s.mode);

  const data = block ? (block.data as TableBlockData) : null;

  // Pre-compute span entries and visible cells for navigation
  const { spanEntries, visibleCells } = useMemo(() => {
    const entries: { rowStart: number; rowEnd: number; colStart: number; colEnd: number }[] = [];
    const visible: { row: number; col: number }[] = [];

    if (data?.table) {
      for (let r = 0; r < data.table.length; r++) {
        for (let c = 0; c < data.table[r].length; c++) {
          const isSpanned = entries.some(
            (s) => s.rowStart <= r && s.rowEnd > r && s.colStart <= c && s.colEnd > c
          );
          if (isSpanned) continue;

          const cell = data.table[r][c];
          const rowSpan = isNaN(parseInt(cell.rowSpan as any)) ? 1 : Math.abs(parseInt(cell.rowSpan as any));
          const colSpan = isNaN(parseInt(cell.colSpan as any)) ? 1 : Math.abs(parseInt(cell.colSpan as any));
          entries.push({ rowStart: r, rowEnd: r + rowSpan, colStart: c, colEnd: c + colSpan });
          visible.push({ row: r, col: c });
        }
      }
    }

    return { spanEntries: entries, visibleCells: visible };
  }, [data?.table]);

  useEffect(() => {
    const handleMouseUp = () => {
      const state = useEditorStore.getState();
      if (!state.isDraggingCells) return;
      if (state.selectedBlockId !== props.blockId) return;

      const range = state.selectedCellRange;
      const isSingleClick =
        range &&
        range.start.row === range.end.row &&
        range.start.col === range.end.col;

      endCellDrag();

      // Focus cell content after single click
      if (isSingleClick && data?.table) {
        const cell = data.table[range.start.row]?.[range.start.col];
        if (cell?.id) {
          setTimeout(() => {
            const el = document.getElementById(cell.id);
            if (el) {
              const editable = el.querySelector(
                '[contenteditable="true"]'
              ) as HTMLElement;
              if (editable) {
                editable.focus();
              } else {
                el.focus();
              }
            }
          }, 0);
        }
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [endCellDrag, data?.table, props.blockId]);

  if (!block || !data) return null;

  const SetColumn = () => {
    const columns = data?.columns;
    if (columns && Array.isArray(columns)) {
      const columnsSum = columns.reduce((a: number, b: any) => a + Number(b), 0);
      const result = [];
      for (let i = 0; i < columns.length; i++) {
        result.push(
          <col width={`${(100 / columnsSum) * Number(columns[i])}%`} key={i} />
        );
      }
      return <colgroup>{result}</colgroup>;
    }
    return <colgroup></colgroup>;
  };

  const Cell = ({
    type,
    col,
    row,
  }: {
    type: string;
    col: number;
    row: number;
  }) => {
    const cellProps = {
      column: col,
      row: row,
      blockIndex: props.index,
      blockId: props.blockId,
    };

    switch (type) {
      case "paragraph":
        return <ParagraphCell {...cellProps} />;
      case "data":
        return <DataCell {...cellProps} />;
      case "time":
        return <TimeCell {...cellProps} />;
      case "timeRange":
        return <TimeRangeCell {...cellProps} />;
      case "input":
        return <InputCell {...cellProps} />;
      case "select":
        return <SelectCell {...cellProps} />;
      case "checkbox":
        return <CheckBoxCell {...cellProps} />;
      default:
        return <ParagraphCell {...cellProps} />;
    }
  };

  const isSpannedCell = (row: number, col: number) => {
    return spanEntries.some(
      (s) => s.rowStart <= row && s.rowEnd > row && s.colStart <= col && s.colEnd > col &&
        !(s.rowStart === row && s.colStart === col)
    );
  };

  const isCellInRange = (row: number, col: number, range: CellRange | null): boolean => {
    if (!range) return false;
    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);
    const minCol = Math.min(range.start.col, range.end.col);
    const maxCol = Math.max(range.start.col, range.end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const pos = selectedCellPos;
    if (!pos || selectedBlockId !== props.blockId) return;

    const { row, col } = pos;
    const currentIdx = visibleCells.findIndex((v) => v.row === row && v.col === col);
    if (currentIdx === -1) return;

    let nextPos: { row: number; col: number } | null = null;

    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        if (currentIdx > 0) {
          nextPos = visibleCells[currentIdx - 1];
        }
      } else {
        if (currentIdx < visibleCells.length - 1) {
          nextPos = visibleCells[currentIdx + 1];
        }
      }
    } else if (e.key === "ArrowRight") {
      // Check if cursor is at end of text in contentEditable
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.startContainer;
        const atEnd = range.collapsed && range.startOffset === (container.textContent?.length ?? 0);
        if (!atEnd && container.nodeType === Node.TEXT_NODE) return;
      }
      for (let i = currentIdx + 1; i < visibleCells.length; i++) {
        if (visibleCells[i].row === row) {
          nextPos = visibleCells[i];
          break;
        }
      }
    } else if (e.key === "ArrowLeft") {
      // Check if cursor is at start of text in contentEditable
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const atStart = range.collapsed && range.startOffset === 0;
        if (!atStart && range.startContainer.nodeType === Node.TEXT_NODE) return;
      }
      for (let i = currentIdx - 1; i >= 0; i--) {
        if (visibleCells[i].row === row) {
          nextPos = visibleCells[i];
          break;
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      for (let i = currentIdx + 1; i < visibleCells.length; i++) {
        if (visibleCells[i].row > row) {
          nextPos = visibleCells[i];
          // Try to find one at the same column
          for (let j = i; j < visibleCells.length && visibleCells[j].row === visibleCells[i].row; j++) {
            if (visibleCells[j].col >= col) {
              nextPos = visibleCells[j];
              break;
            }
          }
          break;
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRows = visibleCells.filter((v) => v.row < row);
      if (prevRows.length > 0) {
        const targetRow = prevRows[prevRows.length - 1].row;
        const rowCells = prevRows.filter((v) => v.row === targetRow);
        nextPos = rowCells.find((v) => v.col >= col) ?? rowCells[rowCells.length - 1];
      }
    }

    if (nextPos) {
      selectCell(nextPos);
      // Focus the cell content for continued editing
      const cellData = data.table[nextPos.row]?.[nextPos.col];
      if (cellData?.id) {
        setTimeout(() => {
          const el = document.getElementById(cellData.id);
          if (el) {
            const editableChild = el.querySelector('[contenteditable="true"]') as HTMLElement;
            if (editableChild) {
              editableChild.focus();
            } else {
              el.focus();
            }
          }
        }, 0);
      }
    }
  };

  return (
    <div
      className={style.block}
      tabIndex={mode === "edit" ? 0 : undefined}
      onKeyDown={mode === "edit" ? handleKeyDown : undefined}
    >
      <table
        className={style.table}
        style={{
          fontSize: data.fontSize,
          fontWeight: data.fontWeight,
          borderWidth: data.borderWidth,
          borderColor: data.borderColor,
          borderStyle: data.borderStyle,
          borderRadius: data.borderRadius,
          backgroundColor: data.backgroundColor,
        }}
      >
        <SetColumn />
        <tbody>
          {data.table !== undefined &&
            data.table.map((value: any, index: number) => {
              return (
                <tr key={index}>
                  {value.map((val: any, ind: number) => {
                    if (isSpannedCell(index, ind)) {
                      return null;
                    }

                    const isThisBlock = selectedBlockId === props.blockId;
                    const isSingleSelected =
                      isThisBlock &&
                      selectedCellPos?.row === index &&
                      selectedCellPos?.col === ind &&
                      !selectedCellRange;
                    const isInRange =
                      isThisBlock &&
                      isCellInRange(index, ind, selectedCellRange);
                    const isSelected = isSingleSelected || isInRange;

                    const cellStyle: React.CSSProperties = {
                      fontSize: val?.fontSize,
                      fontWeight: val?.fontWeight,
                      borderWidth: val?.borderWidth,
                      borderColor: val?.borderColor,
                      borderStyle: val?.borderStyle,
                      borderRadius: val?.borderRadius,
                      backgroundColor: val?.backgroundColor,
                      backgroundImage: val?.backgroundImage ? `url(${val.backgroundImage})` : undefined,
                      backgroundSize: val?.backgroundSize || "cover",
                      backgroundPosition: val?.backgroundPosition || "center",
                    };

                    const Tag = val.isHeader ? "th" : "td";
                    const isEditMode = mode === "edit";
                    return (
                      <Tag
                        key={ind}
                        id={val.id}
                        onClick={!isEditMode ? () => selectCell({ row: index, col: ind }, props.blockId) : undefined}
                        onMouseDown={isEditMode ? (e: React.MouseEvent) => {
                          startCellDrag({ row: index, col: ind }, props.blockId);
                        } : undefined}
                        onMouseEnter={isEditMode ? (e: React.MouseEvent) => {
                          if (useEditorStore.getState().isDraggingCells) {
                            e.preventDefault();
                            updateCellDrag({ row: index, col: ind });
                          }
                        } : undefined}
                        colSpan={val?.colSpan}
                        rowSpan={val?.rowSpan}
                        style={cellStyle}
                        className={
                          isSelected
                            ? isInRange && !isSingleSelected
                              ? style.selected_cell_range
                              : style.selected_cell
                            : undefined
                        }
                      >
                        <Cell type={val.type} row={index} col={ind} />
                      </Tag>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(TableBlock);
