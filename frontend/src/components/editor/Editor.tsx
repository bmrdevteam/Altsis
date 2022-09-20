/**
 * @file Editor component
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 * - Editor component
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import { useEffect, useRef, useState } from "react";
import Svg from "../../assets/svg/Svg";

import Block from "./Block";
import style from "./editor.module.scss";
import SelectionMenu from "./menu/SelectionMenu";
import Sidebar from "./menu/Sidebar";

import { IBlock } from "./type";
import useStyleFunctions from "./useStyleFunctions";

interface Props {
  auth: "read" | "edit";
  editorhook: any;
  autoSave?: boolean;
  editorId: string;
}
/**
 *
 * @param props
 *
 * @returns Editor component
 *
 * @version 1.1 fixes on selection menu component
 * @version 1.0 initial version
 *
 */
const Editor = (props: Props) => {
  /**
   *
   */
  const styleFunctions = useStyleFunctions();
  /**
   * ref obj for the editor contianer
   */
  const editorContainerRef = useRef<HTMLDivElement>(null);
  /**
   * REACT.RefObject
   * ref obj for the editor
   */
  const editorRef = useRef<HTMLDivElement>(null);

  /**
   * active state for the context menu component
   */
  const [contextMenuActive, setContextMenuActive] = useState<boolean>(false);
  /**
   * state for the position of the context menu component
   * default x, y : 0, 0
   */
  const [contextMenuPosition, setContextMenuPosition] = useState<number[]>([
    0, 0,
  ]);
  /**
   * state for the current blockId the context menu is modifying
   */
  const [contextMenuBlockId, setContextMenuBlockId] = useState<string>();
  /**
   * ref obj for the context menu
   */
  const contextMenuRef = useRef<HTMLDivElement>(null);

  function contextMenuController({
    position,
    blockId,
  }: {
    position: number[];
    blockId?: string;
  }) {
    setContextMenuBlockId(blockId);
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

  // const ContextMenuItem = ({ name }: { name: string }) => {
  //   return (
  //     <div
  //       className={style.menu}
  //       onClick={() => {
  //         console.log(contextMenuBlockId);
  //         props.editorhook.addBlock({
  //           insertAfter: props.editorhook.getBlockIndex(contextMenuBlockId) + 1,
  //         });
  //       }}
  //     >
  //       <span className={style.icon}>
  //         <Svg type="text" />
  //       </span>
  //       <span className={style.text}>블록 타입</span>
  //       <span className={style.more}>
  //         <Svg type="chevronRight" />
  //       </span>
  //       <div className={style.sub_menus}>
  //         <div className={style.sub_menu}>
  //           <span className={style.icon}>
  //             <Svg type="table" />
  //           </span>
  //           일반 텍스트
  //         </div>
  //         <div className={style.sub_menu}>테이블</div>
  //         <div className={style.sub_menu}>헤딩</div>
  //         <div className={style.sub_menu}>일다이</div>
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

          <div
            className={style.menu}
            onClick={() => {
              console.log(contextMenuBlockId);
              props.editorhook.addBlock({
                insertAfter:
                  props.editorhook.getBlockIndex(contextMenuBlockId) + 1,
              });
            }}
          >
            <span className={style.icon}>
              <Svg type="text" />
            </span>
            <span className={style.text}>블록 타입</span>
            <span className={style.more}>
              <Svg type="chevronRight" />
            </span>
            <div className={style.sub_menus}>
              <div className={style.sub_menu}>
                <span className={style.icon}>
                  <Svg type="table" />
                </span>
                일반 텍스트
              </div>
              <div className={style.sub_menu}>테이블</div>
              <div className={style.sub_menu}>헤딩</div>
              <div className={style.sub_menu}>일다이</div>
            </div>
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
              props.editorhook.addBlock({
                insertAfter:
                  props.editorhook.getBlockIndex(contextMenuBlockId) + 1,
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
    <>
      <Sidebar styleFunctions={styleFunctions} />
      <div className={style.editor_container} ref={editorContainerRef}>
        <div className={style.editor} ref={editorRef}>
          {contextMenuActive && (
            <ContextMenu
              x={contextMenuPosition[0]}
              y={contextMenuPosition[1]}
            />
          )}
          <SelectionMenu
            containerRef={editorContainerRef}
            editorRef={editorRef}
          />

          {props.editorhook.result()?.map((value: IBlock, index: number) => {
            return (
              <Block
                styleFunctions={styleFunctions}
                contextMenuController={contextMenuController}
                editorFunctions={props.editorhook}
                editorId={props.editorId}
                data={value}
                key={index}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Editor;
