import React, { useEffect, useState } from "react";
import Svg from "../../../assets/svg/Svg";
import Select from "../../select/Select";
import style from "../editor.module.scss";

import { useEditorFunctions } from "../context/editorContext";
import { useParams } from "react-router-dom";
import ToggleSwitch from "../../toggleSwitch/ToggleSwitch";

/**
 *
 * @param param0
 *
 *
 * @returns
 */
function Sidebar({ children }: { children: JSX.Element }) {
  const { editor } = useEditorFunctions();
  const { pid } = useParams();
  const [currentBlockId, setCurrentBlockId] = useState<string>();
  useEffect(() => {
    editor.result() &&
    setCurrentBlockId(`${pid}-${editor.result()[0].id}`);
    return () => {};
  }, []);

  // useEffect(() => {
  //   document.addEventListener("mousedown", (e) => {
  //     // e.preventDefault();
  //     console.log(e);
  //   });

  //   return () => {
  //     document.removeEventListener("mousedown", (e) => {
  //       // e.preventDefault();

  //       console.log(e);
  //     });
  //   };
  // }, []);

  return (
    <>
      <div className={style.sidebar_container}>
        <div className={style.sidebar}>
          <div className={style.menu}>
            <div className={style.name}>블록</div>
            <div className={style.content}>
              <div className={style.item}>
                <label>{currentBlockId}</label>
              </div>
              <div className={style.item}>
                <label>타입</label>
                <Select
                  onChangeWithClick={(value: string) => {
                    editor.changeBlockType({
                      blockId: currentBlockId,
                      type: value,
                    });
                  }}
                  style={{ fontSize: "12px" }}
                  selectedValue={editor.getBlock(currentBlockId)?.type}
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

              {editor.getBlock(currentBlockId)?.type === "table" && (
                <>
                  <div className={style.item}>
                    <label>테두리</label>
                    <input type="text" defaultValue={1} />
                  </div>
                  <div className={style.item}>
                    <label>테두리 색상</label>
                    <input type="text" defaultValue={1} />
                  </div>
                </>
              )}
              {editor.getBlock(currentBlockId)?.type === "input" && (
                <>
                  <div className={style.item}>
                    <label>레이블</label>
                    <input type="text" defaultValue={"입력"} />
                  </div>
                  <div className={style.item}>
                    <label>placehodler</label>
                    <input
                      type="text"
                      defaultValue={"입력하세요"}
                      onChange={(e) => {
                        editor.changeBlockData({
                          blockId: currentBlockId,
                          data: {
                            placeholder: e.target.value,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className={style.item}>
                    <label>필수</label>
                    <ToggleSwitch
                      defaultChecked
                      onChange={(e: any) => {
                        editor.changeBlockData({
                          blockId: currentBlockId,
                          data: {
                            required: e.target.checked,
                          },
                        });
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={style.menu}>
            <div className={style.name}>텍스트</div>
            <div className={style.content}>
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
                        editor.align("left");
                      }}
                    >
                      <Svg type={"alignLeft"} />
                    </div>
                    <div
                      className={style.option}
                      onClick={() => {
                        editor.align("center");
                      }}
                    >
                      <Svg type={"alignCenter"} />
                    </div>
                    <div
                      className={style.option}
                      onClick={() => {
                        editor.align("right");
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

              <div
                className={style.item}
                onClick={() => {
                  editor.test();
                }}
              >
                <label>배경색</label>
              </div>
              <div className={style.item}>
                <label>크기</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        // onFocus={(e) => {
        //   if (e.target.contentEditable === "true") {
        //     setCurrentBlockId(e.target.id);
        //   }
        // }}
        onClick={() => {
          setCurrentBlockId(editor.currentBlock().currentBlockId);
        }}
      >
        {children}
      </div>
    </>
  );
}

export default Sidebar;
