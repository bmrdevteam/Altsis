import React from "react";
import { isArray } from "lodash";
import Svg from "../../../../assets/svg/Svg";
import Button from "../../../../components/button/Button";
import Select from "../../../../components/select/Select";
import ToggleSwitch from "../../../../components/toggleSwitch/ToggleSwitch";
import style from "../../../editor.module.scss";
import useEditorStore from "../../../store/useEditorStore";
import useGenerateId from "../../../../hooks/useGenerateId";
import { CellType, TableBlockData } from "../../../types";
import Menu from "../Menu";
import DataConnPopup from "../DataConnPopup";

const generateId = useGenerateId;

const CellTypePanel = () => {
  const selectedBlock = useEditorStore((s) => {
    if (!s.selectedBlockId) return null;
    return s.blocks.find((b) => b.id === s.selectedBlockId) ?? null;
  });
  const cellPos = useEditorStore((s) => s.selectedCellPosition);
  const cellRange = useEditorStore((s) => s.selectedCellRange);
  const updateSelectedCells = useEditorStore((s) => s.updateSelectedCells);

  if (!selectedBlock || selectedBlock.type !== "table" || !cellPos) return null;

  const data = selectedBlock.data as TableBlockData;
  const cell = data.table?.[cellPos.row]?.[cellPos.col];
  if (!cell) return null;

  const blockId = selectedBlock.id;

  const updateCellProp = (props: Record<string, any>) => {
    if (cellRange) {
      updateSelectedCells(blockId, props);
    } else {
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

  return (
    <Menu name="셀 타입">
      <div className={style.option}>
        <div className={style.item}>
          <Select
            onChange={(value: any) => updateCellProp({ type: value })}
            style={{ fontSize: "12px" }}
            selectedValue={cell.type}
            appearence="flat"
            options={[
              { text: "텍스트셀", value: "paragraph" },
              { text: "데이터셀", value: "data" },
              { text: "시간셀", value: "time" },
              { text: "시간범위셀", value: "timeRange" },
              { text: "체크박스셀", value: "checkbox" },
              { text: "입력셀", value: "input" },
              { text: "선택셀", value: "select" },
            ]}
          />
        </div>

        {/* Checkbox type settings */}
        {cell.type === "checkbox" && (
              <>
                <div className={style.item}>
                  <label>이름</label>
                  <input
                    type="text"
                    value={cell.name ?? ""}
                    onChange={(e) => updateCellProp({ name: e.target.value })}
                  />
                </div>
                <div className={style.item}>
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={cell.timeRangeStart ?? "00:00"}
                    onChange={(e) =>
                      updateCellProp({ timeRangeStart: e.target.value })
                    }
                  />
                </div>
                <div className={style.item}>
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
                <div className={style.item}>
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={cell.timeRangeStart ?? "00:00"}
                    onChange={(e) =>
                      updateCellProp({ timeRangeStart: e.target.value })
                    }
                  />
                </div>
                <div className={style.item}>
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

            {/* Time type settings */}
            {cell.type === "time" && (
              <div className={style.item}>
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
                <div className={style.item}>
                  <label>이름</label>
                  <input
                    type="text"
                    value={cell.name ?? ""}
                    onChange={(e) => updateCellProp({ name: e.target.value })}
                  />
                </div>
                <div className={style.item}>
                  <label>응답 예시</label>
                  <input
                    type="text"
                    value={cell.placeholder ?? ""}
                    onChange={(e) =>
                      updateCellProp({ placeholder: e.target.value })
                    }
                  />
                </div>
                <div className={style.item}>
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
                <label style={{ flex: "1 1 0" }} className={style.name}>
                  옵션
                </label>
                <div className={style.item}>
                  <label>이름</label>
                  <input
                    type="text"
                    value={cell.name ?? ""}
                    onChange={(e) => updateCellProp({ name: e.target.value })}
                  />
                </div>
                <div className={style.options}>
                  {cell.options?.map((value) => (
                    <div className={style.item} key={value.id}>
                      <span>
                        <input
                          type="text"
                          value={value.text}
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
                                if (opt) opt.text = e.target.value;
                              }
                            });
                          }}
                        />
                      </span>
                      <span>|</span>
                      <span>
                        <input
                          type="text"
                          value={value.value}
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
                          }}
                        />
                      </span>
                      <span
                        style={{ minWidth: "24px", cursor: "pointer" }}
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
                        <Svg width="24px" type={"x"} />
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  type="ghost"
                  style={{
                    flex: "1 1 0",
                    marginTop: "8px",
                    height: "32px",
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
                            text: "필드",
                            value: "값",
                          });
                        }
                      }
                    });
                    useEditorStore.getState().saveSnapshot();
                  }}
                >
                  option 추가
                </Button>
              </div>
            )}

        {/* Data type settings */}
        {cell.type === "data" && <DataConnPopup />}
      </div>
    </Menu>
  );
};

export default CellTypePanel;
