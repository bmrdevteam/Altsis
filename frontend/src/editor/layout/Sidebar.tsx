import React, { useEffect, useRef, useState } from "react";
import Svg from "../../assets/svg/Svg";
import Button from "../../components/button/Button";
import Select from "../../components/select/Select";
import ToggleSwitch from "../../components/toggleSwitch/ToggleSwitch";
import style from "../editor.module.scss";
import { useEditor } from "../functions/editorContext";

type Props = {
  callPageReload: () => void;
};

const Sidebar = (props: Props) => {
  const {
    getCurrentBlock,
    changeCurrentBlockType,
    changetCurrentBlockData,
    setReloadEditorData,
    getCurrentCell,
    addBlockAfterCurrentBlock,
    editorPageRef,
  } = useEditor();

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
      forcefullyReloadSidebar()
    }
  };


  console.log("sidebar reloaded");

  const [addNewBlockType, setAddNewBlockType] = useState<string>("paragraph");

  const Menu = ({
    children,
    name,
  }: {
    children: React.ReactNode | React.ReactNode[];
    name: string;
  }) => {
    return (
      <div className={style.menu}>
        <div className={style.name}>{name}</div>
        <div className={style.content}>{children}</div>
      </div>
    );
  };
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
            options={[
              { text: "텍스트", value: "paragraph" },
              { text: "테이블", value: "table" },
              { text: "선", value: "divider" },
              { text: "[input]", value: "input" },
              { text: "[select]", value: "select" },
            ]}
          />
        </div>
        <Button
          type="ghost"
          styles={{
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
              forcefullyReloadSidebar()
            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentBlock()?.type}
            appearence="flat"
            options={[
              { text: "텍스트", value: "paragraph" },
              { text: "테이블", value: "table" },
              { text: "선", value: "divider" },
              { text: "[input]", value: "input" },
              { text: "[select]", value: "select" },
            ]}
          />
        </div>
        <div className={style.item}>
          <label>분할</label>
          <input onChange={(e) => {}} type="text" defaultValue={"100%"} />
        </div>
      </Menu>
    );
  };

  const TableBlockMenu = () => {
    return (
      <Menu name="테이블">
        <div className={style.item}>
          <label>테두리</label>
          <input type="text" defaultValue={1} />
        </div>
        <div className={style.item}>
          <label>테두리 색상</label>
          <input type="color" defaultValue={1} />
        </div>
        <div className={style.item}>
          <label>셀 타입</label>
          <Select
            onChangeWithClick={(value: any) => {

              forcefullyReloadSidebar()
            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentCell()?.type}
            appearence="flat"
            options={[
              { text: "텍스트", value: "paragraph" },
              { text: "테이블", value: "table" },
              { text: "[checkbox]", value: "checkbox" },
              { text: "[input]", value: "input" },
            ]}
          />
        </div>
        <div className={style.item}>
          <label>셀 colSpan</label>
          <Select
            onChangeWithClick={(value: any) => {


            }}
            style={{ fontSize: "12px" }}
            selectedValue={getCurrentCell()?.data?.colSpan}
            appearence="flat"
            options={[
              { text: "5%", value: "1" },
              { text: "10%", value: "2" },
              { text: "15%", value: "3" },
              { text: "20%", value: "4" },
              { text: "25%", value: "5" },
              { text: "30%", value: "6" },
              { text: "35%", value: "7" },
              { text: "40%", value: "8" },
              { text: "45%", value: "9" },
              { text: "50%", value: "10" },
              { text: "55%", value: "11" },
              { text: "60%", value: "12" },
              { text: "65%", value: "13" },
              { text: "70%", value: "14" },
              { text: "75%", value: "15" },
              { text: "80%", value: "16" },
              { text: "85%", value: "17" },
              { text: "90%", value: "18" },
              { text: "95%", value: "19" },
              { text: "100%", value: "20" },
            ]}
          />
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
              changetCurrentBlockData({ label: e.target.value });
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
              changetCurrentBlockData({ placeholder: e.target.value });
              props.callPageReload();
            }}
          />
        </div>
        <div className={style.item}>
          <label>필수</label>
          <ToggleSwitch
            defaultChecked={getCurrentBlock().data.required}
            onChange={(e: any) => {
              changetCurrentBlockData({ required: e.target.checked });
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
        <BlockMenu />
        {getCurrentBlock()?.type === "table" && <TableBlockMenu />}
        {getCurrentBlock()?.type === "input" && <InputBlockMenu />}
        <TextMenu />
      </div>
    </div>
  );
};

export default Sidebar;
