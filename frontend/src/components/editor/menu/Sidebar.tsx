import React from "react";
import Svg from "../../../assets/svg/Svg";
import Select from "../../select/Select";
import style from "../editor.module.scss";


type Props = {
  styleFunctions: {
    test: () => void;
    _init: () => void;
    bold: () => void;
    align: (x: "left" | "center" | "right") => void;
  };
};

/**
 *
 * @param param0
 *
 *
 * @returns
 */
function Sidebar({ styleFunctions }: Props) {
  return (
    <div className={style.sidebar_container}>
      <div className={style.sidebar}>
        <div className={style.menu}>
          <div className={style.name}>텍스트</div>
          <div className={style.content}>
            <div className={style.item}>
              <label>크기</label>
              <select
                onChange={(e) => {
                  // console.log(e.target.value);
                  document.execCommand("fontSize", false, e.target.value);
                  // let span = document.createElement("span");
                  // document.querySelectorAll("font").forEach(element => {
                  //   element.parentElement?.replaceChild(element,span)
                  // });

                  let range = window.getSelection()?.getRangeAt(0);
                  const oldConent = document.createTextNode(range!.toString());
                  const newElement = document.createElement("span");
                  newElement.style.fontSize = "12px";
                  newElement.append(oldConent);
                  range!.deleteContents();
                  range!.insertNode(newElement);
                }}
              >
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
                      styleFunctions.align("left");
                    }}
                  >
                    <Svg type={"alignLeft"} />
                  </div>
                  <div
                    className={style.option}
                    onClick={() => {
                      styleFunctions.align("center");
                    }}
                  >
                    <Svg type={"alignCenter"} />
                  </div>
                  <div
                    className={style.option}
                    onClick={() => {
                      styleFunctions.align("right");
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
                styleFunctions.test();
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
  );
}

export default Sidebar;
