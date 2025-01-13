import Tree, { TreeItem } from "components/tree/Tree";
import useGenerateId from "hooks/useGenerateId";
import { get, isArray } from "lodash";
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

  // toggle menu
  const [isAddBlockMenuExpanded, setIsAddBlockMenuExpanded] = useState(true);
  const [isTableBlockMenuExpanded, setIsTableBlockMenuExpanded] = useState(false);
  const [isTableCellMenuExpanded, setIsTableCellMenuExpanded] = useState(false);
  const [isTableCellTypeMenuExpanded, setIsTableCellTypeMenuExpanded] = useState(true);


  // // 이전 선택된 블록과 셀을 저장할 상태
  // const [previousSelection, setPreviousSelection] = useState<{
  //   blockId: string | null;
  //   cellId: string | null;
  // }>({
  //   blockId: null,
  //   cellId: null,
  // });
  document.onclick = (e) => {
    if (
      editorPageRef.current &&
      editorPageRef.current.contains(e.target as Node)
    ) {      
      // const currentBlock = getCurrentBlock();
      // const currentCell = getCurrentCell();

      // const currentBlockElement = document.getElementById(currentBlock?.id || "");
      // const currentCellElement = document.getElementById(currentCell?.id || "");

      // // 이전 선택된 요소 초기화
      // if (previousSelection.blockId) {
      //   const previousBlockElement = document.getElementById(previousSelection.blockId);
      //   if (previousBlockElement) {
      //     previousBlockElement.classList.remove("block-focus-within");
      //   }
      // }

      // if (previousSelection.cellId) {
      //   const previousCellElement = document.getElementById(previousSelection.cellId);
      //   if (previousCellElement) {
      //     previousCellElement.classList.remove("cell-focus-within");
      //   }
      // }

      // // 현재 선택된 요소 스타일 적용
      // if (currentBlockElement && currentCellElement) {
      //   currentBlockElement.classList.add("block-focus-within");
      //   currentCellElement.classList.add("cell-focus-within");
      // }

      // // 선택된 블록과 셀을 상태에 저장
      // setPreviousSelection({
      //   blockId: currentBlock?.id || null,
      //   cellId: currentCell?.id || null,
      // });

      forcefullyReloadSidebar();
    }
  };

  const blockTypes = [
    { text: "텍스트", value: "paragraph" },
    { text: "테이블", value: "table" },
    { text: "select", value: "select" },
    { text: "선", value: "divider" },
    { text: "입력", value: "input" },
  ];

  const BlockMenu = () => {
    const toggleAddBlockMenuExpand = () => {
      setIsAddBlockMenuExpanded((prev) => !prev);
    };
    return (
      <Menu name="블록">
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <button onClick={toggleAddBlockMenuExpand} style={{  fontWeight:"bold", fontSize:"14px", marginRight: "10px", border: "none", background: "none", cursor: "pointer" }}>
          {isAddBlockMenuExpanded ? "⠿ 블록" : "⠿ 블록"}
        </button>
      </div>
    {isAddBlockMenuExpanded && (
      <>
        <div className={style.item}>
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
        </>)}
      </Menu>
    );
  };

  const TableBlockMenu = () => {
    const toggleTableBlockMenuExpand = () => {
      setIsTableBlockMenuExpanded((prev) => !prev);
    };

    return (
      <Menu name="표 속성">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <button onClick={toggleTableBlockMenuExpand} style={{  fontWeight:"bold", fontSize:"14px", marginRight: "10px", border: "none", background: "none", cursor: "pointer" }}>
            {isTableBlockMenuExpanded ? "⠿ 표" : "⠿ 표"}
          </button>
        </div>
      {isTableBlockMenuExpanded && (
        <>
      <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 글자</label>
      <div className={style.option}>
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
              getCurrentBlock().data.table.forEach((row: any) => {
                row.forEach((cell: any) => {
                  cell.fontWeight = fontWeight;
                });
              });
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
          <input
          type="range"
          min="0"
          max="100"
          step="1"
          defaultValue={parseInt(getCurrentBlock()?.data?.fontSize) || "14px"}
          style={{ width: "50%" }}
          onChange={(e) => {
            const fontSize = `${e.target.value}px`;
            changeCurrentBlockData({ fontSize });
            getCurrentBlock().data.table.forEach((row: any) => {
              row.forEach((cell: any) => {
                cell.fontSize = fontSize;
              });
            });
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
            <option>#f5f5f5</option>
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
      <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 표</label>
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
            const width = parseFloat(e.target.value);
            changeCurrentBlockData({ width : width });
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
        </>)}
      </Menu>
    );
  };
  const TableCellMenu = () => {
    const toggleTableCellMenuExpand = () => {
      setIsTableCellMenuExpanded((prev) => !prev);
    };
    return (
      <>
        <Menu name="셀 속성">
        <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
          <button onClick={toggleTableCellMenuExpand} style={{  fontWeight:"bold", fontSize:"14px", marginRight: "10px", border: "none", background: "none", cursor: "pointer" }}>
            {isTableCellMenuExpanded ? "⠿ 셀" : "⠿ 셀"}
          </button>
        </div>
      {isTableCellMenuExpanded && (
        <>
        <div className={style.option}>
        <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 글자</label>
          <div className={style.item}>
            <label>정렬</label>
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
          <label>굵기</label>
            <input
            type="range"
            min="100"
            max="900"
            step="100"
            defaultValue={getCurrentCell().fontWeight ?? getCurrentBlock().data.fontWeight ?? 400}
            style={{ width: "50%" }}
            onChange={(e) => {
              const fontWeightCell = e.target.value;
              changeCurrentCell({ fontWeightCell });
              getCurrentCell().fontWeight = fontWeightCell;
              props.callPageReload();
              const fontWeightCellDisplay = document.getElementById("fontWeightCellDisplay");
              if (fontWeightCellDisplay) {
                fontWeightCellDisplay.innerText = fontWeightCell;
              }
            }}
            />
          <label id="fontWeightCellDisplay">{getCurrentCell().fontWeight ?? getCurrentBlock().data.fontWeight ?? 400}</label>
        </div>
          <div className={style.item}>
            <label>크기</label>
            {/* <input
              onChange={(e) => {
                changeCurrentCell({ fontSize: `${e.target.value}px` });
                props.callPageReload();
              }}
              placeholder=""
              type="number"
              defaultValue={parseInt(getCurrentCell()?.fontSize) || ""}
            /> */}
            <input
            type="range"
            min="0"
            max="100"
            step="1"
            defaultValue={parseInt(getCurrentCell()?.data?.fontSize) || parseInt(getCurrentBlock()?.data?.fontSize) || "14px"}
            style={{ width: "50%" }}
            onChange={(e) => {
              const fontSize = `${e.target.value}px`;
              changeCurrentCell({ fontSize });
              props.callPageReload();
              const fontSizeCellDisplay = document.getElementById("fontSizeCellDisplay");
              if (fontSizeCellDisplay) {
                fontSizeCellDisplay.innerText = fontSize;
              }
            }}
            />
            <label id="fontSizeCellDisplay" >{getCurrentCell().fontSize ?? getCurrentBlock()?.data?.fontSize ?? "14px"}</label>
          </div>
          <div className={style.item}>
            <label>헤더</label>
            <ToggleSwitch
              defaultChecked={getCurrentCell()?.isHeader}
              onChange={(e: boolean) => {
                if(e){
                  changeCurrentCell({ isHeader: e });
                  changeCurrentCell({ fontWeight : 600 });
                  changeCurrentCell({ align: "center" });
                  changeCurrentCell({ backgroundColor: "#f5f5f5"});
                } else {
                  changeCurrentCell({ isHeader: e });
                  changeCurrentCell({ fontWeight : getCurrentBlock().data.fontWeight ?? 400 });
                  changeCurrentCell({ align: getCurrentBlock().data.align ?? "left" });
                  changeCurrentCell({ backgroundColor: getCurrentBlock().data.backgroundColor ?? "#ffffff"});
                }
                props.callPageReload();
              }}
            />
          </div>
        </div>
        <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 선</label>
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
          <label>굵기</label>
          <input
          type="range"
          min="0"
          max="10"
          step="1"
          defaultValue={getCurrentCell().borderWidth ?? getCurrentBlock().data.borderWidth ?? 1}
          style={{ width: "50%" }}
          onChange={(e) => {
            const borderWidth = parseFloat(e.target.value);
            changeCurrentCell({ borderWidth : borderWidth });
            getCurrentCell().borderWidth = parseFloat(e.target.value);
            props.callPageReload();
            const borderWidthCellDisplay = document.getElementById("borderWidthCellDisplay");
            if (borderWidthCellDisplay) {
              borderWidthCellDisplay.innerText = e.target.value;
            }
          }}
          />
          <label id="borderWidthCellDisplay" >{getCurrentCell().borderWidth ?? getCurrentBlock().data.borderWidth ?? 1}</label>
        </div>
        <div className={style.item}>
          <label>색상</label>
          <datalist id="list">
            <option>#000000</option>
            <option>#333333</option>
            <option>#666666</option>
            <option>#999999</option>
            <option>#cccccc</option>
            <option>#f5f5f5</option>
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
                changeCurrentCell({ borderColor: `${e.target.value}`});
                getCurrentCell().borderColor = `${e.target.value}`;
              }
              props.callPageReload();
              const borderColorCellDisplay = document.getElementById("borderColorCellDisplay");
              if (borderColorCellDisplay) {
                borderColorCellDisplay.innerText = e.target.value;
              }
            }}
            type="color"
            defaultValue={
              getCurrentCell().borderColor ?? getCurrentBlock().data.borderColor ?? "#cccccc"
            }
          />
        <label id="borderColorCellDisplay" >{getCurrentCell().borderColor ?? getCurrentBlock().data.borderColor ?? "#cccccc"}</label>
          </div>
        <div className={style.option}>
          <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 셀</label>
        <div className={style.item}>
          <label>비율</label>
          <input
          type="range"
          min="0"
          max="20"
          step="1"
          defaultValue={getCurrentCellColumn() ?? 1}
          style={{ width: "50%" }}
          onChange={(e : any) => {
            const cellColumn = e.target.value;
            setCurrentCellColumn(cellColumn);
            props.callPageReload();
            const cellColumnDisplay = document.getElementById("cellColumnDisplay");
            if (cellColumnDisplay) {
              cellColumnDisplay.innerText = e.target.value;
            }
          }}
          />
          <label id="cellColumnDisplay" >{getCurrentCellColumn() ?? 1}</label>
          </div>
          <div className={style.item}>
            <label>색상</label>
          <input
            style={{ width: "50%" }}
            list = "list"
            onChange={(e) => {
              if(e.target.value){
                changeCurrentCell({ backgroundColor: `${e.target.value}`});
                getCurrentCell().backgroundColor = `${e.target.value}`;
              }
              props.callPageReload();
              const backgroundColorCellDisplay = document.getElementById("backgroundColorCellDisplay");
              if (backgroundColorCellDisplay) {
                backgroundColorCellDisplay.innerText = e.target.value;
              }
            }}
            type="color"
            defaultValue={
              getCurrentCell().backgroundColor ?? getCurrentBlock().data.backgroundColor ?? "#cccccc"
            }
          />
        <label id="backgroundColorCellDisplay" >{getCurrentCell().borderColor ?? getCurrentBlock().data.borderColor ?? "#cccccc"}</label>
          </div>
      <div className={style.option}>
        <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 행렬</label>
        <div style={{ display: "flex", gap: "4px" }}>
          <div className={style.item} style={{ flex: "1 1 0" }}>
          {<Svg type={"tableMergeHorizontal"} width="20px" height="20px"/>}
            <input
              min = "1"
              onChange={(e) => {
                if (e.target.value) {
                  changeCurrentCell({ colSpan: parseInt(e.target.value) });
                  props.callPageReload();
                }
              }}
              type="number"
              defaultValue={getCurrentCell()?.colSpan ?? 1}
            />
          </div>
          <div className={style.item} style={{ flex: "1 1 0" }}>
          {<Svg type={"tableMergeVertical"} width="20px" height="20px"/>}
            <input
              min = "1"
              onChange={(e) => {
                if (e.target.value) {
                  changeCurrentCell({ rowSpan: parseInt(e.target.value) });
                  props.callPageReload();
                }
              }}
              type="number"
              defaultValue={getCurrentCell()?.rowSpan ?? 1}
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
        </div>
        </>)}
        </Menu>
      </>
    );
  };
const TableCellTypeMenu = () => {
  const toggleTableCellTypeMenuExpand = () => {
    setIsTableCellTypeMenuExpanded((prev) => !prev);
  };
  return (
    <>
      <Menu name="셀 타입">
      <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <button onClick={toggleTableCellTypeMenuExpand} style={{  fontWeight:"bold", fontSize:"14px", marginRight: "10px", border: "none", background: "none", cursor: "pointer" }}>
          {isTableCellTypeMenuExpanded ? "⠿ 유형" : "⠿ 유형"}
        </button>
      </div>
    {isTableCellTypeMenuExpanded && (
      <>
      <div className={style.option}>
        {/* <label style={{ fontWeight:"bold", fontSize:"13px"}}>• 셀 타입</label> */}
          <div className={style.item}>
            {/* <label>셀 타입</label> */}
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
          </div>
        </>)}
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
      // }}
      // onMouseLeave={() => {
      // }}
    >
      <div className={style.sidebar}>
        <BlockMenu />
        {getCurrentBlock()?.type === "table" && <TableBlockMenu />}
        {getCurrentBlock()?.type === "table" && getCurrentCell() && (
          <TableCellMenu />
        )}
        {getCurrentBlock()?.type === "table" && getCurrentCell() && (
          <TableCellTypeMenu />
        )}
        {getCurrentBlock()?.type === "dataTable" && <DatatableMenu />}
        {getCurrentBlock()?.type === "input" && <InputBlockMenu />}
        {getCurrentBlock()?.type === "paragraph" && <TextMenu />}
      </div>
    </div>
  );
};

export default Sidebar;
