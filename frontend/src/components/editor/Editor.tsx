import { RefObject, useEffect, useRef, useState } from "react";
import Svg from "../../assets/svg/Svg";
import Input from "../input/Input";
import Block from "./Block";
import style from "./editor.module.scss";
import SelectionMenu from "./menu/SelectionMenu";

import { IBlock } from "./type";

interface Props {
  auth: "read" | "edit";
  editorhook: any;
  initalData?: any;
  autoSave?: boolean;
}

const Editor = (props: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const [contextMenuPosition, setContextMenuPosition] = useState<number[]>([
    0, 0,
  ]);
  const [contextMenuActive, setContextMenuActive] = useState<boolean>(false);
  const [contextMenuId, setContextMenuId] = useState<string>();
  const contextMenuRef = useRef<HTMLDivElement>(null);

  function contextMenuController({
    position,
    ref,
    blockId,
  }: {
    position: number[];
    ref?: any;
    blockId?: string;
  }) {
    setContextMenuId(blockId);
    setContextMenuActive(true);
    setContextMenuPosition(position);
  }

  function handleMousedown(e: MouseEvent) {
    if (
      contextMenuRef.current &&
      !contextMenuRef.current.contains(e.target as Node)
    ) {
      setContextMenuActive(false);
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleMousedown);

    return () => {
      document.removeEventListener("mousedown", handleMousedown);
    };
  }, []);
  // const SelectionMenu = ({
  //   x,
  //   y,
  // }: {
  //   x: number | undefined;
  //   y: number | undefined;
  // }) => {
  //   return (
  //     <div
  //       className={style.selectionmenu}
  //       style={{
  //         top: `${y}px`,
  //         left: `${x}px`,
  //       }}
  //     >
  //       asdfas;dflkas;ldfkas;ldfklsa;dkfl;sdf
  //       <div className={style.menus}>
  //         <div className={style.menu}>dasdf</div>
  //         <div className={style.menu}>dasdf</div>
  //         <div className={style.menu}>dasdf</div>
  //       </div>
  //     </div>
  //   );
  // };

  const ContextMenu = ({ x, y }: { x: number; y: number }) => {
    return (
      <div
        ref={contextMenuRef}
        className={style.contextmenu}
        style={{
          top: `${y}px`,
          left: `${x}px`,
        }}
      >
        <div className={style.menus}>
          <input type="text" className={style.search} placeholder="검색" />
          <div className={style.menu}>
            <span className={style.icon}>
              <Svg type="text" />
            </span>
            <span className={style.text}>하이</span>
            <span className={style.more}>
              <Svg type="chevronRight" />
            </span>
          </div>

          <div className={style.menu}>
            <span className={style.icon}>
              <Svg type="edit" />
            </span>
            <span className={style.text}>속성</span>
            <span className={style.more}></span>
          </div>

          <div
            className={style.menu}
            onClick={() => {
              console.log(contextMenuId);
              props.editorhook.addBlock({
                insertAfter: props.editorhook.getBlockIndex(contextMenuId) +1,
              });
            }}
          >
            <span className={style.icon}>
              <Svg type="plus" />
            </span>
            <span className={style.text}>새로운 블록</span>
          </div>
          <div className={style.menu}>
            <span className={style.icon}>
              <Svg type="trash" />
            </span>
            <span className={style.text}>블록 삭제</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={style.editor_container} style={{ height: "100%" }}>
      <div className={style.editor} ref={editorRef}>
        {contextMenuActive && (
          <ContextMenu x={contextMenuPosition[0]} y={contextMenuPosition[1]} />
        )}
        <SelectionMenu containerRef={editorRef} />

        {props.editorhook.result()?.map((value: IBlock, index: number) => {
          return (
            <Block
              contextMenuController={contextMenuController}
              editorFunctions={props.editorhook}
              editorId={props.editorhook.editorData?.id}
              data={value}
              key={index}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Editor;
