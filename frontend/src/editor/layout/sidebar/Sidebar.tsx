import Tree, { TreeItem } from "components/tree/Tree";
import useGenerateId from "hooks/useGenerateId";
import { isArray } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import Svg from "../../../assets/svg/Svg";
import Button from "../../../components/button/Button";
import Popup from "../../../components/popup/Popup";
import Select from "../../../components/select/Select";
import ToggleSwitch from "../../../components/toggleSwitch/ToggleSwitch";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import useEditorStore from "../../functions/useEditorStore";
import DataConnPopup from "./DataConnPopup";
import DatatableMenu from "./DatatableMenu";
import Menu from "./Menu";
import Progress from "components/progress/Progress";

type Props = {
  callPageReload: () => void;
};

const Sidebar = (props: Props) => {
  const {
    getCurrentBlock,
    copyBlockAfterCurrentBlock,
    changeCurrentBlockType,
    changeCurrentBlockData,
    setReloadEditorData,
    changeCurrentCell,
    setCurrentCellColumn,
    removeCurrentBlock,
    upCurrentBlock,
    downCurrentBlock,
    getCurrentCell,
    getCurrentCellColumn,
    addBlockAfterCurrentBlock,
    addToCurrentColumn,
    addToCurrentRow,
    getCurrentCellIndex,
    removeCurrentColumn,
    removeCurrentRow,
    editorPageRef,
  } = useEditor();
  const { preview } = useEditorStore();
  const generateId = useGenerateId;
  /**
   * reloader
   */
  const [, updateState] = React.useState({});
  const forcefullyReloadSidebar = React.useCallback(() => updateState({}), []);

  document.onclick = (e) => {
    if (
      editorPageRef.current &&
      editorPageRef.current.contains(e.target as Node)
    ) {
      forcefullyReloadSidebar();
    }
  };

  // const [addNewBlockType, setAddNewBlockType] = useState<string>("paragraph");
  const blockTypes = [
    { text: "텍스트", value: "paragraph" },
    { text: "테이블", value: "table" },
    { text: "select", value: "select" },
    { text: "선", value: "divider" },
    { text: "입력", value: "input" },
  ];

  const AddBlockMenu = () => {
    return (
      <Menu name="블록">
        <div className={style.item}>
          {/* <label>유형</label>
          <Select
            style={{ fontSize: "12px" }}
            appearence="flat"
            onChange={(value: string) => {
              setAddNewBlockType(value);
            }}
            selectedValue={addNewBlockType}
            options={blockTypes}
          /> */}
          <div className={style.add_block}>
            <div
              className={style.option}
              onClick={() => {
                addBlockAfterCurrentBlock("paragraph");
              }}
            >
              <Svg type={"text"} />
            </div>
            <div
              className={style.option}
              onClick={() => {
                addBlockAfterCurrentBlock("table");
              }}
            >
              <Svg type={"table"} />
            </div>
            <div
              className={style.option}
              onClick={() => {
                addBlockAfterCurrentBlock("divider");
              }}
            >
              <Svg type={"minus"} />
            </div>
            <div
              className={style.option}
              onClick={() => {
                addBlockAfterCurrentBlock("input");
              }}
            >
              <Svg
                type={"text"}
                style={{
                  border: "var(--border-default)",
                  borderColor: "var(--accent-1)",
                }}
              />
            </div>
          </div>
        </div>
        <div  style={{ display: "flex", gap: "4px" }}>
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
              upCurrentBlock();
            }}
          >
            <Svg type={"arrowUp"} />
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
              downCurrentBlock();
            }}
          >
            <Svg type={"arrowDown"} />
          </Button>
        </div>
        <div  style={{ display: "flex", gap: "4px" }}>
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
              copyBlockAfterCurrentBlock(getCurrentBlock().data);
            }}
          >
            <Svg type={"paste"} />
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
              removeCurrentBlock();
            }}
          >
            <Svg type={"trash"} />
          </Button>
        </div>
      </Menu>
    );
  };

  const BlockMenu = () => {
    return (
      <Menu name="속성">
        {/* <div className={style.item}>
          <label>{getCurrentBlock()?.id}</label>
        </div> */}
        <div className={style.item}>
          <label>유형</label>
          <Select
            onChange={(value: any) => {
              changeCurrentBlockType(value);
              forcefullyReloadSidebar();
            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentBlock()?.type}
            appearence="flat"
            options={blockTypes}
          />
        </div>
        <div className={style.item}>
          <label>너비 (%)</label>

          <input
            onChange={(e) => {
              changeCurrentBlockData({ width: parseFloat(e.target.value) });
              props.callPageReload();
            }}
            type="number"
            defaultValue={getCurrentBlock().data.width ?? 100}
          />
        </div>
        <div  style={{ display: "flex", gap: "4px" }}>
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
              upCurrentBlock();
            }}
          >
            <Svg type={"arrowUp"} />
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
              downCurrentBlock();
            }}
          >
            <Svg type={"arrowDown"} />
          </Button>
        </div>
        <div  style={{ display: "flex", gap: "4px" }}>
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
              copyBlockAfterCurrentBlock(getCurrentBlock().data);
            }}
          >
            <Svg type={"paste"} />
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
              removeCurrentBlock();
            }}
          >
            <Svg type={"trash"} />
          </Button>
        </div>
      </Menu>
    );
  };
  const TableBlockMenu = () => {
    return (
      <Menu name="표 속성">
      <div className={style.option}>
      <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 선</label>
        <div className={style.item}>
          <label>스타일</label>
            <Select
              onChange={(value: any) => {
                changeCurrentBlockData({ borderStyle: value });
                getCurrentBlock().data.table.forEach((row: any) => {
                  row.forEach((cell: any) => {
                    cell.borderStyle = value;
                  });
                });
                props.callPageReload();
                forcefullyReloadSidebar();
              }}
              style={{ fontSize: "12px" }}
              selectedValue={getCurrentBlock().data.borderStyle}
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
        <div className={style.item}>
          <label>굵기</label>
            <input
            type="range"
            min="0"
            max="10"
            step="1"
            defaultValue={getCurrentBlock().data.borderWidth ?? 1}
            style={{ width: "50%" }}
            onChange={(e) => {
              const borderWidth = parseFloat(e.target.value);
              changeCurrentBlockData({ borderWidth : borderWidth });
                getCurrentBlock().data.table.forEach((row: any) => {
                  row.forEach((cell: any) => {
                    cell.borderWidth = parseFloat(e.target.value);
                  });
                });
              props.callPageReload();
              const borderWidthDisplay = document.getElementById("borderWidthDisplay");
              if (borderWidthDisplay) {
                borderWidthDisplay.innerText = e.target.value;
              }
            }}
            />
        <label id="borderWidthDisplay" >{getCurrentBlock().data.borderWidth ?? 1}</label>
        </div>
        <div className={style.item}>
          <label>색상</label>
          <datalist id="list">
            <option>#000000</option>
            <option>#333333</option>
            <option>#666666</option>
            <option>#999999</option>
            <option>#cccccc</option>
            <option>#ffffff</option>
            <option>#ff6464</option>
            <option>#ff0000</option>
            <option>#ff3333</option>
            <option>#ff6666</option>
            <option>#ff9999</option>
            <option>#ffcccc</option>
            <option>#ffe1e1</option>
            <option>#00ff00</option>
            <option>#33ff33</option>
            <option>#66ff66</option>
            <option>#99ff99</option>
            <option>#ccffcc</option>
            <option>#e1ffe1</option>
            <option>#0000ff</option>
            <option>#3333ff</option>
            <option>#6666ff</option>
            <option>#9999ff</option>
            <option>#ccccff</option>
            <option>#e1e1ff</option>
          </datalist>
          <input
            style={{ width: "50%" }}
            list = "list"
            onChange={(e) => {
              if(e.target.value){
              changeCurrentBlockData({ borderColor: `${e.target.value}`});
                getCurrentBlock().data.table.forEach((row: any) => {
                  row.forEach((cell: any) => {
                    cell.borderColor = `${e.target.value}`;
                  });
                });
              }
              props.callPageReload();
              const borderColorDisplay = document.getElementById("borderColorDisplay");
              if (borderColorDisplay) {
                borderColorDisplay.innerText = e.target.value;
              }
            }}
            type="color"
            defaultValue={
              getCurrentBlock().data.borderColor ?? "#cccccc"
            }
          />
        <label id="borderColorDisplay" >{getCurrentBlock().data.borderColor}</label>
        </div>
      </div>
      <div className={style.option}>
      <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 셀</label>
        <div className={style.item}>
          <label>너비 (%)</label>
          <input
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue={getCurrentBlock().data.width ?? 100}
          style={{ width: "50%" }}
          onChange={(e) => {
            const fontWidth = parseFloat(e.target.value);
            changeCurrentBlockData({ width : fontWidth });
            props.callPageReload();
            const widthDisplay = document.getElementById("widthDisplay");
            if (widthDisplay) {
              widthDisplay.innerText = e.target.value;
            }
          }}
          />
        <label id="widthDisplay" >{getCurrentBlock().data.width ?? 100}</label>
        </div>
      </div>
        <div className={style.item}>
          <label>색상</label>
          <input
            style={{ width: "50%" }}
            list = "list"
            onChange={(e) => {
              if(e.target.value){
              changeCurrentBlockData({ backgroundColor: `${e.target.value}`});
                getCurrentBlock().data.table.forEach((row: any) => {
                  row.forEach((cell: any) => {
                    cell.backgroundColor = `${e.target.value}`;
                  });
                });
              }
              props.callPageReload();
              const backgroundColorDisplay = document.getElementById("backgroundColorDisplay");
              if (backgroundColorDisplay) {
                backgroundColorDisplay.innerText = e.target.value;
              }
            }}
            type="color"
            defaultValue={getCurrentBlock().data.backgroundColor ?? "#cccccc"}
          />
        <label id="backgroundColorDisplay" >{getCurrentBlock().data.backgroundColor}</label>
        </div>
      <div className={style.option}>
      <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 글자</label>
        <div className={style.item}>
          <label>정렬</label>
          <div className={style.align}>
            <div className={style.align_options}>
              <div
                className={style.option}
                onClick={() => {
                  changeCurrentBlockData({ align: "left" });
                  getCurrentBlock().data.table.forEach((row: any) => {
                    row.forEach((cell: any) => {
                      cell.align = "left";
                    });
                  });
                  props.callPageReload();
                  }}
              >
                <Svg type={"alignLeft"} />
              </div>
              <div
                className={style.option}
                onClick={() => {
                  changeCurrentBlockData({ align: "center" });
                  getCurrentBlock().data.table.forEach((row: any) => {
                    row.forEach((cell: any) => {
                      cell.align = "center";
                    });
                  });
                  props.callPageReload();
                }}
              >
                <Svg type={"alignCenter"} />
              </div>
              <div
                className={style.option}
                onClick={() => {
                  changeCurrentBlockData({ align: "right" });
                  getCurrentBlock().data.table.forEach((row: any) => {
                    row.forEach((cell: any) => {
                      cell.align = "right";
                    });
                  });
                  props.callPageReload();
                }}
              >
                <Svg type={"alignRight"} />
              </div>
            </div>
          </div>
        </div>
        <div className={style.item}>
          <label>굵기</label>
            <input
            type="range"
            min="100"
            max="900"
            step="100"
            defaultValue={getCurrentBlock().data.fontWeight ?? 400}
            style={{ width: "50%" }}
            onChange={(e) => {
              const fontWeight = e.target.value;
              changeCurrentBlockData({ fontWeight });
              props.callPageReload();
              const fontWeightDisplay = document.getElementById("fontWeightDisplay");
              if (fontWeightDisplay) {
              fontWeightDisplay.innerText = fontWeight;
              }
            }}
            />
          <label id="fontWeightDisplay">{getCurrentBlock().data.fontWeight ?? 400}</label>
        </div>
        <div className={style.item}>
          <label>크기</label>
          {/* <input
            type="number"
            placeholder=""
            defaultValue={parseInt(getCurrentBlock()?.data?.fontSize) || ""}
            onChange={(e) => {
              changeCurrentBlockData({ fontSize: `${e.target.value}px` });
              props.callPageReload();
            }}
          /> */}
          <input
          type="range"
          min="0"
          max="200"
          step="1"
          defaultValue={parseInt(getCurrentBlock()?.data?.fontSize) || "14px"}
          style={{ width: "50%" }}
          onChange={(e) => {
            const fontSize = `${e.target.value}px`;
            changeCurrentBlockData({ fontSize });
            props.callPageReload();
            const fontSizeDisplay = document.getElementById("fontSizeDisplay");
            if (fontSizeDisplay) {
              fontSizeDisplay.innerText = fontSize;
            }
          }}
          />
        <label id="fontSizeDisplay" >{getCurrentBlock().data.fontSize ?? "14px"}</label>
        </div>
      </div>
      <div className={style.option}>
        <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 행렬</label>
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
              addToCurrentColumn();
              props.callPageReload();
            }}
          >
            {<Svg type={"tableInsertRight"} />}
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
              addToCurrentRow();
              props.callPageReload();
            }}
          >
            {<Svg type={"tableInsertDown"} />}
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
              removeCurrentColumn();
              props.callPageReload();
            }}
          >
            {<Svg type={"tableDeleteColumn"} />}
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
              removeCurrentRow();
              props.callPageReload();
            }}
          >
            {<Svg type={"tableDeleteRow"} />}
          </Button>
        </div>
      </div>
      </Menu>
    );
  };
  const TableCellMenu = () => {
    return (
      <>
        <Menu name="셀">
        <div className={style.item}>
          <label>스타일</label>
            <Select
              onChange={(value: any) => {
                changeCurrentCell({ borderStyle: value });
                getCurrentCell().borderStyle = value;
                props.callPageReload();
                forcefullyReloadSidebar();
              }}
              style={{ fontSize: "12px" }}
              selectedValue={getCurrentCell().borderStyle}
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
        <div className={style.item}>
          <label>선 굵기</label>
          <input
            type="number"
            onChange={(e) => {
              if(e.target.value){
                changeCurrentCell({ borderWidth: parseFloat(e.target.value)});
                getCurrentCell().borderWidth = parseFloat(e.target.value);
              }
              props.callPageReload();
            }}
            defaultValue={getCurrentBlock().data.borderWidth ?? 1}
          />
        </div>
        <div className={style.item}>
          <label>선 색상</label>
          <input
            onChange={(e) => {
              if(e.target.value){
                changeCurrentCell({ borderColor: `${e.target.value}`});
                getCurrentCell().borderColor = `${e.target.value}`;
                }
              props.callPageReload();
            }}
            type="color"
            defaultValue={getCurrentCell().borderColor ?? "#cccccc"}
          />
        </div>
        <div className={style.item}>
          <label>배경 색상</label>
          <input
            onChange={(e) => {
              if(e.target.value){
                changeCurrentCell({ backgroundColor: `${e.target.value}`});
                getCurrentCell().backgroundColor = `${e.target.value}`;
                }
              props.callPageReload();
            }}
            type="color"
            defaultValue={getCurrentCell().backgroundColor ?? "#cccccc"}
          />
        </div>
          <div className={style.item}>
            <label>셀 정렬</label>
            <div className={style.align}>
              <div className={style.align_options}>
                <div
                  className={style.option}
                  onClick={() => {
                    changeCurrentCell({ align: "left" });
                    props.callPageReload();
                  }}
                >
                  <Svg type={"alignLeft"} />
                </div>
                <div
                  className={style.option}
                  onClick={() => {
                    changeCurrentCell({ align: "center" });
                    props.callPageReload();
                  }}
                >
                  <Svg type={"alignCenter"} />
                </div>
                <div
                  className={style.option}
                  onClick={() => {
                    changeCurrentCell({ align: "right" });
                    props.callPageReload();
                  }}
                >
                  <Svg type={"alignRight"} />
                </div>
              </div>
            </div>
          </div>
          <div className={style.item}>
            <label>비율</label>
            <Select
              onChange={(value: any) => {
                setCurrentCellColumn(value);
                props.callPageReload();
              }}
              style={{ fontSize: "12px" }}
              selectedValue={getCurrentCellColumn()}
              appearence="flat"
              options={[
                { text: "1", value: 1 },
                { text: "2", value: 2 },
                { text: "3", value: 3 },
                { text: "4", value: 4 },
                { text: "5", value: 5 },
                { text: "6", value: 6 },
                { text: "7", value: 7 },
                { text: "8", value: 8 },
                { text: "9", value: 9 },
                { text: "10", value: 10 },
                { text: "11", value: 11 },
                { text: "12", value: 12 },
                { text: "13", value: 13 },
                { text: "14", value: 14 },
                { text: "15", value: 15 },
                { text: "16", value: 16 },
                { text: "17", value: 17 },
                { text: "18", value: 18 },
                { text: "19", value: 19 },
                { text: "20", value: 20 },
              ]}
            />
          </div>
          <div className={style.item}>
            <label>셀 타입</label>
            <Select
              onChange={(value: any) => {
                changeCurrentCell({ type: value });
                props.callPageReload();
                forcefullyReloadSidebar();
              }}
              style={{ fontSize: "12px" }}
              selectedValue={getCurrentCell()?.type}
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
          <div className={style.item}>
            <label>헤더</label>
            <ToggleSwitch
              defaultChecked={getCurrentCell()?.isHeader}
              onChange={(e: boolean) => {
                changeCurrentCell({ isHeader: e });
                props.callPageReload();
              }}
            />
          </div>
          <div className={style.item}>
            <label>텍스트 크기</label>
            <input
              onChange={(e) => {
                changeCurrentCell({ fontSize: `${e.target.value}px` });
                props.callPageReload();
              }}
              placeholder=""
              type="number"
              defaultValue={parseInt(getCurrentCell()?.fontSize) || ""}
            />
          </div>
          <div className={style.item}>
            <label>셀 병합(가로)</label>
            <input
              onChange={(e) => {
                if (e.target.value) {
                  changeCurrentCell({ colSpan: parseInt(e.target.value) });
                  props.callPageReload();
                }
              }}
              type="number"
              defaultValue={getCurrentCell()?.colSpan}
            />
          </div>
          <div className={style.item}>
            <label>셀 병합(세로)</label>
            <input
              onChange={(e) => {
                if (e.target.value) {
                  changeCurrentCell({ rowSpan: parseInt(e.target.value) });
                  props.callPageReload();
                }
              }}
              type="number"
              defaultValue={getCurrentCell()?.rowSpan}
            />
          </div>
          {getCurrentCell()?.type === "checkbox" && (
            <>
              <div className={style.item}>
                <label>이름</label>
                <input
                  type="text"
                  defaultValue={getCurrentCell()?.name}
                  onChange={(e) => {
                    changeCurrentCell({ name: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
              <div className={style.item}>
                <label>시작 시간</label>
                <input
                  type="time"
                  defaultValue={
                    getCurrentCell().timeRangeStart ??
                    getCurrentBlock().data.table[
                      getCurrentCellIndex().row
                    ].filter((o: any) => o.type === "timeRange")[0]
                      ?.timeRangeStart ??
                    "00:00"
                  }
                  onChange={(e) => {
                    changeCurrentCell({ timeRangeStart: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
              <div className={style.item}>
                <label>끝 시간</label>
                <input
                  type="time"
                  defaultValue={
                    getCurrentCell().timeRangeEnd ??
                    getCurrentBlock().data.table[
                      getCurrentCellIndex().row
                    ].filter((o: any) => o.type === "timeRange")[0]
                      ?.timeRangeEnd ??
                    "00:00"
                  }
                  onChange={(e) => {
                    changeCurrentCell({ timeRangeEnd: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
            </>
          )}
          {getCurrentCell()?.type === "timeRange" && (
            <>
              <div className={style.item}>
                <label>시작 시간</label>
                <input
                  type="time"
                  defaultValue={getCurrentCell()?.timeRangeStart}
                  onChange={(e) => {
                    changeCurrentCell({ timeRangeStart: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
              <div className={style.item}>
                <label>끝 시간</label>
                <input
                  type="time"
                  defaultValue={getCurrentCell()?.timeRangeEnd}
                  onChange={(e) => {
                    changeCurrentCell({ timeRangeEnd: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
            </>
          )}
          {getCurrentCell()?.type === "time" && (
            <div className={style.item}>
              <label>시간</label>
              <input type="time" />
            </div>
          )}
          {getCurrentCell()?.type === "input" && (
            <>
              <div className={style.item}>
                <label>이름</label>
                <input
                  type="text"
                  defaultValue={getCurrentCell()?.name}
                  onChange={(e) => {
                    changeCurrentCell({ name: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
              <div className={style.item}>
                <label>응답 예시</label>
                <input
                  type="text"
                  defaultValue={getCurrentCell()?.placeholder}
                  onChange={(e) => {
                    changeCurrentCell({ placeholder: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
              <div className={style.item}>
                <label>필수</label>
                <ToggleSwitch
                  defaultChecked={getCurrentCell()?.required}
                  onChange={(e: boolean) => {
                    changeCurrentCell({ required: e });
                    props.callPageReload();
                  }}
                />
              </div>
            </>
          )}
          {getCurrentCell()?.type === "select" && (
            <div>
              <label style={{ flex: "1 1 0" }} className={style.name}>
                옵션
              </label>
              <div className={style.item}>
                <label>이름</label>
                <input
                  type="text"
                  defaultValue={getCurrentCell()?.name}
                  onChange={(e) => {
                    changeCurrentCell({ name: e.target.value });
                    props.callPageReload();
                  }}
                />
              </div>
              <div className={style.options}>
                {getCurrentCell()?.options?.map((value: any) => {
                  return (
                    <div className={style.item} key={value.id}>
                      <span>
                        <input
                          type="text"
                          defaultValue={value.text}
                          onChange={(e) => {
                            const index = getCurrentCell().options.findIndex(
                              (obj: any) => obj.id === value.id
                            );
                            getCurrentCell().options[index] = Object.assign(
                              getCurrentCell().options[index],
                              { text: e.target.value }
                            );
                            props.callPageReload();
                          }}
                        />
                      </span>
                      <span>|</span>
                      <span>
                        <input
                          type="text"
                          defaultValue={value.value}
                          onChange={(e) => {
                            const index = getCurrentCell().options.findIndex(
                              (obj: any) => obj.id === value.id
                            );
                            getCurrentCell().options[index] = Object.assign(
                              getCurrentCell().options[index],
                              { value: e.target.value }
                            );
                            props.callPageReload();
                          }}
                        />
                      </span>
                      <span
                        style={{ minWidth: "24px" }}
                        onClick={() => {
                          getCurrentCell().options =
                            getCurrentCell()?.options?.filter(
                              (val: any) => val.id !== value.id
                            );
                          props.callPageReload();
                          forcefullyReloadSidebar();
                        }}
                      >
                        <Svg width="24px" type={"x"} />
                      </span>
                    </div>
                  );
                })}
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
                  if (isArray(getCurrentCell().options)) {
                    getCurrentCell().options.push({
                      id: generateId(12),
                      text: "필드",
                      value: "값",
                    });
                  } else {
                    getCurrentCell().options = [
                      {
                        id: generateId(12),
                        text: "필드",
                        value: "값",
                      },
                    ];
                  }
                  props.callPageReload();
                  forcefullyReloadSidebar();
                }}
              >
                option 추가
              </Button>
            </div>
          )}
          {getCurrentCell()?.type === "data" && (
            <DataConnPopup callPageReload={props.callPageReload} />
          )}
        </Menu>
      </>
    );
  };
  const InputBlockMenu = () => {
    return (
      <Menu name="입력">
        <div className={style.item}>
          <label>이름</label>
          <input
            type="text"
            defaultValue={getCurrentBlock().data.name}
            onChange={(e) => {
              changeCurrentBlockData({ name: e.target.value });
            }}
          />
        </div>
        <div className={style.item}>
          <label>라벨</label>
          <input
            type="text"
            defaultValue={getCurrentBlock().data.label}
            onChange={(e) => {
              changeCurrentBlockData({ label: e.target.value });
              props.callPageReload();
            }}
          />
        </div>
        <div className={style.item}>
          <label>응답 예시</label>
          <input
            type="text"
            defaultValue={getCurrentBlock().data?.placeholder}
            onChange={(e) => {
              changeCurrentBlockData({ placeholder: e.target.value });
              props.callPageReload();
            }}
          />
        </div>
        <div className={style.item}>
          <label>텍스트 크기</label>
          <input
            type="number"
            placeholder=""
            defaultValue={parseInt(getCurrentBlock()?.data?.fontSize) || ""}
            onChange={(e) => {
              changeCurrentBlockData({ fontSize: `${e.target.value}px` });
              props.callPageReload();
            }}
          />
        </div>
        <div className={style.item}>
          <label>필수</label>
          <ToggleSwitch
            defaultChecked={getCurrentBlock().data?.required}
            onChange={(b) => {
              changeCurrentBlockData({ required: b });
              props.callPageReload();
            }}
          />
        </div>
      </Menu>
    );
  };
  const TextMenu = () => {
    return (
      <Menu name="텍스트">
        <div className={style.item}>
          <label>크기</label>
          <input
            type="number"
            placeholder=""
            defaultValue={parseInt(getCurrentBlock()?.data?.fontSize) || ""}
            onChange={(e) => {
              changeCurrentBlockData({ fontSize: `${e.target.value}px` });
              props.callPageReload();
            }}
          />
        </div>
        <div className={style.item}>
          <label>정렬</label>
          <div className={style.align}>
            <div className={style.align_options}>
              <div
                className={style.option}
                onClick={() => {
                  changeCurrentBlockData({ textAlign: "left" });
                  props.callPageReload();
                }}
              >
                <Svg type={"alignLeft"} />
              </div>
              <div
                className={style.option}
                onClick={() => {
                  changeCurrentBlockData({ textAlign: "center" });
                  props.callPageReload();
                }}
              >
                <Svg type={"alignCenter"} />
              </div>
              <div
                className={style.option}
                onClick={() => {
                  changeCurrentBlockData({ textAlign: "right" });
                  props.callPageReload();
                }}
              >
                <Svg type={"alignRight"} />
              </div>
            </div>
          </div>
        </div>
        <div className={style.item}>
          <label>볼드</label>
          <Select
            onChange={(value: any) => {
              changeCurrentBlockData({ fontWeight: value });
              props.callPageReload();
            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentBlock().data.fontWeight}
            appearence="flat"
            options={[
              { text: "100", value: 100 },
              { text: "200", value: 200 },
              { text: "300", value: 300 },
              { text: "400", value: 400 },
              { text: "500", value: 500 },
              { text: "600", value: 600 },
              { text: "700", value: 700 },
              { text: "800", value: 800 },
              { text: "900", value: 900 },
            ]}
          />
        </div>
        {/* <div className={style.item}>
          <label>배경색</label>
        </div>
        */}
      </Menu>
    );
  };

  return (
    <div
      className={style.sidebar_container}
      // onMouseEnter={() => {
      //   // console.log("a");
      // }}
      // onMouseLeave={() => {
      //   // console.log("aa");
      // }}
    >
      <div className={style.sidebar}>
        <AddBlockMenu />
        {getCurrentBlock()?.type === "table" && <TableBlockMenu />}
        {getCurrentBlock()?.type === "table" && getCurrentCell() && (
          <TableCellMenu />
        )}
        {getCurrentBlock()?.type === "dataTable" && <DatatableMenu />}
        {getCurrentBlock()?.type === "input" && <InputBlockMenu />}
        {getCurrentBlock()?.type === "paragraph" && <TextMenu />}
      </div>
    </div>
  );
};

export default Sidebar;
