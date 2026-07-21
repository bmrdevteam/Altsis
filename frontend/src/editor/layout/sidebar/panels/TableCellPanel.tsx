import React, { useEffect, useState, useRef } from "react";
import { isArray } from "lodash";
import Svg from "../../../../assets/svg/Svg";
import Button from "../../../../components/button/Button";
import Select from "../../../../components/select/Select";
import ToggleSwitch from "../../../../components/toggleSwitch/ToggleSwitch";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import useGenerateId from "../../../../hooks/useGenerateId";
import { CellType, TableBlockData, TextAlign } from "../../../types";
import Menu from "../Menu";
import SubSection from "../SubSection";
import DataConnPopup from "../DataConnPopup";

const generateId = useGenerateId;

const FONT_OPTIONS = [
  { value: "Pretendard", label: "Pretendard" },
  { value: "Noto Sans KR", label: "Noto Sans KR" },
  { value: "Gothic A1", label: "Gothic A1" },
  { value: "IBM Plex Sans KR", label: "IBM Plex Sans KR" },
  { value: "Nanum Gothic", label: "나눔고딕" },
  { value: "Nanum Gothic Coding", label: "나눔고딕코딩" },
  { value: "Gowun Dodum", label: "고운돋움" },
  { value: "Black Han Sans", label: "검정한산스" },
  { value: "Do Hyeon", label: "도현" },
  { value: "Jua", label: "주아" },
  { value: "Gugi", label: "궁서" },
  { value: "Sunflower", label: "해바라기" },
  { value: "Noto Serif KR", label: "Noto Serif KR" },
  { value: "Nanum Myeongjo", label: "나눔명조" },
  { value: "Gowun Batang", label: "고운바탕" },
  { value: "Hahmlet", label: "함렛" },
  { value: "Song Myung", label: "송명" },
  { value: "Nanum Pen Script", label: "나눔펜" },
  { value: "Nanum Brush Script", label: "나눔브러시" },
  { value: "Gaegu", label: "개구" },
  { value: "Hi Melody", label: "하이멜로디" },
  { value: "Gamja Flower", label: "감자꽃" },
  { value: "Poor Story", label: "푸어스토리" },
  { value: "Yeon Sung", label: "연성" },
  { value: "Stylish", label: "스타일리시" },
  { value: "Single Day", label: "싱글데이" },
  { value: "Cute Font", label: "큐트폰트" },
  { value: "Dokdo", label: "독도" },
  { value: "East Sea Dokdo", label: "동해독도" },
  { value: "Kirang Haerang", label: "기랑해랑" },
  { value: "Black And White Picture", label: "흑백사진" },
];

type ActiveTab = "table" | "cell";
type ImageInputMode = "file" | "url";

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
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>("file");
  const bgImageFileRef = useRef<HTMLInputElement>(null);

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

  const setFontFamilyAll = (ff: string) => {
    useEditorStore.setState((state) => {
      const block = state.blocks.find((b) => b.id === blockId);
      if (block && block.type === "table") {
        const td = block.data as TableBlockData;
        td.fontFamily = ff;
        td.table.forEach((row) => row.forEach((c) => (c.fontFamily = ff)));
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

  const applyCellTypeChange = (newType: CellType) => {
    if (cellRange) {
      const positions = useEditorStore.getState().getSelectedCells();
      useEditorStore.setState((state) => {
        const block = state.blocks.find((b) => b.id === blockId);
        if (!block || block.type !== "table") return;
        const td = block.data as TableBlockData;
        for (const pos of positions) {
          const c = td.table?.[pos.row]?.[pos.col];
          if (!c) continue;
          c.type = newType;
          if (newType === "select" && !isArray(c.options)) {
            c.options = [];
          }
        }
      });
      useEditorStore.getState().saveSnapshot();
      return;
    }

    const patch: Record<string, any> = { type: newType };
    if (newType === "select" && !isArray(cell?.options)) {
      patch.options = [];
    }
    updateCellProp(patch);
  };

  // --- Derived values based on active tab ---
  const isTable = activeTab === "table";

  const currentFontFamily = isTable
    ? (data.fontFamily ?? "Pretendard")
    : (cell?.fontFamily ?? data.fontFamily ?? "Pretendard");
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
  const setFontFamily = (ff: string) =>
    isTable ? setFontFamilyAll(ff) : updateCellProp({ fontFamily: ff });
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
          <label>폰트</label>
          <select
            value={currentFontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{
              height: "28px",
              fontSize: "12px",
              backgroundColor: "var(--background-color)",
              border: "none",
              borderRadius: "6px",
              padding: "0 8px",
              color: "var(--accent-1)",
            }}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
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
        <div style={{ marginTop: "8px" }}>
          <div className={style.tab_bar} style={{ marginBottom: "8px" }}>
            <button
              className={`${style.tab_item} ${imageInputMode === "file" ? style.active : ""}`}
              onClick={() => setImageInputMode("file")}
            >
              파일
            </button>
            <button
              className={`${style.tab_item} ${imageInputMode === "url" ? style.active : ""}`}
              onClick={() => setImageInputMode("url")}
            >
              URL
            </button>
          </div>
          {imageInputMode === "file" ? (
            <div className={style.grid_item}>
              <label>이미지</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "var(--background-color)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--accent-3)",
                }}
                onClick={() => bgImageFileRef.current?.click()}
              >
                {(isTable ? data.backgroundImage : cell?.backgroundImage) ? "이미지 변경" : "파일 선택"}
              </div>
              <input
                ref={bgImageFileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const imageData = reader.result as string;
                    if (isTable) {
                      useEditorStore.setState((state) => {
                        const block = state.blocks.find((b) => b.id === blockId);
                        if (block && block.type === "table") {
                          const td = block.data as TableBlockData;
                          td.backgroundImage = imageData;
                          td.table.forEach((row) =>
                            row.forEach((c) => (c.backgroundImage = imageData))
                          );
                        }
                      });
                      useEditorStore.getState().saveSnapshot();
                    } else {
                      updateCellProp({ backgroundImage: imageData });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          ) : (
            <div className={style.grid_item}>
              <label>URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={
                  isTable
                    ? (data.backgroundImage?.startsWith("data:") ? "" : (data.backgroundImage ?? ""))
                    : (cell?.backgroundImage?.startsWith("data:") ? "" : (cell?.backgroundImage ?? ""))
                }
                onChange={(e) => {
                  if (isTable) {
                    useEditorStore.setState((state) => {
                      const block = state.blocks.find((b) => b.id === blockId);
                      if (block && block.type === "table") {
                        const td = block.data as TableBlockData;
                        td.backgroundImage = e.target.value;
                        td.table.forEach((row) =>
                          row.forEach((c) => (c.backgroundImage = e.target.value))
                        );
                      }
                    });
                    useEditorStore.getState().saveSnapshot();
                  } else {
                    updateCellProp({ backgroundImage: e.target.value });
                  }
                }}
              />
            </div>
          )}
          {(isTable ? data.backgroundImage : cell?.backgroundImage) && (
            <Button
              type="ghost"
              style={{
                width: "100%",
                marginTop: "8px",
                height: "28px",
                fontSize: "12px",
                boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
              }}
              onClick={() => {
                if (isTable) {
                  useEditorStore.setState((state) => {
                    const block = state.blocks.find((b) => b.id === blockId);
                    if (block && block.type === "table") {
                      const td = block.data as TableBlockData;
                      td.backgroundImage = "";
                      td.table.forEach((row) =>
                        row.forEach((c) => (c.backgroundImage = ""))
                      );
                    }
                  });
                  useEditorStore.getState().saveSnapshot();
                } else {
                  updateCellProp({ backgroundImage: "" });
                }
              }}
            >
              이미지 삭제
            </Button>
          )}
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
                  width="16px"
                  height="16px"
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
                  width="16px"
                  height="16px"
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
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 calc(25% - 3px)",
                  minWidth: "calc(25% - 3px)",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "28px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .insertColumnBefore(blockId, cellPos.col);
                }}
              >
                <Svg type={"tableInsertLeft"} width="14px" height="14px" />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 calc(25% - 3px)",
                  minWidth: "calc(25% - 3px)",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "28px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .addColumn(blockId, cellPos.col);
                }}
              >
                <Svg type={"tableInsertRight"} width="14px" height="14px" />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 calc(25% - 3px)",
                  minWidth: "calc(25% - 3px)",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "28px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .addRow(blockId, cellPos.row - 1);
                }}
              >
                <Svg type={"tableInsertUp"} width="14px" height="14px" />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 calc(25% - 3px)",
                  minWidth: "calc(25% - 3px)",
                  marginTop: "8px",
                  borderRadius: "4px",
                  height: "28px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore.getState().addRow(blockId, cellPos.row);
                }}
              >
                <Svg type={"tableInsertDown"} width="14px" height="14px" />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 calc(25% - 3px)",
                  minWidth: "calc(25% - 3px)",
                  marginTop: "4px",
                  borderRadius: "4px",
                  height: "28px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .removeColumn(blockId, cellPos.col);
                }}
              >
                <Svg type={"tableDeleteColumn"} width="14px" height="14px" />
              </Button>
              <Button
                type="ghost"
                style={{
                  flex: "1 1 calc(25% - 3px)",
                  minWidth: "calc(25% - 3px)",
                  marginTop: "4px",
                  borderRadius: "4px",
                  height: "28px",
                  boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                }}
                onClick={() => {
                  useEditorStore
                    .getState()
                    .removeRow(blockId, cellPos.row);
                }}
              >
                <Svg type={"tableDeleteRow"} width="14px" height="14px" />
              </Button>
            </div>
          </SubSection>

          {/* Cell Type Section */}
          <SubSection label="셀 타입">
            <div className={style.grid_item}>
              <label>타입</label>
              <select
                value={cell.type}
                onChange={(e) =>
                  applyCellTypeChange(e.target.value as CellType)
                }
                style={{
                  height: "28px",
                  fontSize: "12px",
                  backgroundColor: "var(--background-color)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0 8px",
                  color: "var(--accent-1)",
                }}
              >
                <option value="paragraph">텍스트셀</option>
                <option value="data">데이터셀</option>
                <option value="time">시간셀</option>
                <option value="timeRange">시간범위셀</option>
                <option value="checkbox">체크박스셀</option>
                <option value="input">입력셀</option>
                <option value="select">선택셀</option>
              </select>
            </div>

            {/* Checkbox type settings */}
            {cell.type === "checkbox" && (
              <>
                <div className={style.grid_item}>
                  <label>표시 이름</label>
                  <input
                    type="text"
                    value={cell.name ?? ""}
                    placeholder="선택 사항"
                    onChange={(e) => updateCellProp({ name: e.target.value })}
                  />
                </div>
                <div className={style.grid_item}>
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={cell.timeRangeStart ?? "00:00"}
                    onChange={(e) =>
                      updateCellProp({ timeRangeStart: e.target.value })
                    }
                  />
                </div>
                <div className={style.grid_item}>
                  <label>끝 시간</label>
                  <input
                    type="time"
                    value={cell.timeRangeEnd ?? "00:00"}
                    onChange={(e) =>
                      updateCellProp({ timeRangeEnd: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {/* TimeRange type settings */}
            {cell.type === "timeRange" && (
              <>
                <div className={style.grid_item}>
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={cell.timeRangeStart ?? "00:00"}
                    onChange={(e) =>
                      updateCellProp({ timeRangeStart: e.target.value })
                    }
                  />
                </div>
                <div className={style.grid_item}>
                  <label>끝 시간</label>
                  <input
                    type="time"
                    value={cell.timeRangeEnd ?? "00:00"}
                    onChange={(e) =>
                      updateCellProp({ timeRangeEnd: e.target.value })
                    }
                  />
                </div>
                <div className={style.grid_item}>
                  <label>표시 텍스트</label>
                  <input
                    type="text"
                    placeholder="예: 1교시"
                    value={cell.timeRangeDisplayText ?? ""}
                    onChange={(e) =>
                      updateCellProp({ timeRangeDisplayText: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {/* Time type settings */}
            {cell.type === "time" && (
              <div className={style.grid_item}>
                <label>시간</label>
                <input
                  type="time"
                  value={cell.data?.text ?? "00:00"}
                  onChange={(e) =>
                    updateCellProp({ data: { text: e.target.value } })
                  }
                />
              </div>
            )}

            {/* Input type settings */}
            {cell.type === "input" && (
              <>
                <div className={style.grid_item}>
                  <label>표시 이름</label>
                  <input
                    type="text"
                    value={cell.name ?? ""}
                    placeholder="선택 사항"
                    onChange={(e) => updateCellProp({ name: e.target.value })}
                  />
                </div>
                <div className={style.grid_item}>
                  <label>응답 예시</label>
                  <input
                    type="text"
                    value={cell.placeholder ?? ""}
                    onChange={(e) =>
                      updateCellProp({ placeholder: e.target.value })
                    }
                  />
                </div>
                <div className={style.grid_item}>
                  <label>필수</label>
                  <ToggleSwitch
                    defaultChecked={cell.required}
                    onChange={(e: boolean) => updateCellProp({ required: e })}
                  />
                </div>
              </>
            )}

            {/* Select type settings */}
            {cell.type === "select" && (
              <div>
                <div className={style.grid_item}>
                  <label>표시 이름</label>
                  <input
                    type="text"
                    value={cell.name ?? ""}
                    placeholder="선택 사항"
                    onChange={(e) => updateCellProp({ name: e.target.value })}
                  />
                </div>
                <label style={{ display: "block", marginTop: "8px", marginBottom: "4px", fontSize: "11px", fontWeight: 700, color: "var(--accent-3)" }}>
                  옵션
                </label>
                <div className={style.options}>
                  {cell.options?.map((value) => (
                    <div className={style.item} key={value.id} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <input
                        type="text"
                        value={value.text}
                        placeholder="필드"
                        style={{ flex: 1 }}
                        onChange={(e) => {
                          const nextText = e.target.value;
                          useEditorStore.setState((state) => {
                            const block = state.blocks.find(
                              (b) => b.id === blockId
                            );
                            if (block && block.type === "table") {
                              const td = block.data as TableBlockData;
                              const c =
                                td.table?.[cellPos.row]?.[cellPos.col];
                              const opt = c?.options?.find(
                                (o) => o.id === value.id
                              );
                              if (opt) {
                                // 값이 비어 있거나 이전 필드와 같으면 값도 함께 맞춤
                                if (
                                  !opt.value ||
                                  opt.value === opt.text
                                ) {
                                  opt.value = nextText;
                                }
                                opt.text = nextText;
                              }
                            }
                          });
                          useEditorStore.getState().markDirty();
                        }}
                      />
                      <span>|</span>
                      <input
                        type="text"
                        value={value.value}
                        placeholder="값"
                        style={{ flex: 1 }}
                        onChange={(e) => {
                          useEditorStore.setState((state) => {
                            const block = state.blocks.find(
                              (b) => b.id === blockId
                            );
                            if (block && block.type === "table") {
                              const td = block.data as TableBlockData;
                              const c =
                                td.table?.[cellPos.row]?.[cellPos.col];
                              const opt = c?.options?.find(
                                (o) => o.id === value.id
                              );
                              if (opt) opt.value = e.target.value;
                            }
                          });
                          useEditorStore.getState().markDirty();
                        }}
                      />
                      <span
                        style={{ minWidth: "20px", cursor: "pointer" }}
                        onClick={() => {
                          useEditorStore.setState((state) => {
                            const block = state.blocks.find(
                              (b) => b.id === blockId
                            );
                            if (block && block.type === "table") {
                              const td = block.data as TableBlockData;
                              const c =
                                td.table?.[cellPos.row]?.[cellPos.col];
                              if (c?.options) {
                                c.options = c.options.filter(
                                  (o) => o.id !== value.id
                                );
                              }
                            }
                          });
                          useEditorStore.getState().saveSnapshot();
                        }}
                      >
                        <Svg width="16px" type={"x"} />
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  type="ghost"
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    height: "28px",
                    boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
                  }}
                  onClick={() => {
                    useEditorStore.setState((state) => {
                      const block = state.blocks.find(
                        (b) => b.id === blockId
                      );
                      if (block && block.type === "table") {
                        const td = block.data as TableBlockData;
                        const c = td.table?.[cellPos.row]?.[cellPos.col];
                        if (c) {
                          if (!isArray(c.options)) {
                            c.options = [];
                          }
                          c.options.push({
                            id: generateId(12),
                            text: "",
                            value: "",
                          });
                        }
                      }
                    });
                    useEditorStore.getState().saveSnapshot();
                  }}
                >
                  옵션 추가
                </Button>
              </div>
            )}

            {/* Data type settings */}
            {cell.type === "data" && <DataConnPopup />}
          </SubSection>
        </>
      )}
    </Menu>
  );
};

export default TableCellPanel;
