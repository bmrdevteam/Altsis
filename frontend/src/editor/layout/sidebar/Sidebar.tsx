import React, { useEffect, useRef, useState } from "react";
import Svg from "../../../assets/svg/Svg";
import Button from "../../../components/button/Button";
import Popup from "../../../components/popup/Popup";
import Select from "../../../components/select/Select";
import ToggleSwitch from "../../../components/toggleSwitch/ToggleSwitch";
import style from "../../editor.module.scss";
import { useEditor } from "../../functions/editorContext";
import useEditorStore from "../../functions/useEditorStore";
import DatatableMenu from "./DatatableMenu";
import Menu from "./Menu";

type Props = {
  callPageReload: () => void;
};

const Sidebar = (props: Props) => {
  const {
    getCurrentBlock,
    changeCurrentBlockType,
    changeCurrentBlockData,
    setReloadEditorData,
    changeCurrentCell,
    setCurrentCellColumn,
    removeCurrentBlock,
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
      console.log(getCurrentBlock());
    }
  };

  const [addNewBlockType, setAddNewBlockType] = useState<string>("paragraph");
  const blockTypes = [
    { text: "텍스트", value: "paragraph" },
    { text: "Data 텍스트", value: "dataText" },
    { text: "테이블", value: "table" },
    { text: "Data 테이블", value: "dataTable" },
    { text: "select", value: "select" },
    { text: "Data select", value: "dataSelect" },
    { text: "선", value: "divider" },
    { text: "[input]", value: "input" },
  ];

  const AddBlockMenu = () => {
    return (
      <Menu name="블록 추가">
        <div className={style.item}>
          <label>추가</label>
          <Select
            style={{ fontSize: "12px" }}
            appearence="flat"
            onChangeWithClick={(value: string) => {
              setAddNewBlockType(value);
            }}
            selectedValue={addNewBlockType}
            options={blockTypes}
          />
        </div>
        <Button
          type="ghost"
          style={{
            marginTop: "8px",
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={() => {
            addBlockAfterCurrentBlock(addNewBlockType);
          }}
        >
          추가
        </Button>
      </Menu>
    );
  };

  const BlockMenu = () => {
    return (
      <Menu name="블록">
        <div className={style.item}>
          <label>{getCurrentBlock()?.id}</label>
        </div>
        <div className={style.item}>
          <label>타입</label>
          <Select
            onChangeWithClick={(value: any) => {
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
          <label>분할</label>
          <input onChange={(e) => {}} type="text" defaultValue={"100%"} />
        </div>
        <Button
          type="ghost"
          style={{
            marginTop: "8px",
            borderRadius: "4px",
            height: "32px",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 1px 2px 0px",
          }}
          onClick={() => {
            removeCurrentBlock();
          }}
        >
          삭제
        </Button>
      </Menu>
    );
  };

  const TableBlockMenu = () => {
    return (
      <Menu name="테이블">
        {/* <div className={style.item}>
          <label>테두리</label>
          <input type="text" defaultValue={1} />
        </div>
        <div className={style.item}>
          <label>테두리 색상</label>
          <input type="color" defaultValue={1} />
        </div> */}

        <div className={style.item}>
          <label>column 비율</label>
          <Select
            onChangeWithClick={(value: any) => {
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
            행 추가
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
            열 추가
          </Button>
        </div>
      </Menu>
    );
  };
  const TableCellMenu = () => {
    return (
      <Menu name="셀">
        <div className={style.item}>
          <label>셀 타입</label>
          <Select
            onChangeWithClick={(value: any) => {
              changeCurrentCell({ type: value });
              props.callPageReload();
              forcefullyReloadSidebar();
            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentCell()?.type}
            appearence="flat"
            options={[
              { text: "텍스트", value: "paragraph" },
              { text: "time", value: "time" },
              { text: "timeRange", value: "timeRange" },
              { text: "체크박스", value: "checkbox" },
              { text: "[input]", value: "input" },
              { text: "[select]", value: "select" },
            ]}
          />
        </div>
        <div className={style.item}>
          <label>헤더</label>
          <ToggleSwitch
            defaultChecked={getCurrentCell()?.isHeader}
            onChange={(e:any) => {
              changeCurrentCell({ isHeader: e.target.checked });

              props.callPageReload();
            }}
          />
        </div>

        <div className={style.item}>
          <label>셀 정렬</label>
          <Select
            onChangeWithClick={(value: any) => {
              changeCurrentCell({ align: value });
              props.callPageReload();
            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentCell()?.align}
            appearence="flat"
            options={[
              { text: "왼쪽", value: "left" },
              { text: "가운데", value: "center" },
              { text: "오른쪽", value: "right" },
            ]}
          />
        </div>
        <div className={style.item}>
          <label>셀 colSpan</label>
          <input
            onChange={(e) => {
              if (e.target.value) {
                changeCurrentCell({ colSpan: parseInt(e.target.value) });
                props.callPageReload();
              }
            }}
            type="text"
            defaultValue={getCurrentCell()?.colSpan}
          />
        </div>
        <div className={style.item}>
          <label>셀 rowSpan</label>
          <input
            onChange={(e) => {
              if (e.target.value) {
                changeCurrentCell({ rowSpan: parseInt(e.target.value) });
                props.callPageReload();
              }
            }}
            type="text"
            defaultValue={getCurrentCell()?.갲Span}
          />
        </div>
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
              removeCurrentColumn();
              props.callPageReload();
            }}
          >
            행 삭제
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
            열 삭제
          </Button>
        </div>
      </Menu>
    );
  };
  const InputBlockMenu = () => {
    return (
      <Menu name="input">
        <div className={style.item}>
          <label>레이블</label>
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
          <label>placeholder</label>
          <input
            type="text"
            defaultValue={getCurrentBlock().data.placeholder}
            onChange={(e) => {
              changeCurrentBlockData({ placeholder: e.target.value });
              props.callPageReload();
            }}
          />
        </div>
        <div className={style.item}>
          <label>필수</label>
          <ToggleSwitch
            defaultChecked={getCurrentBlock().data.required}
            onChange={(e: any) => {
              changeCurrentBlockData({ required: e.target.checked });
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
          <select onChange={(e) => {}}>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
          </select>
        </div>
        <div className={style.item}>
          <label>정렬</label>
          <div className={style.align}>
            <div className={style.options}>
              <div
                className={style.option}
                onClick={() => {
                  // editor.align("left");
                }}
              >
                <Svg type={"alignLeft"} />
              </div>
              <div
                className={style.option}
                onClick={() => {
                  // editor.align("center");
                }}
              >
                <Svg type={"alignCenter"} />
              </div>
              <div
                className={style.option}
                onClick={() => {
                  // editor.align("right");
                }}
              >
                <Svg type={"alignRight"} />
              </div>
            </div>
          </div>
        </div>
        <div className={style.item}>
          <label></label>
        </div>
        <div className={style.item}>
          <label>배경색</label>
        </div>
        <div className={style.item}>
          <label>크기</label>
        </div>
      </Menu>
    );
  };

  return (
    <div className={style.sidebar_container}>
      <div className={style.sidebar}>
        <AddBlockMenu />
        {getCurrentBlock() && <BlockMenu />}
        {getCurrentBlock()?.type === "table" && <TableBlockMenu />}
        {getCurrentBlock()?.type === "table" && getCurrentCell() && (
          <TableCellMenu />
        )}
        {getCurrentBlock()?.type === "dataTable" && <DatatableMenu />}
        {getCurrentBlock()?.type === "input" && <InputBlockMenu />}
        <TextMenu />
      </div>
    </div>
  );
};

export default Sidebar;
