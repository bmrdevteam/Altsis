import React, { useEffect, useState } from "react";
import Svg from "../../../../assets/svg/Svg";
import Button from "../../../../components/button/Button";
import Select from "../../../../components/select/Select";
import ToggleSwitch from "../../../../components/toggleSwitch/ToggleSwitch";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import { TableBlockData, TextAlign } from "../../../types";
import Menu from "../Menu";
import SubSection from "../SubSection";

type ActiveTab = "table" | "cell";

const NumberSelect = ({
  value,
  onChange,
  options,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
  min?: number;
  max?: number;
  step?: number;
}) => (
  <div className={style.number_select}>
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
    />
    <select
      value={options.includes(value) ? value : ""}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
    >
      {!options.includes(value) && (
        <option value="" disabled hidden />
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

const TableCellPanel = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const cellPos = useEditorStore((s) => s.selectedCellPosition);
  const cellRange = useEditorStore((s) => s.selectedCellRange);
  const updateBlockData = useEditorStore((s) => s.updateBlockData);
  const updateSelectedCells = useEditorStore((s) => s.updateSelectedCells);
  const [activeTab, setActiveTab] = useState<ActiveTab>("table");

  const hasCell = cellPos !== null || cellRange !== null;

  useEffect(() => {
    if (hasCell) {
      setActiveTab("cell");
    } else {
      setActiveTab("table");
    }
  }, [hasCell]);

  if (!selectedBlock || selectedBlock.type !== "table") return null;

  const data = selectedBlock.data as TableBlockData;
  const blockId = selectedBlock.id;
  const cell =
    cellPos ? data.table?.[cellPos.row]?.[cellPos.col] ?? null : null;

  // --- Table-wide setters ---
  const setAlignAll = (align: TextAlign) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.align = align;
        td.table.forEach((row) => row.forEach((c) => (c.align = align)));
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const setFontWeightAll = (fw: number) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.fontWeight = fw;
        td.table.forEach((row) => row.forEach((c) => (c.fontWeight = fw)));
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const setFontSizeAll = (fs: string) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.fontSize = fs;
        td.table.forEach((row) => row.forEach((c) => (c.fontSize = fs)));
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const setBorderStyleAll = (bs: string) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.borderStyle = bs;
        td.table.forEach((row) => row.forEach((c) => (c.borderStyle = bs)));
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const setBorderWidthAll = (bw: number) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.borderWidth = bw;
        td.table.forEach((row) => row.forEach((c) => (c.borderWidth = bw)));
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const setBorderColorAll = (color: string) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.borderColor = color;
        td.table.forEach((row) =>
          row.forEach((c) => (c.borderColor = color))
        );
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  const setBackgroundColorAll = (color: string) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.backgroundColor = color;
        td.table.forEach((row) =>
          row.forEach((c) => (c.backgroundColor = color))
        );
      }
    });
    useEditorStore.getState().saveSnapshot();
  };

  // --- Cell setter ---
  const updateCellProp = (props: Record<string, any>) => {
    if (cellRange) {
      updateSelectedCells(blockId, props);
    } else if (cellPos) {
      useEditorStore.setState((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (block && block.type === "table") {
          const td = block.data as TableBlockData;
          const c = td.table?.[cellPos.row]?.[cellPos.col];
          if (c) Object.assign(c, props);
        }
      });
      useEditorStore.getState().saveSnapshot();
    }
  };

  // --- Derived values based on active tab ---
  const isTable = activeTab === "table";

  const currentAlign = isTable
    ? data.align
    : (cell?.align ?? data.align);
  const currentFontWeight = isTable
    ? (data.fontWeight ?? 400)
    : (cell?.fontWeight ?? data.fontWeight ?? 400);
  const currentFontSize = isTable
    ? (data.fontSize ?? "14px")
    : (cell?.fontSize ?? data.fontSize ?? "14px");
  const currentBorderStyle = isTable
    ? data.borderStyle
    : (cell?.borderStyle ?? data.borderStyle);
  const currentBorderWidth = isTable
    ? (data.borderWidth ?? 1)
    : (cell?.borderWidth ?? data.borderWidth ?? 1);
  const currentBorderColor = isTable
    ? (data.borderColor ?? "#cccccc")
    : (cell?.borderColor ?? data.borderColor ?? "#cccccc");
  const currentBgColor = isTable
    ? (data.backgroundColor ?? "#ffffff")
    : (cell?.backgroundColor ?? data.backgroundColor ?? "#ffffff");

  // --- Shared action dispatchers ---
  const setAlign = (a: TextAlign) =>
    isTable ? setAlignAll(a) : updateCellProp({ align: a });
  const setFontWeight = (fw: number) =>
    isTable ? setFontWeightAll(fw) : updateCellProp({ fontWeight: fw });
  const setFontSize = (fs: string) =>
    isTable ? setFontSizeAll(fs) : updateCellProp({ fontSize: fs });
  const setBorderStyle = (bs: string) =>
    isTable ? setBorderStyleAll(bs) : updateCellProp({ borderStyle: bs });
  const setBorderWidth = (bw: number) =>
    isTable ? setBorderWidthAll(bw) : updateCellProp({ borderWidth: bw });
  const setBorderColor = (color: string) =>
    isTable ? setBorderColorAll(color) : updateCellProp({ borderColor: color });
  const setBackgroundColor = (color: string) =>
    isTable
      ? setBackgroundColorAll(color)
      : updateCellProp({ backgroundColor: color });

  return (
    <Menu name="표 / 셀">
      {/* Tab bar - only show when cell is selected */}
      {hasCell && (
        <div className={style.tab_bar}>
          <button
            className={`${style.tab_item} ${activeTab === "table" ? style.active : ""}`}
            onClick={() => setActiveTab("table")}
          >
            표 전체
          </button>
          <button
            className={`${style.tab_item} ${activeTab === "cell" ? style.active : ""}`}
            onClick={() => setActiveTab("cell")}
          >
            선택 셀
          </button>
        </div>
      )}

      {/* Shared: 글자 (Font) */}
      <SubSection label="글자">
        <div className={style.grid_item}>
          <label>정렬</label>
          <div className={style.align}>
            <div className={style.align_options}>
              {(["left", "center", "right"] as TextAlign[]).map((a) => (
                <div
                  key={a}
                  className={style.option}
                  onClick={() => setAlign(a)}
                >
                  <Svg
                    type={
                      a === "left"
                        ? "alignLeft"
                        : a === "center"
                          ? "alignCenter"
                          : "alignRight"
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={style.grid_item}>
          <label>굵기</label>
          <NumberSelect
            value={currentFontWeight}
            onChange={(v) => setFontWeight(v)}
            options={[100, 200, 300, 400, 500, 600, 700, 800, 900]}
            min={100}
            max={900}
            step={100}
          />
        </div>
        <div className={style.grid_item}>
          <label>크기</label>
          <NumberSelect
            value={parseInt(currentFontSize as string) || 14}
            onChange={(v) => setFontSize(`${v}px`)}
            options={[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72]}
            min={0}
            max={100}
            step={1}
          />
        </div>
        {/* Cell-only: header toggle */}
        {!isTable && cell && (
          <div className={style.grid_item}>
            <label>헤더</label>
            <ToggleSwitch
              key={cellPos ? `${cellPos.row}-${cellPos.col}` : "none"}
              defaultChecked={cell.isHeader}
              onChange={(e: boolean) => {
                if (e) {
                  updateCellProp({
                    isHeader: true,
                    fontWeight: 600,
                    align: "center",
                    backgroundColor: "#f5f5f5",
                  });
                } else {
                  updateCellProp({
                    isHeader: false,
                    fontWeight: data.fontWeight ?? 400,
                    align: (data.align as TextAlign) ?? "left",
                    backgroundColor: data.backgroundColor ?? "#ffffff",
                  });
                }
              }}
            />
          </div>
        )}
      </SubSection>

      {/* Shared: 선 (Border) */}
      <SubSection label="선">
        <div className={style.grid_item}>
          <label>스타일</label>
          <Select
            onChange={(value: any) => setBorderStyle(value)}
            style={{ fontSize: "12px" }}
            selectedValue={currentBorderStyle}
            appearence="flat"
            options={[
              { text: "solid", value: "solid" },
              { text: "dotted", value: "dotted" },
              { text: "dashed", value: "dashed" },
              { text: "double", value: "double" },
              { text: "groove", value: "groove" },
              { text: "ridge", value: "ridge" },
              { text: "inset", value: "inset" },
              { text: "outset", value: "outset" },
              { text: "none", value: "none" },
              { text: "hidden", value: "hidden" },
            ]}
          />
        </div>
        <div className={style.grid_item}>
          <label>굵기</label>
          <NumberSelect
            value={currentBorderWidth}
            onChange={(v) => setBorderWidth(v)}
            options={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            min={0}
            max={10}
            step={1}
          />
        </div>
        <div className={style.grid_item}>
          <label>색상</label>
          <input
            onChange={(e) => {
              if (e.target.value) setBorderColor(e.target.value);
            }}
            type="color"
            value={currentBorderColor}
          />
        </div>
      </SubSection>

      {/* Shared: 배경 (Background) */}
      <SubSection label="배경">
        <div className={style.grid_item}>
          <label>배경색</label>
          <input
            onChange={(e) => {
              if (e.target.value) setBackgroundColor(e.target.value);
            }}
            type="color"
            value={currentBgColor}
          />
        </div>
      </SubSection>

      {/* Table-only: 표 (Table width) */}
      {isTable && (
        <SubSection label="표">
          <div className={style.grid_item}>
            <label>너비 (%)</label>
            <NumberSelect
              value={data.width ?? 100}
              onChange={(v) => {
                updateBlockData(blockId, { width: v } as any);
              }}
              options={[10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100]}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </SubSection>
      )}

      {/* Cell-only: 셀 (Cell ratio) */}
      {!isTable && cell && cellPos && (
        <>
          <SubSection label="셀">
            <div className={style.grid_item}>
              <label>비율</label>
              <NumberSelect
                value={data.columns?.[cellPos.col] ?? 1}
                onChange={(v) => {
                  useEditorStore
                    .getState()
                    .setCellColumn(blockId, cellPos.col, v);
                  useEditorStore.getState().saveSnapshot();
                }}
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20]}
                min={1}
                max={20}
                step={1}
              />
            </div>
          </SubSection>

          <SubSection label="행렬">
            <div style={{ display: "flex", gap: "4px" }}>
              <div className={style.grid_item} style={{ flex: "1 1 0" }}>
                <Svg
                  type={"tableMergeHorizontal"}
                  width="20px"
                  height="20px"
                />
                <input
                  min="1"
                  onChange={(e) => {
                    if (e.target.value) {
                      updateCellProp({ colSpan: parseInt(e.target.value) });
                    }
                  }}
                  type="number"
                  value={cell.colSpan ?? 1}
                />
              </div>
              <div className={style.grid_item} style={{ flex: "1 1 0" }}>
                <Svg
                  type={"tableMergeVertical"}
                  width="20px"
                  height="20px"
                />
                <input
                  min="1"
                  onChange={(e) => {
                    if (e.target.value) {
                      updateCellProp({ rowSpan: parseInt(e.target.value) });
                    }
                  }}
                  type="number"
                  value={cell.rowSpan ?? 1}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 0",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .insertColumnBefore(blockId, cellPos.col);
                }}
              >
                <Svg type={"tableInsertLeft"} />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 0",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .addColumn(blockId, cellPos.col);
                }}
              >
                <Svg type={"tableInsertRight"} />
              </Button>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 0",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .addRow(blockId, cellPos.row - 1);
                }}
              >
                <Svg type={"tableInsertUp"} />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 0",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore.getState().addRow(blockId, cellPos.row);
                }}
              >
                <Svg type={"tableInsertDown"} />
              </Button>
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 0",
                  marginTop: "8px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .removeColumn(blockId, cellPos.col);
                }}
              >
                <Svg type={"tableDeleteColumn"} />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 0",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "32px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .removeRow(blockId, cellPos.row);
                }}
              >
                <Svg type={"tableDeleteRow"} />
              </Button>
            </div>
          </SubSection>
        </>
      )}
    </Menu>
  );
};

export default TableCellPanel;
